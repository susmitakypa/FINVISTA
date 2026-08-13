"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  DashboardStatus,
  NormalizedFinancialData,
} from "@/lib/financial-data-types";
import {
  filesToProcessInput,
  processFinancialFiles,
} from "@/lib/extraction/process-financial-files";
import {
  clearPersistedPipeline,
  createEmptyFiles,
  loadPersistedFinancialData,
  loadPersistedUploads,
  revokePreviewUrls,
  savePersistedFinancialData,
  savePersistedUploads,
  type FilesByCategory,
} from "@/lib/persistence/financial-store";
import type { UploadCategory } from "@/lib/upload-types";
import {
  createFileId,
  isImageFile,
  simulateFileIngestion,
  validateFileForCategory,
} from "@/lib/upload-utils";

type ProcessState =
  | { status: "idle" }
  | { status: "processing" }
  | { status: "processed"; message: string }
  | { status: "error"; message: string };

type FinancialSessionContextValue = {
  filesByCategory: FilesByCategory;
  totalFileCount: number;
  hasSuccessfulFiles: boolean;
  processState: ProcessState;
  dashboardStatus: DashboardStatus;
  financialData: NormalizedFinancialData | null;
  isSessionReady: boolean;
  addFiles: (category: UploadCategory, files: FileList | File[]) => Promise<void>;
  removeFile: (category: UploadCategory, id: string) => void;
  clearAll: () => void;
  processFiles: () => Promise<void>;
};

const FinancialSessionContext =
  createContext<FinancialSessionContextValue | null>(null);

function hasSuccessful(files: FilesByCategory): boolean {
  return Object.values(files).some((entries) =>
    entries.some((file) => file.status === "success"),
  );
}

