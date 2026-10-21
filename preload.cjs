const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bathroomDesktop', {
  lock: mode => ipcRenderer.invoke('cursor-lock', mode),
  unlock: () => ipcRenderer.invoke('cursor-unlock'),
  fullscreen: () => ipcRenderer.invoke('fullscreen'),
  quit: () => ipcRenderer.invoke('quit'),
  onMotion: callback => ipcRenderer.on('raw-motion', (_, delta) => callback(delta)),
  onRelease: callback => ipcRenderer.on('cursor-released', () => callback()),
  onStatus: callback => ipcRenderer.on('native-status', (_, ready) => callback(ready)),
  onShortcut: callback => ipcRenderer.on('protected-shortcut', () => callback()),
  status: () => ipcRenderer.invoke('native-status'),
});
