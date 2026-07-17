"use client";

import { useId, useState } from "react";

import { Input } from "@repo/ui";

export function FileUploader({
  accept = "image/*,video/*",
  disabled = false,
  label = "Choose files",
  maxFiles = 10,
  onFiles,
}: {
  accept?: string;
  disabled?: boolean;
  label?: string;
  maxFiles?: number;
  onFiles: (files: File[]) => void;
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const select = (files: FileList | null) => {
    if (!files) return;
    onFiles(Array.from(files).slice(0, maxFiles));
  };

  return (
    <label
      className={`grid min-h-32 cursor-pointer place-items-center rounded-lg border border-dashed p-5 text-center transition ${
        dragging
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
          : "border-slate-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      htmlFor={id}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) select(event.dataTransfer.files);
      }}
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400">
          Drop files here or browse - up to {maxFiles}
        </span>
      </span>
      <Input
        accept={accept}
        className="sr-only"
        disabled={disabled}
        id={id}
        multiple={maxFiles > 1}
        type="file"
        onChange={(event) => {
          select(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );
}
