// =============================================================================
// 主应用逻辑 (App)
// =============================================================================

class RatiorApp {
  constructor() {
    this.store = window.ratiorStore;
    this.components = {};
    this.dragState = {
      isDragging: false,
      dragElement: null,
      dragData: null
    };
    
    this.init();
  }
  
  // =============================================================================
  // 应用初始化
  // =============================================================================
  
  init() {
    this.initComponents();
    this.bindEvents();
    this.bindStoreEvents();
    this.bindKeyboardEvents();
    this.loadInitialData();
    
    // 首次运行检查
    if (!this.store.getSettings().firstRunCompleted) {
      this.showWelcome();
    }
    
    console.log('Ratior 应用初始化完成');
  }
  
  initComponents() {
    // 初始化日期选择组件
    this.components.dateTabs = new DateTabsComponent(
      document.getElementById('date-tabs'),
      this.store
    );
    
    // 初始化日历组件
    this.components.calendar = new CalendarComponent(
      document.getElementById('calendar-popup'),
      this.store
    );
    
    // 初始化抽屉组件
    this.components.drawer = new DrawerComponent();
    
    // 获取DOM元素引用
    this.elements = {
      // 顶部导航
      btnToday: document.querySelector('.btn-today'),
      navPrev: document.querySelector('.nav-prev'),
      navNext: document.querySelector('.nav-next'),
      btnCalendar: document.querySelector('.btn-calendar'),
      
      // 左侧随心记
      notesInput: document.getElementById('notes-input'),
      notesList: document.getElementById('notes-list'),
      notesCount: document.getElementById('notes-count'),
      settingsBtn: document.getElementById('settings-btn'),
      
      // 主区任务
      currentDateTitle: document.getElementById('current-date-title'),
      taskList: document.getElementById('task-list'),
      taskCount: document.getElementById('task-count'),
      emptyState: document.getElementById('empty-state'),
      
      // 添加抽屉
      fabAdd: document.getElementById('fab-add'),
      drawerOverlay: document.getElementById('drawer-overlay'),
      drawerClose: document.querySelector('.drawer-close'),
      tabBtns: document.querySelectorAll('.tab-btn'),
      taskTitleInput: document.getElementById('task-title-input'),
      taskDescInput: document.getElementById('task-desc-input'),
      priorityBtns: document.querySelectorAll('.priority-btn'),
      btnSave: document.querySelector('.btn-save'),
      templateList: document.getElementById('template-list')
    };
  }
  
