import { contextBridge, ipcRenderer } from 'electron';

const api = {
  info: () => ipcRenderer.invoke('app:info'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch: Record<string, unknown>) => ipcRenderer.invoke('settings:save', patch),
  models: (settings?: unknown) => ipcRenderer.invoke('ai:models', settings),
  chat: (payload: unknown) => ipcRenderer.invoke('ai:chat', payload),
  stop: (requestId: string) => ipcRenderer.invoke('ai:stop', requestId),
  onChunk: (handler: (payload: { requestId: string; delta: string }) => void) => {
    const listener = (_event: unknown, payload: { requestId: string; delta: string }) => handler(payload);
    ipcRenderer.on('ai:chunk', listener);
    return () => ipcRenderer.removeListener('ai:chunk', listener);
  },
  chatHistory: () => ipcRenderer.invoke('chat:load'),
  saveChat: (list: unknown) => ipcRenderer.invoke('chat:save', list),
  clearChat: () => ipcRenderer.invoke('chat:clear'),
  lawsOverview: () => ipcRenderer.invoke('laws:overview'),
  lawsSearch: (payload: { query: string; country?: string }) => ipcRenderer.invoke('laws:search', payload),
  lawsCountry: (country: string) => ipcRenderer.invoke('laws:country', country),
  lawsImport: () => ipcRenderer.invoke('laws:import'),
  lawsPacks: () => ipcRenderer.invoke('laws:packs'),
  lawsPackRemove: (name: string) => ipcRenderer.invoke('laws:pack-remove', name),
  cases: () => ipcRenderer.invoke('cases:list'),
  saveCase: (item: unknown) => ipcRenderer.invoke('cases:save', item),
  deleteCase: (id: string) => ipcRenderer.invoke('cases:delete', id),
  caseNote: (id: string, text: string) => ipcRenderer.invoke('cases:note', { id, text }),
  attach: (id: string) => ipcRenderer.invoke('cases:attach', id),
  removeCaseFile: (id: string, target: string) => ipcRenderer.invoke('cases:removeFile', { id, path: target }),
  openFile: (target: string) => ipcRenderer.invoke('cases:openFile', target),
  revealCase: (id: string) => ipcRenderer.invoke('cases:reveal', id),
  openDataFolder: () => ipcRenderer.invoke('cases:openFolder'),
  templates: () => ipcRenderer.invoke('docs:templates'),
  exportDoc: (payload: unknown) => ipcRenderer.invoke('docs:export', payload),
  localVersions: () => ipcRenderer.invoke('versions:local'),
  remoteVersions: () => ipcRenderer.invoke('versions:remote'),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  updateStatus: () => ipcRenderer.invoke('update:status'),
  onUpdate: (handler: (status: unknown) => void) => {
    const listener = (_event: unknown, status: unknown) => handler(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  open: (url: string) => ipcRenderer.invoke('shell:open', url),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close')
};

contextBridge.exposeInMainWorld('nexus', api);

export type NexusApi = typeof api;
