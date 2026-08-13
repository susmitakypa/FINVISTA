import type { NormalizedFinancialData } from "@/lib/financial-data-types";
import { hydrateNormalizedData } from "@/lib/financial-data-types";
import { consolidateExtractedPeriods } from "@/lib/financial-period-merge";
import type {
  UploadCategory,
  UploadedFileEntry,
  UploadFileStatus,
} from "@/lib/upload-types";
import { migrateUploadCategory } from "@/lib/upload-types";
import { isImageFile } from "@/lib/upload-utils";

const DB_NAME = "finvista-pipeline";
const DB_VERSION = 1;
const UPLOADS_STORE = "uploads";
const META_STORE = "meta";
const FINANCIAL_DATA_KEY = "financialData";
export const LEGACY_SESSION_KEY = "finvista-financial-data";

export type FilesByCategory = Record<UploadCategory, UploadedFileEntry[]>;

export function createEmptyFiles(): FilesByCategory {
  return {
    screener: [],
    "annual-report": [],
    "investor-presentation": [],
    "quarterly-results": [],
  };
}

type PersistedUploadRecord = {
  id: string;
  category: UploadCategory;
  name: string;
  mimeType: string;
  lastModified: number;
  status: UploadFileStatus;
  error?: string;
  blob: Blob;
};

let dbPromise: Promise<IDBDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  const next = writeQueue.then(task, task);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function idbTransactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDb(): Promise<IDBDatabase> {
  if (!isBrowser()) {
    return Promise.reject(new Error("IndexedDB is not available."));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(UPLOADS_STORE)) {
          db.createObjectStore(UPLOADS_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error("Failed to open Finvista storage."));
      };
    });
  }

  return dbPromise;
}

function recordToEntry(record: PersistedUploadRecord): UploadedFileEntry {
  const file = new File([record.blob], record.name, {
    type: record.mimeType,
    lastModified: record.lastModified,
  });

  return {
    id: record.id,
    file,
    status: record.status,
    error: record.error,
    previewUrl: isImageFile(file) ? URL.createObjectURL(file) : undefined,
  };
}

export async function loadPersistedUploads(): Promise<FilesByCategory> {
  const files = createEmptyFiles();
  if (!isBrowser()) return files;

  const db = await openDb();
  const tx = db.transaction(UPLOADS_STORE, "readonly");
  const records = await idbRequest(
    tx.objectStore(UPLOADS_STORE).getAll() as IDBRequest<PersistedUploadRecord[]>,
  );

  for (const record of records) {
    const category = migrateUploadCategory(record.category);
    if (!category) continue;
    files[category].push(recordToEntry({ ...record, category }));
  }

  return files;
}

export async function savePersistedUploads(
  filesByCategory: FilesByCategory,
): Promise<void> {
  if (!isBrowser()) return;

  await enqueueWrite(async () => {
    const db = await openDb();
    const tx = db.transaction(UPLOADS_STORE, "readwrite");
    const store = tx.objectStore(UPLOADS_STORE);
    store.clear();

    for (const [category, entries] of Object.entries(filesByCategory) as [
      UploadCategory,
      UploadedFileEntry[],
    ][]) {
      for (const entry of entries) {
        const record: PersistedUploadRecord = {
          id: entry.id,
          category,
          name: entry.file.name,
          mimeType: entry.file.type,
          lastModified: entry.file.lastModified,
          status: entry.status,
          error: entry.error,
          blob: entry.file,
        };
        store.put(record);
      }
    }

    await idbTransactionDone(tx);
  });
}

function withConsolidatedPeriods(
  data: NormalizedFinancialData,
): NormalizedFinancialData {
  return {
    ...data,
    periods: consolidateExtractedPeriods(data.periods),
  };
}

export async function loadPersistedFinancialData(): Promise<NormalizedFinancialData | null> {
  if (!isBrowser()) return null;

  const db = await openDb();
  const tx = db.transaction(META_STORE, "readonly");
  const stored = await idbRequest(
    tx.objectStore(META_STORE).get(FINANCIAL_DATA_KEY) as IDBRequest<
      NormalizedFinancialData | undefined
    >,
  );

  if (stored) return withConsolidatedPeriods(hydrateNormalizedData(stored));

  try {
    const legacy = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!legacy) return null;
    const parsed = JSON.parse(legacy) as NormalizedFinancialData;
    const hydrated = withConsolidatedPeriods(hydrateNormalizedData(parsed));
    await savePersistedFinancialData(hydrated);
    return hydrated;
  } catch {
    return null;
  }
}

export async function savePersistedFinancialData(
  data: NormalizedFinancialData | null,
): Promise<void> {
  if (!isBrowser()) return;

  await enqueueWrite(async () => {
    const db = await openDb();
    const tx = db.transaction(META_STORE, "readwrite");
    const store = tx.objectStore(META_STORE);

    if (data) {
      store.put(data, FINANCIAL_DATA_KEY);
    } else {
      store.delete(FINANCIAL_DATA_KEY);
    }

    await idbTransactionDone(tx);

    try {
      if (data) {
        sessionStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify(data));
      } else {
        sessionStorage.removeItem(LEGACY_SESSION_KEY);
      }
    } catch {
      // sessionStorage may be unavailable or over quota
    }
  });
}

export async function clearPersistedPipeline(): Promise<void> {
  if (!isBrowser()) return;

  await enqueueWrite(async () => {
    const db = await openDb();
    const tx = db.transaction([UPLOADS_STORE, META_STORE], "readwrite");
    tx.objectStore(UPLOADS_STORE).clear();
    tx.objectStore(META_STORE).clear();
    await idbTransactionDone(tx);

    try {
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
      localStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {
      // ignore storage access errors
    }
  });
}

export function revokePreviewUrls(filesByCategory: FilesByCategory): void {
  for (const entries of Object.values(filesByCategory)) {
    for (const entry of entries) {
      if (entry.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    }
  }
}
