const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// 数据存储路径
const userData = app.getPath('userData');
const dataPath = path.join(userData, 'ratior_data.json');

// 数据管理
class DataManager {
  constructor() {
    this.data = this.loadData();
  }
  
  loadData() {
    try {
      if (fs.existsSync(dataPath)) {
        const rawData = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(rawData);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
    
    // 返回默认数据结构
    return {
      tasks: {},
      quickNotes: [],
      dayPlans: {},
      templates: [],
      settings: {
        theme: 'light',
        colorScheme: 'pastel',
        firstRunCompleted: false,
        autoMoveCompletedTasks: true
      }
    };
  }
  
  saveData(data) {
    try {
      // 确保目录存在
      const dir = path.dirname(dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 保存数据
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
      this.data = data;
      return true;
    } catch (error) {
      console.error('保存数据失败:', error);
      return false;
    }
  }
  
  getData() {
    return this.data;
  }
}

// 创建数据管理器实例
const dataManager = new DataManager();

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS样式
    autoHideMenuBar: true, // 隐藏菜单栏
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      sandbox: false,
      devTools: false // 完全禁用开发者工具
    },
  });

  // 加载应用
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 完全禁用开发者工具 - 所有环境
  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow.webContents.closeDevTools();
  });

  // 禁用右键菜单（可选）
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // 窗口事件
  mainWindow.on('closed', () => {
    // 在窗口关闭前保存数据
    console.log('应用关闭，保存数据');
  });

  return mainWindow;
};

// IPC 处理器
function setupIPC() {
  // 加载数据
  ipcMain.handle('data:load', () => {
    return dataManager.getData();
  });

  // 保存数据
  ipcMain.handle('data:save', (event, data) => {
    return dataManager.saveData(data);
  });

  // 获取应用信息
  ipcMain.handle('app:getInfo', () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      userDataPath: userData
    };
  });

  // 任务相关IPC
  ipcMain.handle('task:create', (event, taskData) => {
    try {
      // 这里可以添加额外的验证逻辑
      return { success: true, data: taskData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('task:update', (event, taskId, updates) => {
    try {
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('task:delete', (event, taskId) => {
    try {
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 随心记相关IPC
  ipcMain.handle('note:create', (event, content) => {
    try {
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('note:update', (event, noteId, updates) => {
    try {
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('note:delete', (event, noteId) => {
    try {
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 设置相关IPC
  ipcMain.handle('settings:get', () => {
    try {
      return { success: true, data: dataManager.getData().settings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:update', (event, updates) => {
    try {
      const data = dataManager.getData();
      data.settings = { ...data.settings, ...updates };
      dataManager.saveData(data);
      return { success: true, data: data.settings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 文件操作
  ipcMain.handle('file:exportData', async () => {
    try {
      const data = dataManager.getData();
      return { success: true, data: JSON.stringify(data, null, 2) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:importData', async (event, jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      const success = dataManager.saveData(data);
      return { success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  setupIPC();
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前保存数据
app.on('before-quit', () => {
  console.log('应用即将退出，确保数据已保存');
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
