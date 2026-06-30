"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="modal-panel"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="page-header" style={{ alignItems: "center", marginBottom: 18 }}>
          <h2 className="font-display" style={{ fontSize: 34, lineHeight: 1, margin: 0 }}>
            {title}
          </h2>
          <button className="icon-button" onClick={onClose} title="Fechar" type="button">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
