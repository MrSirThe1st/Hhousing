import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopAuthUiStatus } from './desktop-auth-types';

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  auth: {
    startLogin: () => ipcRenderer.invoke('desktop-auth:start', 'login'),
    startSignup: () => ipcRenderer.invoke('desktop-auth:start', 'signup'),
    cancel: () => ipcRenderer.invoke('desktop-auth:cancel'),
    subscribe: (callback: (status: DesktopAuthUiStatus) => void) => {
      const listener = (_event: unknown, status: DesktopAuthUiStatus): void => {
        callback(status);
      };
      ipcRenderer.on('desktop-auth:status', listener);
      return () => {
        ipcRenderer.removeListener('desktop-auth:status', listener);
      };
    },
  },
});
