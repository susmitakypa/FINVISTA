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
          Upload Financial Documents
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {totalFileCount === 0
            ? "Upload financial documents to begin analysis. Any one source is enough — missing documents never block the rest."
            : "Files are stored locally in your browser. Process whatever you have uploaded; unused categories stay optional."}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {UPLOAD_CATEGORIES.map((config) => (
          <UploadCard
            key={config.id}
            config={config}
            files={filesByCategory[config.id] ?? []}
            processState={processState}
            processedRecords={financialData?.sourceFiles}
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
