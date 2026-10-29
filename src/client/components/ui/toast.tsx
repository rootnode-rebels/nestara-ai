import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "destructive" | "info";

export interface ToastItem {
  id: string;
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (opts: { title?: string; description: string; variant?: ToastVariant; duration?: number }) => void;
  success: (description: string, title?: string) => void;
  error: (description: string, title?: string) => void;
  info: (description: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      toast: ({ description }) => console.log(description),
      success: (desc) => console.log(desc),
      error: (desc) => console.error(desc),
      info: (desc) => console.info(desc),
    };
  }
  return ctx;
}

const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
  default: <CheckCircle2 className="h-4 w-4 text-foreground" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  destructive: <AlertCircle className="h-4 w-4 text-rose-600" />,
  info: <Info className="h-4 w-4 text-sky-600" />,
};

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: "border-border bg-card text-foreground",
  success: "border-emerald-500/30 bg-card text-foreground",
  destructive: "border-rose-500/30 bg-card text-foreground",
  info: "border-sky-500/30 bg-card text-foreground",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      title,
      description,
      variant = "default",
      duration = 4000,
    }: {
      title?: string;
      description: string;
      variant?: ToastVariant;
      duration?: number;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastItem = { id, title, description, variant, duration };
      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep at most 5

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((desc: string, title?: string) => toast({ description: desc, title, variant: "success" }), [toast]);
  const error = useCallback((desc: string, title?: string) => toast({ description: desc, title, variant: "destructive" }), [toast]);
  const info = useCallback((desc: string, title?: string) => toast({ description: desc, title, variant: "info" }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Nordic Toast Viewport */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-sm transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 bg-card/95 backdrop-blur-md",
              VARIANT_STYLES[t.variant || "default"]
            )}
          >
            <div className="shrink-0 mt-0.5">{VARIANT_ICONS[t.variant || "default"]}</div>
            <div className="flex-1 min-w-0">
              {t.title && <div className="text-xs font-semibold text-foreground tracking-tight">{t.title}</div>}
              <div className="text-xs text-muted-foreground leading-relaxed">{t.description}</div>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

