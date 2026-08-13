"use client";

import { useFinancialSession } from "@/context/financial-session-context";
import { UPLOAD_CATEGORIES } from "@/lib/upload-types";
import { ProcessingSummaryCard } from "./processing-summary";
import { UploadActions } from "./upload/upload-actions";
import { UploadCard } from "./upload/upload-card";

export function UploadSection() {
  const {
    filesByCategory,
    totalFileCount,
    hasSuccessfulFiles,
    processState,
    financialData,
    addFiles,
    removeFile,
    clearAll,
    processFiles,
  } = useFinancialSession();

  return (
    <section
      aria-labelledby="upload-heading"
      className="rounded-xl border border-white/8 bg-[#0a0f1c]/60 p-6 backdrop-blur-sm"
    >
      <div className="mb-6">
        <h2
          id="upload-heading"
          className="text-sm font-semibold uppercase tracking-wider text-slate-300"
        >
          Upload Financial Data
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Add Screener screenshots, Balance Sheet, and Profit &amp; Loss files to
          prepare for analysis. Files are stored locally in your browser.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {UPLOAD_CATEGORIES.map((config) => (
          <UploadCard
            key={config.id}
            config={config}
            files={filesByCategory[config.id]}
            onAddFiles={addFiles}
            onRemoveFile={removeFile}
          />
        ))}
      </div>

      <UploadActions
        totalFileCount={totalFileCount}
        hasSuccessfulFiles={hasSuccessfulFiles}
        processState={processState}
        financialData={financialData}
        onClearAll={clearAll}
        onProcess={processFiles}
      />

      {financialData && processState.status === "processed" && (
        <div className="mt-6">
          <ProcessingSummaryCard data={financialData} />
        </div>
      )}
    </section>
  );
}
