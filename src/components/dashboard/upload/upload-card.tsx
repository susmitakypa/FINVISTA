"use client";

import { useCallback, useRef, useState } from "react";
import type {
  UploadCategory,
  UploadCategoryConfig,
  UploadedFileEntry,
} from "@/lib/upload-types";
import { formatFileSize } from "@/lib/upload-utils";
import { FilePreview } from "./file-preview";

type UploadCardProps = {
  config: UploadCategoryConfig;
  files: UploadedFileEntry[];
  onAddFiles: (category: UploadCategory, files: FileList | File[]) => void;
  onRemoveFile: (category: UploadCategory, id: string) => void;
};

function UploadCloudIcon() {
  return (
    <svg
      className="h-7 w-7 text-slate-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      className="h-4 w-4 text-emerald-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-sky-400"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function UploadedFileRow({
  entry,
  onRemove,
}: {
  entry: UploadedFileEntry;
  onRemove: () => void;
}) {
  const { file, previewUrl, status, error } = entry;

  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        status === "error"
          ? "border-rose-500/20 bg-rose-500/[0.04]"
          : status === "success"
            ? "border-emerald-500/15 bg-emerald-500/[0.03]"
            : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <FilePreview file={file} previewUrl={previewUrl} compact />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200">{file.name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
          {status === "loading" && (
            <span className="inline-flex items-center gap-1 text-xs text-sky-400">
              <SpinnerIcon />
              Uploading…
            </span>
          )}
          {status === "success" && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircleIcon />
              Ready
            </span>
          )}
          {status === "error" && error && (
            <span className="text-xs text-rose-400">{error}</span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-rose-400"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </li>
  );
}

export function UploadCard({
  config,
  files,
  onAddFiles,
  onRemoveFile,
}: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const successCount = files.filter((f) => f.status === "success").length;
  const loadingCount = files.filter((f) => f.status === "loading").length;
  const hasFiles = files.length > 0;
  const isCardSuccess = hasFiles && loadingCount === 0 && successCount > 0;

  const handleFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming || incoming.length === 0) return;
      onAddFiles(config.id, incoming);
    },
    [config.id, onAddFiles],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  return (
    <article
      className={`flex flex-col rounded-xl border bg-gradient-to-br from-[#0f1629]/80 to-[#0a0f1c]/80 p-5 backdrop-blur-sm transition-all duration-300 ${
        isDragOver
          ? "border-sky-500/40 shadow-[0_0_24px_rgba(56,189,248,0.12)]"
          : isCardSuccess
            ? "border-emerald-500/20"
            : "border-white/8"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{config.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {config.description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            hasFiles
              ? "bg-sky-500/10 text-sky-300 ring-1 ring-sky-400/20"
              : "bg-white/5 text-slate-500 ring-1 ring-white/10"
          }`}
        >
          {files.length} file{files.length === 1 ? "" : "s"}
        </span>
      </div>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Upload files for ${config.title}`}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-all duration-200 ${
          isDragOver
            ? "border-sky-400/50 bg-sky-500/[0.06]"
            : "border-white/10 bg-white/[0.02] hover:border-sky-500/30 hover:bg-sky-500/[0.03]"
        }`}
      >
        <div
          className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full ring-1 transition-all duration-200 ${
            isDragOver
              ? "bg-sky-500/15 ring-sky-400/30"
              : "bg-white/5 ring-white/10 group-hover:bg-sky-500/10 group-hover:ring-sky-400/20"
          }`}
        >
          <UploadCloudIcon />
        </div>
        <p className="text-sm font-medium text-slate-300">
          Drag &amp; drop files here
        </p>
        <p className="mt-1 text-center text-xs text-slate-500">
          or click to browse
        </p>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition-all duration-200 hover:border-sky-500/30 hover:bg-sky-500/10 hover:text-white"
        >
          Browse Files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple={config.allowMultiple}
          accept={config.accept}
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <p className="mt-3 text-[11px] text-slate-600">
        Accepted: {config.acceptLabel}
      </p>

      {hasFiles && (
        <ul className="mt-4 space-y-2" aria-label={`Uploaded files for ${config.title}`}>
          {files.map((entry) => (
            <UploadedFileRow
              key={entry.id}
              entry={entry}
              onRemove={() => onRemoveFile(config.id, entry.id)}
            />
          ))}
        </ul>
      )}

      {isCardSuccess && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-2">
          <CheckCircleIcon />
          <span className="text-xs font-medium text-emerald-300">
            {successCount} file{successCount === 1 ? "" : "s"} ready in this category
          </span>
        </div>
      )}
    </article>
  );
}