export function FinancialSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [filesByCategory, setFilesByCategory] =
    useState<FilesByCategory>(createEmptyFiles);
  const [financialData, setFinancialData] =
    useState<NormalizedFinancialData | null>(null);
  const [processState, setProcessState] = useState<ProcessState>({
    status: "idle",
  });
  const [isSessionReady, setIsSessionReady] = useState(false);

  const filesRef = useRef(filesByCategory);
  const hydratedRef = useRef(false);

  useEffect(() => {
    filesRef.current = filesByCategory;
  }, [filesByCategory]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [uploads, data] = await Promise.all([
          loadPersistedUploads(),
          loadPersistedFinancialData(),
        ]);
        if (cancelled) {
          revokePreviewUrls(uploads);
          return;
        }

        setFilesByCategory(uploads);
        filesRef.current = uploads;

        if (data) {
          setFinancialData(data);
          setProcessState({
            status: "processed",
            message: "Financial data processed",
          });
        }
      } catch {
        if (!cancelled) {
          setProcessState({
            status: "idle",
          });
        }
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
          setIsSessionReady(true);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    void savePersistedUploads(filesByCategory).catch(() => undefined);
  }, [filesByCategory]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    void savePersistedFinancialData(financialData).catch(() => undefined);
  }, [financialData]);

  useEffect(() => {
    return () => {
      revokePreviewUrls(filesRef.current);
    };
  }, []);

  const totalFileCount = useMemo(
    () =>
      Object.values(filesByCategory).reduce(
        (sum, files) => sum + files.length,
        0,
      ),
    [filesByCategory],
  );

  const hasSuccessfulFiles = useMemo(
    () => hasSuccessful(filesByCategory),
    [filesByCategory],
  );

  const dashboardStatus: DashboardStatus = useMemo(() => {
    if (processState.status === "processing") return "processing";
    if (financialData) return "processed";
    if (hasSuccessfulFiles) return "ready-to-process";
    return "awaiting-upload";
  }, [processState.status, financialData, hasSuccessfulFiles]);

  const addFiles = useCallback(
    async (category: UploadCategory, incoming: FileList | File[]) => {
      const fileList = Array.from(incoming);
      if (fileList.length === 0) return;

      const pendingEntries = fileList.map((file) => {
        const validationError = validateFileForCategory(file, category);
        return {
          id: createFileId(file),
          file,
          status: validationError ? ("error" as const) : ("loading" as const),
          error: validationError ?? undefined,
          previewUrl:
            !validationError && isImageFile(file)
              ? URL.createObjectURL(file)
              : undefined,
        };
      });

      setFilesByCategory((prev) => ({
        ...prev,
        [category]: [...(prev[category] ?? []), ...pendingEntries],
      }));
      setProcessState({ status: "idle" });

      const validEntries = pendingEntries.filter(
        (entry) => entry.status === "loading",
      );
      if (validEntries.length === 0) return;

      await simulateFileIngestion();

      setFilesByCategory((prev) => ({
        ...prev,
        [category]: (prev[category] ?? []).map((entry) =>
          validEntries.some((valid) => valid.id === entry.id)
            ? { ...entry, status: "success" as const }
            : entry,
        ),
      }));
    },
    [],
  );

  const removeFile = useCallback((category: UploadCategory, id: string) => {
    setFilesByCategory((prev) => {
      const list = prev[category] ?? [];
      const removed = list.find((entry) => entry.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return {
        ...prev,
        [category]: list.filter((entry) => entry.id !== id),
      };
    });
    setProcessState({ status: "idle" });
  }, []);

  const clearAll = useCallback(() => {
    setFilesByCategory((prev) => {
      revokePreviewUrls(prev);
      return createEmptyFiles();
    });
    setFinancialData(null);
    setProcessState({ status: "idle" });
    void clearPersistedPipeline().catch(() => undefined);
  }, []);

  const processFiles = useCallback(async () => {
    let files = filesRef.current;

    if (!hasSuccessful(files)) {
      try {
        const restored = await loadPersistedUploads();
        if (hasSuccessful(restored)) {
          files = restored;
          filesRef.current = restored;
          setFilesByCategory(restored);
        }
      } catch {
        // fall through to the validation error below
      }
    }

    if (!hasSuccessful(files)) {
      setProcessState({
        status: "error",
        message:
          "Please upload at least one valid financial file before processing.",
      });
      return;
    }

    const stillLoading = Object.values(files).some((entries) =>
      entries.some((file) => file.status === "loading"),
    );

    if (stillLoading) {
      setProcessState({
        status: "error",
        message: "Please wait until all files finish uploading.",
      });
      return;
    }

    setProcessState({ status: "processing" });

    try {
      const inputs = filesToProcessInput(files);
      const result = await processFinancialFiles(inputs);
      setFinancialData(result);
      await savePersistedFinancialData(result);
      const failed = result.sourceFiles.filter((file) => file.status === "failed");
      const message =
        failed.length === result.sourceFiles.length
          ? "No financial fields could be read. Other documents can still be added."
          : failed.length > 0
            ? `Financial data processed. ${failed.map((file) => file.name).join(", ")} could not be processed.`
            : "Financial data processed";
      setProcessState({
        status: "processed",
        message,
      });
    } catch {
      setProcessState({
        status: "error",
        message: "Processing failed. Please try again with clearer files.",
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      filesByCategory,
      totalFileCount,
      hasSuccessfulFiles,
      processState,
      dashboardStatus,
      financialData,
      isSessionReady,
      addFiles,
      removeFile,
      clearAll,
      processFiles,
    }),
    [
      filesByCategory,
      totalFileCount,
      hasSuccessfulFiles,
      processState,
      dashboardStatus,
      financialData,
      isSessionReady,
      addFiles,
      removeFile,
      clearAll,
      processFiles,
    ],
  );

  return (
    <FinancialSessionContext.Provider value={value}>
      {children}
    </FinancialSessionContext.Provider>
  );
}

export function useFinancialSession() {
  const context = useContext(FinancialSessionContext);
  if (!context) {
    throw new Error(
      "useFinancialSession must be used within FinancialSessionProvider",
    );
  }
  return context;
}
