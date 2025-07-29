// =============================================================================
// 数据管理模块 (Store)
// =============================================================================

// 引入 dayjs 进行日期处理
// 在浏览器环境中，dayjs 会从 CDN 或本地文件加载
// 在 Electron 环境中，会通过 require 加载

// 工具函数：生成 UUID
function generateId() {
  return 'id_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
}

// 工具函数：格式化日期为 YYYY-MM-DD
function formatDate(date) {
  if (typeof dayjs !== 'undefined') {
    return dayjs(date).format('YYYY-MM-DD');
  }
  // 降级方案
  const d = new Date(date);
  return d.getFullYear() + '-' + 
         String(d.getMonth() + 1).padStart(2, '0') + '-' + 
         String(d.getDate()).padStart(2, '0');
}

// 工具函数：获取今天的日期字符串
function getTodayString() {
  return formatDate(new Date());
}

// =============================================================================
// 数据存储结构
// =============================================================================

class RatiorStore {
  constructor() {
    this.data = {
      tasks: {},           // 按日期存储的任务：{ "2024-01-01": [task1, task2, ...] }
      quickNotes: [],      // 随心记列表
      dayPlans: {},        // 日期计划（任务排序）：{ "2024-01-01": { taskOrder: [...] } }
      templates: [],       // 任务模板列表
      settings: {          // 设置
        theme: 'light',
        colorScheme: 'pastel',
        firstRunCompleted: false,
        autoMoveCompletedTasks: true
      }
    };
    
    this.currentDate = getTodayString();
    this.listeners = [];
    
    // 异步加载数据
    this.loadData();
    
    // 定期保存数据
    setInterval(() => this.saveData(), 5000);
  }

  // =============================================================================
  // 数据持久化
  // =============================================================================
  
