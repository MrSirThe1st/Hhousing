"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import BookDemoModal from "../components/book-demo-modal";

type BookDemoContextValue = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const BookDemoContext = createContext<BookDemoContextValue | null>(null);

export function BookDemoProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <BookDemoContext.Provider value={value}>
      {children}
      <BookDemoModal />
    </BookDemoContext.Provider>
  );
}

export function useBookDemo(): BookDemoContextValue {
  const context = useContext(BookDemoContext);
  if (!context) {
    throw new Error("useBookDemo must be used within BookDemoProvider");
  }
  return context;
}
