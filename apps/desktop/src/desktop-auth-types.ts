export type DesktopAuthIntent = 'login' | 'signup';

export type DesktopAuthUiStatus =
  | { status: 'idle' }
  | { status: 'waiting' }
  | { status: 'exchanging' }
  | { status: 'error'; message: string };
