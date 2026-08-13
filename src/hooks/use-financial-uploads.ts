"use client";

import { useFinancialSession } from "@/context/financial-session-context";

/** @deprecated Use useFinancialSession instead */
export function useFinancialUploads() {
  const session = useFinancialSession();
  return {
    filesByCategory: session.filesByCategory,
    totalFileCount: session.totalFileCount,
    hasSuccessfulFiles: session.hasSuccessfulFiles,
    processState: session.processState,
    addFiles: session.addFiles,
    removeFile: session.removeFile,
    clearAll: session.clearAll,
    processFiles: session.processFiles,
  };
}
