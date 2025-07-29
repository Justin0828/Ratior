// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// 安全地暴露API到渲染进程
contextBridge.exposeInMainWorld('ratior', {
  // 数据管理
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  
  // 应用信息
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  
  // 任务管理
  task: {
    create: (taskData) => ipcRenderer.invoke('task:create', taskData),
    update: (taskId, updates) => ipcRenderer.invoke('task:update', taskId, updates),
    delete: (taskId) => ipcRenderer.invoke('task:delete', taskId)
  },
  
  // 随心记管理
  note: {
    create: (content) => ipcRenderer.invoke('note:create', content),
    update: (noteId, updates) => ipcRenderer.invoke('note:update', noteId, updates),
    delete: (noteId) => ipcRenderer.invoke('note:delete', noteId)
  },
  
  // 设置管理
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (updates) => ipcRenderer.invoke('settings:update', updates)
  },
  
  // 文件操作
  file: {
    exportData: () => ipcRenderer.invoke('file:exportData'),
    importData: (jsonString) => ipcRenderer.invoke('file:importData', jsonString)
  },
  
  // 平台信息
  platform: process.platform,
  
  // 版本信息
  version: process.versions
});

// 监听渲染进程的消息（如果需要）
window.addEventListener('DOMContentLoaded', () => {
  console.log('Ratior preload script loaded');
  
  // 可以在这里添加一些初始化代码
  // 比如设置全局样式、添加平台特定的类名等
  
  const platform = process.platform;
  document.body.classList.add(`platform-${platform}`);
  
  // 如果是macOS，添加特殊样式
  if (platform === 'darwin') {
    document.body.classList.add('is-macos');
  }
  
  // 如果是Windows，添加特殊样式
  if (platform === 'win32') {
    document.body.classList.add('is-windows');
  }
  
  // 如果是Linux，添加特殊样式
  if (platform === 'linux') {
    document.body.classList.add('is-linux');
  }
});
