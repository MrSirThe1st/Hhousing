"use client";

import { useEffect, useRef } from "react";

type ActionToastTone = "success" | "error";

interface ActionToastProps {
  message: string | null;
  tone?: ActionToastTone;
  durationMs?: number;
  onDismiss: () => void;
}

export default function ActionToast({
  message,
  tone = "success",
  durationMs = 4500,
  onDismiss
}: ActionToastProps): React.ReactElement | null {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      onDismissRef.current();
    }, durationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [durationMs, message]);

  if (!message) {
    return null;
  }

  const isSuccess = tone === "success";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-4 z-70 flex justify-center px-4 md:top-6"
    >
      <div
        className={`pointer-events-auto flex max-w-lg items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
          isSuccess
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
            isSuccess ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
          aria-hidden="true"
        >
          {isSuccess ? (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </span>
        <p className="text-sm font-medium leading-5">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className={`-mr-1 -mt-0.5 rounded-md p-1 transition ${
            isSuccess ? "text-emerald-700 hover:bg-emerald-100" : "text-red-600 hover:bg-red-100"
          }`}
          aria-label="Fermer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
