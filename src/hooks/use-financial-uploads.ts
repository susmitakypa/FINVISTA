"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  UploadCategory,
  UploadedFileEntry,
} from "@/lib/upload-types";
import {
  createFileId,
  simulateFileIngestion,
  validateFileForCategory,
  isImageFile,
} from "@/lib/upload-utils";

type FilesByCategory = Record<UploadCategory, UploadedFileEntry[]>;

const EMPTY_STATE: FilesByCategory = {
  screener: [],
  "balance-sheet": [],
  "profit-loss": [],
};

type ProcessState =
  | { status: "idle" }
  | { status: "processing" }
  | { status: "ready"; message: string }
  | { status: "error"; message: string };

export function useFinancialUploads() {
  const [filesByCategory, setFilesByCategory] =
    useState<FilesByCategory>(EMPTY_STATE);
  const [processState, setProcessState] = useState<ProcessState>({
    status: "idle",
  });

  const previewUrls = useMemo(
    () =>
      Object.values(filesByCategory)
        .flat()
        .map((entry) => entry.previewUrl)
        .filter(Boolean) as string[],
    [filesByCategory],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const totalFileCount = useMemo(
    () =>
      Object.values(filesByCategory).reduce(
        (sum, files) => sum + files.length,
        0,
      ),
    [filesByCategory],
  );

  const hasSuccessfulFiles = useMemo(
    () =>
      Object.values(filesByCategory).some((files) =>
        files.some((file) => file.status === "success"),
      ),
    [filesByCategory],
  );

  const addFiles = useCallback(
    async (category: UploadCategory, incoming: FileList | File[]) => {
      const fileList = Array.from(incoming);
      if (fileList.length === 0) return;

      const pendingEntries: UploadedFileEntry[] = fileList.map((file) => {
        const validationError = validateFileForCategory(file, category);
        return {
          id: createFileId(file),
          file,
          status: validationError ? "error" : "loading",
          error: validationError ?? undefined,
          previewUrl:
            !validationError && isImageFile(file)
              ? URL.createObjectURL(file)
              : undefined,
        };
      });

      setFilesByCategory((prev) => ({
        ...prev,
        [category]: [...prev[category], ...pendingEntries],
      }));
      setProcessState({ status: "idle" });

      const validEntries = pendingEntries.filter(
        (entry) => entry.status === "loading",
      );
      if (validEntries.length === 0) return;

      await simulateFileIngestion();

      setFilesByCategory((prev) => ({
        ...prev,
        [category]: prev[category].map((entry) =>
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
      const removed = prev[category].find((entry) => entry.id === id);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      return {
        ...prev,
        [category]: prev[category].filter((entry) => entry.id !== id),
      };
    });
    setProcessState({ status: "idle" });
  }, []);

  const clearAll = useCallback(() => {
    setFilesByCategory((prev) => {
      Object.values(prev)
        .flat()
        .forEach((entry) => {
          if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
        });
      return EMPTY_STATE;
    });
    setProcessState({ status: "idle" });
  }, []);

  const processFiles = useCallback(async () => {
    if (!hasSuccessfulFiles) {
      setProcessState({
        status: "error",
        message: "Please upload at least one valid financial file before processing.",
      });
      return;
    }

    const stillLoading = Object.values(filesByCategory).some((files) =>
      files.some((file) => file.status === "loading"),
    );

    if (stillLoading) {
      setProcessState({
        status: "error",
        message: "Please wait until all files finish uploading.",
      });
      return;
    }

    setProcessState({ status: "processing" });
    await simulateFileIngestion(800);
    setProcessState({
      status: "ready",
      message: "Files ready for financial data processing.",
    });
  }, [filesByCategory, hasSuccessfulFiles]);

  return {
    filesByCategory,
    totalFileCount,
    hasSuccessfulFiles,
    processState,
    addFiles,
    removeFile,
    clearAll,
    processFiles,
  };
}
