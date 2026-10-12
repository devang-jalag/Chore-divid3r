"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const value: ToastContextValue = {
    toast: addToast,
    success: (msg: string) => addToast(msg, "success"),
    error: (msg: string) => addToast(msg, "error"),
    info: (msg: string) => addToast(msg, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur transition-all animate-in fade-in slide-in-from-bottom-2 ${
              t.type === "success"
                ? "border-green-600/30 bg-green-50/90 text-green-950 dark:bg-green-950/80 dark:text-green-100 dark:border-green-800"
                : t.type === "error"
                ? "border-red-600/30 bg-red-50/90 text-red-950 dark:bg-red-950/80 dark:text-red-100 dark:border-red-800"
                : "border-line bg-surface/90 text-ink dark:bg-surface/95"
            }`}
          >
            {t.type === "success" && (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pine" />
            )}
            {t.type === "error" && (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            )}
            {t.type === "info" && (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-info" />
            )}
            <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-muted hover:text-ink transition"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
