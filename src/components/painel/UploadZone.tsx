"use client";

import { Upload } from "lucide-react";
import { useRef } from "react";

export function UploadZone({
  accept,
  label,
  multiple = false,
  onFiles
}: {
  accept: string;
  label: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <button
      className="panel-card"
      onClick={() => inputRef.current?.click()}
      style={{
        alignItems: "center",
        display: "flex",
        gap: 12,
        justifyContent: "center",
        minHeight: 96,
        width: "100%"
      }}
      type="button"
    >
      <Upload size={19} aria-hidden="true" />
      <span>{label}</span>
      <input
        accept={accept}
        hidden
        multiple={multiple}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          onFiles(files);
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />
    </button>
  );
}