  bindEvents() {
    // 顶部导航事件
    this.elements.btnToday.addEventListener('click', () => {
      this.components.dateTabs.goToToday();
    });
    
    this.elements.navPrev.addEventListener('click', () => {
      this.components.dateTabs.navigateDate(-1);
    });
    
    this.elements.navNext.addEventListener('click', () => {
      this.components.dateTabs.navigateDate(1);
    });
    
    this.elements.btnCalendar.addEventListener('click', (e) => {
      e.stopPropagation();
      this.components.calendar.show();
    });
    
    // 点击其他地方关闭日历
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.calendar-popup') && !e.target.closest('.btn-calendar')) {
        this.components.calendar.hide();
      }
    });
    
    // 随心记事件
    this.elements.notesInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleAddQuickNote();
      }
    });
    
    this.elements.notesList.addEventListener('click', (e) => {
      this.handleNoteAction(e);
    });
    
    // 设置按钮事件
    this.elements.settingsBtn.addEventListener('click', () => {
      this.showSettingsModal();
    });
    
    // 任务列表事件
    this.elements.taskList.addEventListener('click', (e) => {
      this.handleTaskAction(e);
    });
    
    // 拖拽事件
    this.elements.taskList.addEventListener('dragstart', (e) => {
      this.handleDragStart(e);
    });
    
    this.elements.taskList.addEventListener('dragover', (e) => {
      this.handleDragOver(e);
    });
    
    this.elements.taskList.addEventListener('drop', (e) => {
      this.handleDrop(e);
    });
    
    this.elements.taskList.addEventListener('dragend', (e) => {
      this.handleDragEnd(e);
    });
    
    // 添加抽屉事件
    this.elements.fabAdd.addEventListener('click', () => {
      this.components.drawer.show();
    });
    
    this.elements.drawerOverlay.addEventListener('click', (e) => {
      if (e.target === this.elements.drawerOverlay) {
        this.components.drawer.hide();
      }
    });
    
    this.elements.drawerClose.addEventListener('click', () => {
      this.components.drawer.hide();
    });
    
    this.elements.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.components.drawer.switchTab(btn.dataset.tab);
      });
    });
    
    // 优先级选择
    this.elements.priorityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.priorityBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    
    // 保存任务
    this.elements.btnSave.addEventListener('click', () => {
      this.handleSaveTask();
    });
    
    // 模板选择
    this.elements.templateList.addEventListener('click', (e) => {
      const templateItem = e.target.closest('.template-item');
      if (templateItem) {
        this.handleSelectTemplate(templateItem.dataset.templateId);
      }
    });
    
    // 任务输入框回车保存
    this.elements.taskTitleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSaveTask();
      }
    });
  }
  
  bindStoreEvents() {
    this.store.subscribe((type, data) => {
      switch (type) {
        case 'current_date_changed':
          this.handleDateChange(data.date);
          break;
        case 'task_created':
        case 'task_updated':
        case 'task_deleted':
        case 'task_status_changed':
        case 'tasks_reordered':
          this.refreshTaskList();
          break;
        case 'note_created':
        case 'note_updated':
        case 'note_deleted':
          this.refreshNotesList();
          break;
        case 'template_created':
        case 'template_deleted':
          this.refreshTemplateList();
          break;
      }
    });
  }
  
  bindKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      // 全局快捷键
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return; // 在输入框中不处理全局快捷键
      }
      
      switch (e.key) {
        case '/':
          e.preventDefault();
          this.elements.notesInput.focus();
          break;
        case 't':
          e.preventDefault();
          this.components.drawer.show();
          break;
        case 'Escape':
          this.components.drawer.hide();
          this.components.calendar.hide();
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.components.dateTabs.navigateDate(-1);
          }
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.components.dateTabs.navigateDate(1);
          }
          break;
      }
    });
  }
  
  loadInitialData() {
    this.components.dateTabs.render();
    this.refreshTaskList();
    this.refreshNotesList();
    this.refreshTemplateList();
  }

  // =============================================================================
  // 事件处理函数
  // =============================================================================
  
  handleDateChange(date) {
    this.components.dateTabs.currentDate = date;
    this.components.dateTabs.render();
    this.updateDateTitle(date);
    this.refreshTaskList();
  }
  
  updateDateTitle(date) {
    const today = formatDate(new Date());
    const targetDate = new Date(date);
    const todayDate = new Date(today);
    
    let title = '';
    const diffTime = targetDate - todayDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      title = '今天';
    } else if (diffDays === 1) {
      title = '明天';
    } else if (diffDays === -1) {
      title = '昨天';
    } else if (diffDays > 0) {
      title = `${diffDays}天后`;
    } else {
      title = `${Math.abs(diffDays)}天前`;
    }
    
    this.elements.currentDateTitle.textContent = title;
  }
  
  handleAddQuickNote() {
    const content = this.elements.notesInput.value.trim();
    if (!content) return;
    
    try {
      this.store.createQuickNote(content);
      this.elements.notesInput.value = '';
      ToastComponent.show('随心记已添加');
    } catch (error) {
      console.error('添加随心记失败:', error);
      ToastComponent.show('添加失败，请重试');
    }
  }
  
  handleNoteAction(e) {
    const noteId = e.target.dataset.noteId;
    if (!noteId) return;
    
    if (e.target.classList.contains('add-to-day')) {
      this.handleConvertNoteToTask(noteId);
    } else if (e.target.classList.contains('note-menu')) {
      this.showNoteMenu(noteId, e.target);
    }
  }
  
  async handleConvertNoteToTask(noteId) {
    try {
      const currentDate = this.store.getCurrentDate();
      const task = this.store.convertNoteToTask(noteId, currentDate, 'none');
      ToastComponent.show('已添加到当日任务');
    } catch (error) {
      console.error('转换任务失败:', error);
      ToastComponent.show('转换失败，请重试');
    }
  }
  
  showNoteMenu(noteId, buttonElement) {
    // 简单的上下文菜单实现
    const note = this.store.getQuickNotes().find(n => n.id === noteId);
    if (!note) return;
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
      <div class="menu-item" data-action="pin">${note.pinned ? '取消置顶' : '置顶'}</div>
      <div class="menu-item" data-action="edit">编辑</div>
      <div class="menu-item" data-action="delete">删除</div>
    `;
    
    // 定位菜单
    const rect = buttonElement.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = rect.bottom + 'px';
    menu.style.left = rect.left + 'px';
    menu.style.zIndex = '9999';
    
    document.body.appendChild(menu);
    
    // 绑定菜单事件
    menu.addEventListener('click', async (e) => {
      const action = e.target.dataset.action;
      switch (action) {
        case 'pin':
          this.store.updateQuickNote(noteId, { pinned: !note.pinned });
          break;
        case 'edit':
          const newContent = await ModalComponent.prompt('编辑随心记', note.content);
          if (newContent) {
            this.store.updateQuickNote(noteId, { content: newContent });
          }
          break;
        case 'delete':
          const confirmed = await ModalComponent.confirm('确定要删除这条随心记吗？');
          if (confirmed) {
            this.store.deleteQuickNote(noteId);
            ToastComponent.show('随心记已删除');
          }
          break;
      }
      menu.remove();
    });
    
    // 点击其他地方关闭菜单
    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      });
    }, 0);
  }
  
  handleTaskAction(e) {
    const taskId = e.target.dataset.taskId;
    if (!taskId) return;
    
    if (e.target.classList.contains('task-checkbox')) {
      this.handleToggleTask(taskId);
    } else if (e.target.dataset.action === 'edit') {
      this.handleEditTask(taskId);
    } else if (e.target.dataset.action === 'delete') {
      this.handleDeleteTask(taskId);
    }
  }
  
  handleToggleTask(taskId) {
    try {
      this.store.toggleTaskStatus(taskId);
    } catch (error) {
      console.error('切换任务状态失败:', error);
      ToastComponent.show('操作失败，请重试');
    }
  }
  
  async handleEditTask(taskId) {
    const currentDate = this.store.getCurrentDate();
    const tasks = this.store.getTasksByDate(currentDate);
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    // 打开编辑模态框
    const modal = new ModalComponent();
    const content = `
      <div class="modal-header">
        <h3>编辑任务</h3>
      </div>
      <div class="modal-body">
        <input type="text" class="modal-input" id="edit-title" value="${escapeHtml(task.title)}" placeholder="任务标题" />
        <textarea class="modal-textarea" id="edit-desc" placeholder="描述（可选）">${escapeHtml(task.desc)}</textarea>
        <div class="priority-selector">
          <label>优先级：</label>
          <div class="priority-options">
            <button class="priority-btn ${task.priority === 'none' ? 'active' : ''}" data-priority="none">无</button>
            <button class="priority-btn ${task.priority === 'low' ? 'active' : ''}" data-priority="low">低</button>
            <button class="priority-btn ${task.priority === 'med' ? 'active' : ''}" data-priority="med">中</button>
            <button class="priority-btn ${task.priority === 'high' ? 'active' : ''}" data-priority="high">高</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel">取消</button>
        <button class="btn-confirm">保存</button>
      </div>
    `;
    
    const promise = modal.show(content);
    
    // 绑定优先级选择
    let selectedPriority = task.priority;
    modal.modal.querySelectorAll('.priority-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.modal.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPriority = btn.dataset.priority;
      });
    });
    
    // 绑定按钮事件
    modal.modal.querySelector('.btn-cancel').addEventListener('click', () => {
      modal.resolvePromise(null);
      modal.hide();
    });
    
    modal.modal.querySelector('.btn-confirm').addEventListener('click', () => {
      const title = modal.modal.querySelector('#edit-title').value.trim();
      const desc = modal.modal.querySelector('#edit-desc').value.trim();
      
      if (!title) {
        ToastComponent.show('请输入任务标题');
        return;
      }
      
      try {
        this.store.updateTask(taskId, {
          title,
          desc,
          priority: selectedPriority
        });
        ToastComponent.show('任务已更新');
        modal.hide();
      } catch (error) {
        console.error('更新任务失败:', error);
        ToastComponent.show('更新失败，请重试');
      }
    });
  }
  
  async handleDeleteTask(taskId) {
    const confirmed = await ModalComponent.confirm('确定要删除这个任务吗？');
    if (confirmed) {
      try {
        this.store.deleteTask(taskId);
        ToastComponent.show('任务已删除');
      } catch (error) {
        console.error('删除任务失败:', error);
        ToastComponent.show('删除失败，请重试');
      }
    }
  }
  
  handleSaveTask() {
    const title = this.elements.taskTitleInput.value.trim();
    const desc = this.elements.taskDescInput.value.trim();
    const priorityBtn = document.querySelector('.priority-btn.active');
    const priority = priorityBtn ? priorityBtn.dataset.priority : 'none';
    
    if (!title) {
      ToastComponent.show('请输入任务标题');
      this.elements.taskTitleInput.focus();
      return;
    }
    
    try {
      const currentDate = this.store.getCurrentDate();
      this.store.createTask({
        title,
        desc,
        date: currentDate,
        priority
      });
      
      // 清空输入框
      this.elements.taskTitleInput.value = '';
      this.elements.taskDescInput.value = '';
      this.elements.priorityBtns.forEach(btn => btn.classList.remove('active'));
      this.elements.priorityBtns[0].classList.add('active'); // 默认选择"无"
      
      this.components.drawer.hide();
      ToastComponent.show('任务已添加');
    } catch (error) {
      console.error('添加任务失败:', error);
      ToastComponent.show('添加失败，请重试');
    }
  }
  
  handleSelectTemplate(templateId) {
    try {
      const currentDate = this.store.getCurrentDate();
      this.store.createTaskFromTemplate(templateId, currentDate);
      this.components.drawer.hide();
      ToastComponent.show('任务已添加');
    } catch (error) {
      console.error('从模板创建任务失败:', error);
      ToastComponent.show('添加失败，请重试');
    }
  }

  // =============================================================================
  // 拖拽处理
  // =============================================================================
  
  handleDragStart(e) {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;
    
    this.dragState.isDragging = true;
    this.dragState.dragElement = taskItem;
    this.dragState.dragData = taskItem.dataset.taskId;
    
    taskItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', taskItem.outerHTML);
  }
  
  handleDragOver(e) {
    if (!this.dragState.isDragging) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const taskItem = e.target.closest('.task-item');
    const taskList = this.elements.taskList;
    
    if (taskItem && taskItem !== this.dragState.dragElement) {
      const rect = taskItem.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      
      if (e.clientY < midY) {
        taskList.insertBefore(this.dragState.dragElement, taskItem);
      } else {
        taskList.insertBefore(this.dragState.dragElement, taskItem.nextSibling);
      }
    }
  }
  
  handleDrop(e) {
    if (!this.dragState.isDragging) return;
    
    e.preventDefault();
    this.updateTaskOrder();
  }
  
  handleDragEnd(e) {
    if (this.dragState.dragElement) {
      this.dragState.dragElement.classList.remove('dragging');
    }
    
    this.dragState.isDragging = false;
    this.dragState.dragElement = null;
    this.dragState.dragData = null;
  }
  
  updateTaskOrder() {
    const taskItems = this.elements.taskList.querySelectorAll('.task-item');
    const taskIds = Array.from(taskItems).map(item => item.dataset.taskId);
    const currentDate = this.store.getCurrentDate();
    
    try {
      this.store.reorderTasks(currentDate, taskIds);
    } catch (error) {
      console.error('更新任务排序失败:', error);
      this.refreshTaskList(); // 恢复原有顺序
    }
  }

  // =============================================================================
  // 数据刷新函数
  // =============================================================================
  
  refreshTaskList() {
    const currentDate = this.store.getCurrentDate();
    const tasks = this.store.getTasksByDate(currentDate);
    
    TaskComponent.renderTaskList(tasks, this.elements.taskList);
    
    // 更新任务计数
    const completedCount = tasks.filter(t => t.status === 'done').length;
    this.elements.taskCount.textContent = `${tasks.length} 个任务，${completedCount} 个已完成`;
  }
  
  refreshNotesList() {
    const notes = this.store.getQuickNotes();
    QuickNoteComponent.renderNoteList(notes, this.elements.notesList);
    this.elements.notesCount.textContent = notes.length.toString();
  }
  
  refreshTemplateList() {
    const templates = this.store.getTemplates();
    const templateContainer = document.getElementById('tab-template');
    TemplateComponent.renderTemplateList(templates, templateContainer);
  }

  // =============================================================================
  // 欢迎界面
  // =============================================================================
  
  async showWelcome() {
    const modal = new ModalComponent();
    const content = `
      <div class="welcome-modal">
        <div class="welcome-icon">✨</div>
        <h2>欢迎使用 Ratior</h2>
        <p>简约优美的每日计划定制应用</p>
        <div class="welcome-features">
          <div class="feature-item">
            <div class="feature-icon">📅</div>
            <div class="feature-text">选择日期，规划每一天</div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">📝</div>
            <div class="feature-text">随心记录，一键转为任务</div>
          </div>
          <div class="feature-item">
            <div class="feature-icon">✅</div>
            <div class="feature-text">管理任务，高效完成</div>
          </div>
        </div>
        <div class="welcome-shortcuts">
          <h4>快捷键提示</h4>
          <div class="shortcut-list">
            <div><kbd>/</kbd> 聚焦随心记</div>
            <div><kbd>T</kbd> 添加任务</div>
            <div><kbd>Ctrl + ←/→</kbd> 切换日期</div>
          </div>
        </div>
        <button class="btn-welcome-start">开始使用</button>
      </div>
    `;
    
    const promise = modal.show(content);
    
    modal.modal.querySelector('.btn-welcome-start').addEventListener('click', () => {
      this.store.updateSettings({ firstRunCompleted: true });
      modal.hide();
      
      // 添加一个示例任务
      this.store.createTask({
        title: '欢迎使用 Ratior！这是一个示例任务',
        desc: '你可以点击勾选框完成任务，或者点击编辑按钮修改内容',
        priority: 'med'
      });
      
      ToastComponent.show('欢迎使用！已为你添加了一个示例任务', 5000);
    });
  }

  // =============================================================================
  // 设置模态框
  // =============================================================================
  
  async showSettingsModal() {
    const modal = new ModalComponent();
    const templates = this.store.getTemplates();
    
    const content = `
      <div class="settings-modal">
        <div class="settings-header">
          <h2>设置</h2>
        </div>
        <div class="settings-content">
          <div class="settings-section">
            <h3>模板管理</h3>
            <p class="section-desc">管理常用任务模板，便于快速创建任务</p>
            
            <div class="template-manager">
              <div class="template-add-form">
                <input type="text" id="template-title" placeholder="模板标题" class="template-input" />
                <textarea id="template-desc" placeholder="模板描述（可选）" class="template-textarea"></textarea>
                <div class="template-priority">
                  <label>默认优先级：</label>
                  <select id="template-priority-select" class="template-select">
                    <option value="none">无</option>
                    <option value="low">低</option>
                    <option value="med">中</option>
                    <option value="high">高</option>
                  </select>
                </div>
                <button class="btn-add-template">添加模板</button>
              </div>
              
              <div class="template-list-container">
                <h4>现有模板</h4>
                <div class="settings-template-list" id="settings-template-list">
                  ${templates.length === 0 ? 
                    '<div class="no-templates">暂无模板</div>' :
                    templates.map(template => `
                      <div class="settings-template-item" data-template-id="${template.id}">
                        <div class="template-info">
                          <div class="template-name">${escapeHtml(template.title)}</div>
                          ${template.desc ? `<div class="template-desc-text">${escapeHtml(template.desc)}</div>` : ''}
                          <div class="template-priority-text">优先级: ${this.getPriorityText(template.defaultPriority)}</div>
                        </div>
                        <div class="template-actions">
                          <button class="btn-edit-template" data-template-id="${template.id}">编辑</button>
                          <button class="btn-delete-template" data-template-id="${template.id}">删除</button>
                        </div>
                      </div>
                    `).join('')
                  }
                </div>
              </div>
            </div>
          </div>
          
          <div class="settings-section">
            <h3>应用设置</h3>
            <div class="setting-item">
              <label class="setting-label">
                <input type="checkbox" id="auto-move-completed" ${this.store.getSettings().autoMoveCompletedTasks ? 'checked' : ''} />
                自动将完成的任务移到底部
              </label>
            </div>
          </div>
        </div>
        
        <div class="settings-footer">
          <button class="btn-close-settings">关闭</button>
        </div>
      </div>
    `;
    
    const promise = modal.show(content);
    
    // 绑定事件
    this.bindSettingsEvents(modal);
  }
  
  bindSettingsEvents(modal) {
    // 添加模板
    modal.modal.querySelector('.btn-add-template').addEventListener('click', () => {
      this.handleAddTemplate(modal);
    });
    
    // 删除模板
    modal.modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-delete-template')) {
        this.handleDeleteTemplate(e.target.dataset.templateId, modal);
      }
    });
    
    // 编辑模板
    modal.modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-edit-template')) {
        this.handleEditTemplate(e.target.dataset.templateId, modal);
      }
    });
    
    // 设置更新
    modal.modal.querySelector('#auto-move-completed').addEventListener('change', (e) => {
      this.store.updateSettings({ autoMoveCompletedTasks: e.target.checked });
      ToastComponent.show('设置已保存');
    });
    
    // 关闭按钮
    modal.modal.querySelector('.btn-close-settings').addEventListener('click', () => {
      modal.hide();
    });
  }
  
  async handleAddTemplate(modal) {
    const title = modal.modal.querySelector('#template-title').value.trim();
    const desc = modal.modal.querySelector('#template-desc').value.trim();
    const priority = modal.modal.querySelector('#template-priority-select').value;
    
    if (!title) {
      ToastComponent.show('请输入模板标题');
      return;
    }
    
    try {
      this.store.createTemplate({
        title,
        desc,
        defaultPriority: priority
      });
      
      ToastComponent.show('模板已添加');
      modal.hide();
      // 重新打开设置界面以刷新模板列表
      setTimeout(() => this.showSettingsModal(), 100);
    } catch (error) {
      console.error('添加模板失败:', error);
      ToastComponent.show('添加失败，请重试');
    }
  }
  
  async handleDeleteTemplate(templateId, modal) {
    const confirmed = await ModalComponent.confirm('确定要删除这个模板吗？');
    if (confirmed) {
      try {
        this.store.deleteTemplate(templateId);
        ToastComponent.show('模板已删除');
        modal.hide();
        // 重新打开设置界面以刷新模板列表
        setTimeout(() => this.showSettingsModal(), 100);
      } catch (error) {
        console.error('删除模板失败:', error);
        ToastComponent.show('删除失败，请重试');
      }
    }
  }
  
  async handleEditTemplate(templateId, modal) {
    const templates = this.store.getTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    const editModal = new ModalComponent();
    const content = `
      <div class="modal-header">
        <h3>编辑模板</h3>
      </div>
      <div class="modal-body">
        <input type="text" class="modal-input" id="edit-template-title" value="${escapeHtml(template.title)}" placeholder="模板标题" />
        <textarea class="modal-textarea" id="edit-template-desc" placeholder="模板描述（可选）">${escapeHtml(template.desc)}</textarea>
        <div class="priority-selector">
          <label>默认优先级：</label>
          <div class="priority-options">
            <button class="priority-btn ${template.defaultPriority === 'none' ? 'active' : ''}" data-priority="none">无</button>
            <button class="priority-btn ${template.defaultPriority === 'low' ? 'active' : ''}" data-priority="low">低</button>
            <button class="priority-btn ${template.defaultPriority === 'med' ? 'active' : ''}" data-priority="med">中</button>
            <button class="priority-btn ${template.defaultPriority === 'high' ? 'active' : ''}" data-priority="high">高</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel">取消</button>
        <button class="btn-confirm">保存</button>
      </div>
    `;
    
    const promise = editModal.show(content);
    
    // 绑定优先级选择
    let selectedPriority = template.defaultPriority;
    editModal.modal.querySelectorAll('.priority-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        editModal.modal.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedPriority = btn.dataset.priority;
      });
    });
    
    // 绑定按钮事件
    editModal.modal.querySelector('.btn-cancel').addEventListener('click', () => {
      editModal.hide();
    });
    
    editModal.modal.querySelector('.btn-confirm').addEventListener('click', () => {
      const title = editModal.modal.querySelector('#edit-template-title').value.trim();
      const desc = editModal.modal.querySelector('#edit-template-desc').value.trim();
      
      if (!title) {
        ToastComponent.show('请输入模板标题');
        return;
      }
      
      try {
        // 更新模板（通过删除旧的并创建新的）
        this.store.deleteTemplate(templateId);
        this.store.createTemplate({
          title,
          desc,
          defaultPriority: selectedPriority
        });
        
        ToastComponent.show('模板已更新');
        editModal.hide();
        modal.hide();
        // 重新打开设置界面以刷新模板列表
        setTimeout(() => this.showSettingsModal(), 100);
      } catch (error) {
        console.error('更新模板失败:', error);
        ToastComponent.show('更新失败，请重试');
      }
    });
  }
  
  getPriorityText(priority) {
    const priorityMap = {
      'none': '无',
      'low': '低',
      'med': '中',
      'high': '高'
    };
    return priorityMap[priority] || '无';
  }
}

// =============================================================================
// 应用启动
// =============================================================================

// 等待DOM加载完成后启动应用
document.addEventListener('DOMContentLoaded', () => {
  // 加载 dayjs（如果需要）
  if (typeof dayjs === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js';
    script.onload = () => {
      window.ratiorApp = new RatiorApp();
    };
    document.head.appendChild(script);
  } else {
    window.ratiorApp = new RatiorApp();
  }
});

// 为组件添加额外的样式
const additionalStyles = `
  .context-menu {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: var(--space-xs);
    min-width: 120px;
  }
  
  .menu-item {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .menu-item:hover {
    background: var(--border-light);
  }
  
  .welcome-modal {
    text-align: center;
    padding: var(--space-xl);
  }
  
  .welcome-icon {
    font-size: 48px;
    margin-bottom: var(--space-lg);
  }
  
  .welcome-modal h2 {
    margin-bottom: var(--space-sm);
    color: var(--text);
  }
  
  .welcome-modal p {
    color: var(--text-muted);
    margin-bottom: var(--space-xl);
  }
  
  .welcome-features {
    margin-bottom: var(--space-xl);
  }
  
  .feature-item {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
    text-align: left;
  }
  
  .feature-icon {
    font-size: 24px;
    width: 40px;
    text-align: center;
  }
  
  .welcome-shortcuts {
    background: var(--bg);
    padding: var(--space-lg);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-xl);
  }
  
  .welcome-shortcuts h4 {
    margin-bottom: var(--space-md);
    color: var(--text);
  }
  
  .shortcut-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
    font-size: 14px;
  }
  
  .shortcut-list kbd {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 2px 6px;
    font-family: monospace;
    font-size: 12px;
  }
  
  .btn-welcome-start {
    background: var(--brand);
    color: white;
    padding: var(--space-md) var(--space-xl);
    border-radius: var(--radius-lg);
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  
  .btn-welcome-start:hover {
    background: #7bb3d3;
    transform: translateY(-1px);
  }
  
  .modal-textarea {
    width: 100%;
    padding: var(--space-md);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-md);
    resize: vertical;
    min-height: 80px;
    transition: all var(--transition-fast);
  }
  
  .modal-textarea:focus {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px rgba(142, 202, 230, 0.1);
  }
  
  .modal-footer {
    display: flex;
    gap: var(--space-md);
    justify-content: flex-end;
    margin-top: var(--space-lg);
  }
  
  .btn-cancel, .btn-confirm {
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
  }
  
  .btn-cancel {
    background: var(--border-light);
    color: var(--text-muted);
  }
  
  .btn-cancel:hover {
    background: var(--border);
  }
  
  .btn-confirm {
    background: var(--brand);
    color: white;
  }
  
  .btn-confirm:hover {
    background: #7bb3d3;
  }
  
  /* 设置模态框样式 */
  .settings-modal {
    max-width: 600px;
    width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
  }
  
  .settings-header {
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--border-light);
    margin-bottom: var(--space-lg);
  }
  
  .settings-header h2 {
    color: var(--text);
    font-size: 20px;
    font-weight: 600;
  }
  
  .settings-section {
    margin-bottom: var(--space-xl);
  }
  
  .settings-section h3 {
    color: var(--text);
    font-size: 16px;
    font-weight: 600;
    margin-bottom: var(--space-sm);
  }
  
  .section-desc {
    color: var(--text-muted);
    font-size: 14px;
    margin-bottom: var(--space-lg);
  }
  
  .template-manager {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-lg);
  }
  
  .template-add-form {
    background: var(--bg);
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-light);
  }
  
  .template-input, .template-textarea, .template-select {
    width: 100%;
    padding: var(--space-md);
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
    transition: all var(--transition-fast);
  }
  
  .template-input:focus, .template-textarea:focus, .template-select:focus {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px rgba(142, 202, 230, 0.1);
  }
  
  .template-textarea {
    resize: vertical;
    min-height: 60px;
  }
  
  .template-priority {
    margin-bottom: var(--space-md);
  }
  
  .template-priority label {
    display: block;
    margin-bottom: var(--space-sm);
    color: var(--text-muted);
    font-weight: 500;
  }
  
  .btn-add-template {
    width: 100%;
    padding: var(--space-md);
    background: var(--brand);
    color: white;
    border-radius: var(--radius-lg);
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  
  .btn-add-template:hover {
    background: #7bb3d3;
    transform: translateY(-1px);
  }
  
  .template-list-container h4 {
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
    margin-bottom: var(--space-md);
  }
  
  .settings-template-list {
    max-height: 300px;
    overflow-y: auto;
  }
  
  .settings-template-item {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-sm);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  .template-info {
    flex: 1;
  }
  
  .template-name {
    font-weight: 500;
    margin-bottom: var(--space-xs);
  }
  
  .template-desc-text {
    color: var(--text-muted);
    font-size: 13px;
    margin-bottom: var(--space-xs);
  }
  
  .template-priority-text {
    color: var(--text-light);
    font-size: 12px;
  }
  
  .template-actions {
    display: flex;
    gap: var(--space-xs);
  }
  
  .btn-edit-template, .btn-delete-template {
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    transition: all var(--transition-fast);
  }
  
  .btn-edit-template {
    background: var(--border-light);
    color: var(--text-muted);
  }
  
  .btn-edit-template:hover {
    background: var(--brand);
    color: white;
  }
  
  .btn-delete-template {
    background: var(--error);
    color: white;
  }
  
  .btn-delete-template:hover {
    background: #dc2626;
  }
  
  .no-templates {
    text-align: center;
    color: var(--text-light);
    padding: var(--space-xl);
    font-style: italic;
  }
  
  .setting-item {
    margin-bottom: var(--space-md);
  }
  
  .setting-label {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    cursor: pointer;
    color: var(--text);
  }
  
  .setting-label input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--brand);
  }
  
  .settings-footer {
    padding-top: var(--space-lg);
    border-top: 1px solid var(--border-light);
    display: flex;
    justify-content: flex-end;
  }
  
  .btn-close-settings {
    padding: var(--space-sm) var(--space-lg);
    background: var(--border-light);
    color: var(--text-muted);
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast);
  }
  
  .btn-close-settings:hover {
    background: var(--border);
  }
  
  @media (max-width: 768px) {
    .template-manager {
      grid-template-columns: 1fr;
    }
    
    .settings-modal {
      width: 95vw;
    }
  }
 `;

// 添加样式到页面
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);