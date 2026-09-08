import { contextBridge, ipcRenderer } from 'electron'

// 渲染进程可调用的后端能力
const api = {
  fetchMails: () => ipcRenderer.invoke('mail:fetch'),
  fetchHistory: () => ipcRenderer.invoke('mail:history'),
  sync: () => ipcRenderer.invoke('mail:sync'),
  fetchAccounts: () => ipcRenderer.invoke('mail:accounts'),
  onNewMail: (cb: (items: unknown[]) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, items: unknown[]): void => cb(items)
    ipcRenderer.on('mail:new', listener)
    return () => ipcRenderer.removeListener('mail:new', listener)
  },
  // 配置管理
  getConfig: () => ipcRenderer.invoke('config:get'),
  addAccount: (account: unknown) => ipcRenderer.invoke('config:addAccount', account),
  removeAccount: (id: string) => ipcRenderer.invoke('config:removeAccount', id),
  updateAi: (ai: unknown) => ipcRenderer.invoke('config:updateAi', ai),
  updatePoll: (poll: unknown) => ipcRenderer.invoke('config:updatePoll', poll),
  updateTelegram: (telegram: unknown) => ipcRenderer.invoke('config:updateTelegram', telegram)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