  async loadData() {
    try {
      if (typeof window !== 'undefined' && window.ratior && window.ratior.loadData) {
        // Electron 环境 - 异步加载
        const data = await window.ratior.loadData();
        if (data) {
          this.data = { ...this.data, ...data };
        }
      } else {
        // 浏览器环境
        const savedData = localStorage.getItem('ratior_data');
        if (savedData) {
          this.data = { ...this.data, ...JSON.parse(savedData) };
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
  }
  
  async saveData() {
    try {
      if (typeof window !== 'undefined' && window.ratior && window.ratior.saveData) {
        // Electron 环境 - 异步保存
        await window.ratior.saveData(this.data);
      } else {
        // 浏览器环境
        localStorage.setItem('ratior_data', JSON.stringify(this.data));
      }
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  }

  // =============================================================================
  // 观察者模式
  // =============================================================================
  
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  notify(type, data) {
    this.listeners.forEach(listener => {
      try {
        listener(type, data);
      } catch (error) {
        console.error('监听器执行失败:', error);
      }
    });
  }

  // =============================================================================
  // 任务管理
  // =============================================================================
  
  // 创建任务
  createTask(taskData) {
    const task = {
      id: generateId(),
      title: taskData.title || '',
      desc: taskData.desc || '',
      date: taskData.date || this.currentDate,
      priority: taskData.priority || 'none',
      status: 'todo',
      tags: taskData.tags || [],
      fromQuickNoteId: taskData.fromQuickNoteId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 确保日期键存在
    if (!this.data.tasks[task.date]) {
      this.data.tasks[task.date] = [];
    }
    
    // 将任务添加到指定日期
    this.data.tasks[task.date].push(task);
    
    // 更新任务排序
    if (!this.data.dayPlans[task.date]) {
      this.data.dayPlans[task.date] = { taskOrder: [], updatedAt: new Date().toISOString() };
    }
    this.data.dayPlans[task.date].taskOrder.push(task.id);
    this.data.dayPlans[task.date].updatedAt = new Date().toISOString();
    
    this.saveData();
    this.notify('task_created', { task, date: task.date });
    
    return task;
  }
  
  // 获取指定日期的任务
  getTasksByDate(date) {
    const tasks = this.data.tasks[date] || [];
    const dayPlan = this.data.dayPlans[date];
    
    if (!dayPlan || !dayPlan.taskOrder.length) {
      return tasks;
    }
    
    // 按照 dayPlan 中的顺序排列任务
    const orderedTasks = [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    // 先添加有序的任务
    dayPlan.taskOrder.forEach(taskId => {
      const task = taskMap.get(taskId);
      if (task) {
        orderedTasks.push(task);
        taskMap.delete(taskId);
      }
    });
    
    // 添加未在排序中的任务
    taskMap.forEach(task => {
      orderedTasks.push(task);
    });
    
    return orderedTasks;
  }
  
  // 更新任务
  updateTask(taskId, updates) {
    for (let date in this.data.tasks) {
      const taskIndex = this.data.tasks[date].findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        const oldTask = this.data.tasks[date][taskIndex];
        const updatedTask = {
          ...oldTask,
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        // 如果日期改变了，需要移动任务
        if (updates.date && updates.date !== date) {
          // 从原日期移除
          this.data.tasks[date].splice(taskIndex, 1);
          this.removeTaskFromDayPlan(date, taskId);
          
          // 添加到新日期
          if (!this.data.tasks[updates.date]) {
            this.data.tasks[updates.date] = [];
          }
          this.data.tasks[updates.date].push(updatedTask);
          this.addTaskToDayPlan(updates.date, taskId);
        } else {
          this.data.tasks[date][taskIndex] = updatedTask;
        }
        
        this.saveData();
        this.notify('task_updated', { task: updatedTask, oldDate: date });
        return updatedTask;
      }
    }
    
    throw new Error('任务未找到');
  }
  
  // 切换任务完成状态
  toggleTaskStatus(taskId) {
    for (let date in this.data.tasks) {
      const task = this.data.tasks[date].find(t => t.id === taskId);
      if (task) {
        task.status = task.status === 'todo' ? 'done' : 'todo';
        task.updatedAt = new Date().toISOString();
        
        // 如果启用了自动移动完成任务到底部
        if (this.data.settings.autoMoveCompletedTasks && task.status === 'done') {
          this.moveCompletedTaskToBottom(date, taskId);
        }
        
        this.saveData();
        this.notify('task_status_changed', { task, date });
        return task;
      }
    }
    
    throw new Error('任务未找到');
  }
  
  // 将完成的任务移动到底部
  moveCompletedTaskToBottom(date, taskId) {
    if (!this.data.dayPlans[date]) {
      this.data.dayPlans[date] = { taskOrder: [], updatedAt: new Date().toISOString() };
    }
    
    const taskOrder = this.data.dayPlans[date].taskOrder;
    const taskIndex = taskOrder.indexOf(taskId);
    
    if (taskIndex !== -1) {
      // 移除任务ID并添加到末尾
      taskOrder.splice(taskIndex, 1);
      taskOrder.push(taskId);
      this.data.dayPlans[date].updatedAt = new Date().toISOString();
    }
  }
  
  // 删除任务
  deleteTask(taskId) {
    for (let date in this.data.tasks) {
      const taskIndex = this.data.tasks[date].findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        const deletedTask = this.data.tasks[date][taskIndex];
        this.data.tasks[date].splice(taskIndex, 1);
        this.removeTaskFromDayPlan(date, taskId);
        
        this.saveData();
        this.notify('task_deleted', { task: deletedTask, date });
        return deletedTask;
      }
    }
    
    throw new Error('任务未找到');
  }
  
  // 重新排序任务
  reorderTasks(date, taskIds) {
    if (!this.data.dayPlans[date]) {
      this.data.dayPlans[date] = { taskOrder: [], updatedAt: new Date().toISOString() };
    }
    
    this.data.dayPlans[date].taskOrder = taskIds;
    this.data.dayPlans[date].updatedAt = new Date().toISOString();
    
    this.saveData();
    this.notify('tasks_reordered', { date, taskIds });
  }

  // =============================================================================
  // 随心记管理
  // =============================================================================
  
  // 创建随心记
  createQuickNote(content) {
    const note = {
      id: generateId(),
      content,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.data.quickNotes.unshift(note);
    this.saveData();
    this.notify('note_created', { note });
    
    return note;
  }
  
  // 获取所有随心记
  getQuickNotes() {
    return [...this.data.quickNotes].sort((a, b) => {
      // 置顶的排在前面
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // 同类型按创建时间倒序
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }
  
  // 更新随心记
  updateQuickNote(noteId, updates) {
    const noteIndex = this.data.quickNotes.findIndex(n => n.id === noteId);
    if (noteIndex === -1) {
      throw new Error('随心记未找到');
    }
    
    this.data.quickNotes[noteIndex] = {
      ...this.data.quickNotes[noteIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData();
    this.notify('note_updated', { note: this.data.quickNotes[noteIndex] });
    
    return this.data.quickNotes[noteIndex];
  }
  
  // 删除随心记
  deleteQuickNote(noteId) {
    const noteIndex = this.data.quickNotes.findIndex(n => n.id === noteId);
    if (noteIndex === -1) {
      throw new Error('随心记未找到');
    }
    
    const deletedNote = this.data.quickNotes[noteIndex];
    this.data.quickNotes.splice(noteIndex, 1);
    
    this.saveData();
    this.notify('note_deleted', { note: deletedNote });
    
    return deletedNote;
  }
  
  // 将随心记转换为任务
  convertNoteToTask(noteId, date, priority = 'none') {
    const note = this.data.quickNotes.find(n => n.id === noteId);
    if (!note) {
      throw new Error('随心记未找到');
    }
    
    const task = this.createTask({
      title: note.content,
      date,
      priority,
      fromQuickNoteId: noteId
    });
    
    // 删除原随心记
    this.deleteQuickNote(noteId);
    
    this.notify('note_converted_to_task', { note, task });
    
    return task;
  }

  // =============================================================================
  // 模板管理
  // =============================================================================
  
  // 创建模板
  createTemplate(templateData) {
    const template = {
      id: generateId(),
      title: templateData.title || '',
      desc: templateData.desc || '',
      defaultPriority: templateData.defaultPriority || 'none',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.data.templates.push(template);
    this.saveData();
    this.notify('template_created', { template });
    
    return template;
  }
  
  // 获取所有模板
  getTemplates() {
    return [...this.data.templates];
  }
  
  // 删除模板
  deleteTemplate(templateId) {
    const templateIndex = this.data.templates.findIndex(t => t.id === templateId);
    if (templateIndex === -1) {
      throw new Error('模板未找到');
    }
    
    const deletedTemplate = this.data.templates[templateIndex];
    this.data.templates.splice(templateIndex, 1);
    
    this.saveData();
    this.notify('template_deleted', { template: deletedTemplate });
    
    return deletedTemplate;
  }
  
  // 从模板创建任务
  createTaskFromTemplate(templateId, date) {
    const template = this.data.templates.find(t => t.id === templateId);
    if (!template) {
      throw new Error('模板未找到');
    }
    
    return this.createTask({
      title: template.title,
      desc: template.desc,
      date,
      priority: template.defaultPriority
    });
  }

  // =============================================================================
  // 设置管理
  // =============================================================================
  
  // 获取设置
  getSettings() {
    return { ...this.data.settings };
  }
  
  // 更新设置
  updateSettings(updates) {
    this.data.settings = { ...this.data.settings, ...updates };
    this.saveData();
    this.notify('settings_updated', { settings: this.data.settings });
    
    return this.data.settings;
  }

  // =============================================================================
  // 日期管理
  // =============================================================================
  
  // 设置当前选中的日期
  setCurrentDate(date) {
    this.currentDate = date;
    this.notify('current_date_changed', { date });
  }
  
  // 获取当前选中的日期
  getCurrentDate() {
    return this.currentDate;
  }

  // =============================================================================
  // 辅助方法
  // =============================================================================
  
  // 在日期计划中添加任务
  addTaskToDayPlan(date, taskId) {
    if (!this.data.dayPlans[date]) {
      this.data.dayPlans[date] = { taskOrder: [], updatedAt: new Date().toISOString() };
    }
    
    if (!this.data.dayPlans[date].taskOrder.includes(taskId)) {
      this.data.dayPlans[date].taskOrder.push(taskId);
      this.data.dayPlans[date].updatedAt = new Date().toISOString();
    }
  }
  
  // 从日期计划中移除任务
  removeTaskFromDayPlan(date, taskId) {
    if (this.data.dayPlans[date]) {
      const index = this.data.dayPlans[date].taskOrder.indexOf(taskId);
      if (index !== -1) {
        this.data.dayPlans[date].taskOrder.splice(index, 1);
        this.data.dayPlans[date].updatedAt = new Date().toISOString();
      }
    }
  }

  // 将完成任务移动到列表底部
  moveCompletedTaskToBottom(date, taskId) {
    const tasks = this.data.tasks[date] || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex !== -1 && taskIndex !== tasks.length - 1) {
      const [completedTask] = tasks.splice(taskIndex, 1);
      tasks.push(completedTask);
      this.data.tasks[date] = tasks;
      this.reorderTasks(date, tasks.map(t => t.id));
    }
  }
  
  // 获取统计信息
  getStats() {
    const today = getTodayString();
    const todayTasks = this.getTasksByDate(today);
    const completedToday = todayTasks.filter(t => t.status === 'done').length;
    const totalToday = todayTasks.length;
    
    return {
      todayTasks: totalToday,
      todayCompleted: completedToday,
      todayRemaining: totalToday - completedToday,
      totalQuickNotes: this.data.quickNotes.length,
      totalTemplates: this.data.templates.length
    };
  }
}

// =============================================================================
// 导出模块
// =============================================================================

// 创建全局实例
const ratiorStore = new RatiorStore();

// 如果在浏览器环境中，挂载到全局对象
if (typeof window !== 'undefined') {
  window.ratiorStore = ratiorStore;
}

// 如果在 Node.js 环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RatiorStore;
}