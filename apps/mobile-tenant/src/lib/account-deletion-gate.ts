type Listener = () => void;

const listeners = new Set<Listener>();

export function notifyAccountDeletionChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeAccountDeletionChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
