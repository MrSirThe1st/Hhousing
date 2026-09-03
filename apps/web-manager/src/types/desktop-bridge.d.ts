export {};

declare global {
  interface Window {
    desktop?: {
      platform: string;
      auth?: {
        startLogin: () => Promise<{ ok: boolean }>;
        startSignup: () => Promise<{ ok: boolean }>;
        cancel: () => Promise<{ ok: boolean }>;
        subscribe: (callback: (status: {
          status: "idle" | "waiting" | "exchanging" | "error";
          message?: string;
        }) => void) => () => void;
      };
    };
  }
}
