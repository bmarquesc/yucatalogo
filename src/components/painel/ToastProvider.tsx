"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

type ToastType = "success" | "error";
type Toast = { id: string; message: string; type: ToastType };
type ToastContextValue = (message: string, type?: ToastType) => void;

const ToastContext = createContext<ToastContextValue>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        style={{
          bottom: 18,
          display: "grid",
          gap: 10,
          position: "fixed",
          right: 18,
          zIndex: 80
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background: toast.type === "success" ? "#0D0D0D" : "#8b1e1e",
              borderRadius: 4,
              color: "#fff",
              maxWidth: 340,
              padding: "12px 14px"
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
