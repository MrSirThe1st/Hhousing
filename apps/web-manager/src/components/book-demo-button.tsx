"use client";

import { useBookDemo } from "../contexts/book-demo-context";

type BookDemoButtonProps = {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
};

export default function BookDemoButton({
  className,
  children = "Réserver une démo",
  onClick
}: BookDemoButtonProps): React.ReactElement {
  const { open } = useBookDemo();

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onClick?.();
        open();
      }}
    >
      {children}
    </button>
  );
}
