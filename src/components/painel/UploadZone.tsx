"use client";

import { Upload } from "lucide-react";
import { useRef } from "react";

export function UploadZone({
  accept,
  hint,
  label,
  multiple = false,
  onFiles
}: {
  accept: string;
  hint?: string;
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
      <span
        style={{
          display: "grid",
          gap: 4,
          textAlign: "left"
        }}
      >
        <span>{label}</span>
        {hint ? (
          <small style={{ color: "var(--mid)", fontSize: 12, fontWeight: 600 }}>
            {hint}
          </small>
        ) : null}
      </span>
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
