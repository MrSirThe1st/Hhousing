import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

type InboxContextValue = {
  unreadCount: number;
  setConversations: (items: Array<{ lastMessageSenderSide: string }>) => void;
  markAllRead: () => void;
};

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: PropsWithChildren): React.ReactElement {
  const [unreadCount, setUnreadCount] = useState(0);

  const setConversations = useCallback(
    (items: Array<{ lastMessageSenderSide: string }>): void => {
      const count = items.filter((c) => c.lastMessageSenderSide === "manager").length;
      setUnreadCount(count);
    },
    []
  );

  const markAllRead = useCallback((): void => {
    setUnreadCount(0);
  }, []);

  const value = useMemo<InboxContextValue>(
    () => ({ unreadCount, setConversations, markAllRead }),
    [unreadCount, setConversations, markAllRead]
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox(): InboxContextValue {
  const ctx = useContext(InboxContext);
  if (!ctx) throw new Error("useInbox must be used inside InboxProvider");
  return ctx;
}
