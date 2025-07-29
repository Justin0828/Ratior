// =============================================================================
// 组件渲染模块 (Components)
// =============================================================================

// 工具函数：转义HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 工具函数：格式化时间显示
function formatTimeDisplay(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    // 小于1分钟
    if (diff < 60000) {
      return '刚刚';
    }
    
    // 小于1小时
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    }
    
    // 小于24小时
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    }
    
    // 小于7天
    if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)}天前`;
    }
    
    // 显示具体日期
    return date.toLocaleDateString('zh-CN');
  } catch (error) {
    return '未知时间';
  }
}

// 工具函数：获取星期几的简称
function getDayName(date) {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return days[new Date(date).getDay()];
}

// 工具函数：判断是否为今天
function isToday(dateString) {
  const today = new Date();
  const targetDate = new Date(dateString);
  return today.toDateString() === targetDate.toDateString();
}

// 工具函数：生成日期范围
function generateDateRange(centerDate, range = 7) {
  const dates = [];
  const center = new Date(centerDate);
  const startOffset = Math.floor(range / 2);
  
  for (let i = -startOffset; i < range - startOffset; i++) {
    const date = new Date(center);
    date.setDate(date.getDate() + i);
    dates.push(formatDate(date));
  }
  
  return dates;
}

// =============================================================================
// 日期选择组件
// =============================================================================

class DateTabsComponent {
  constructor(container, store) {
    this.container = container;
    this.store = store;
    this.currentDate = store.getCurrentDate();
  }
  
  render() {
    const dates = generateDateRange(this.currentDate, 7);
    
    this.container.innerHTML = dates.map(dateStr => {
      const date = new Date(dateStr);
      const dayNumber = date.getDate();
      const dayName = getDayName(dateStr);
      const isActive = dateStr === this.currentDate;
      const isTodayDate = isToday(dateStr);
      
      return `
        <button class="date-tab ${isActive ? 'active' : ''}" data-date="${dateStr}">
          <div class="day-name">${isTodayDate ? '今天' : dayName}</div>
          <div class="day-number">${dayNumber}</div>
        </button>
      `;
    }).join('');
    
    this.bindEvents();
  }
  
  bindEvents() {
    this.container.addEventListener('click', (e) => {
      const dateTab = e.target.closest('.date-tab');
      if (dateTab) {
        const date = dateTab.dataset.date;
        this.setActiveDate(date);
      }
    });
  }
  
  setActiveDate(date) {
    this.currentDate = date;
    this.store.setCurrentDate(date);
    this.render();
  }
  
  navigateDate(offset) {
    const newDate = new Date(this.currentDate);
    newDate.setDate(newDate.getDate() + offset);
    this.setActiveDate(formatDate(newDate));
  }
  
  goToToday() {
    this.setActiveDate(formatDate(new Date()));
  }
}

// =============================================================================
// 任务组件
// =============================================================================

class TaskComponent {
  static renderTask(task) {
    const priorityClass = `priority-${task.priority}`;
    const completedClass = task.status === 'done' ? 'completed' : '';
    const checkedClass = task.status === 'done' ? 'checked' : '';
    
    return `
      <div class="task-item ${completedClass}" data-task-id="${task.id}" draggable="true">
        <div class="task-content">
          <div class="task-checkbox ${checkedClass}" data-task-id="${task.id}"></div>
          <div class="task-details">
            <div class="task-title">${escapeHtml(task.title)}</div>
            ${task.desc ? `<div class="task-desc">${escapeHtml(task.desc)}</div>` : ''}
            <div class="task-meta">
              <div class="priority-indicator ${priorityClass}"></div>
              ${task.tags.length > 0 ? `
                <div class="task-tags">
                  ${task.tags.map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>
          <div class="task-actions">
            <button class="task-action" data-action="edit" data-task-id="${task.id}" title="编辑">✏️</button>
            <button class="task-action" data-action="delete" data-task-id="${task.id}" title="删除">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }
  
  static renderTaskList(tasks, container) {
    if (tasks.length === 0) {
      container.innerHTML = '';
      document.getElementById('empty-state').classList.add('show');
      return;
    }
    
    document.getElementById('empty-state').classList.remove('show');
    container.innerHTML = tasks.map(task => TaskComponent.renderTask(task)).join('');
  }
}

// =============================================================================
// 随心记组件
// =============================================================================

class QuickNoteComponent {
  static renderNote(note) {
    const pinnedClass = note.pinned ? 'pinned' : '';
    const timeDisplay = formatTimeDisplay(note.createdAt);
    
    return `
      <div class="note-item ${pinnedClass}" data-note-id="${note.id}">
        <div class="note-content">${escapeHtml(note.content)}</div>
        <div class="note-meta">
          <span class="note-time">${timeDisplay}</span>
          <div class="note-actions">
            <button class="note-action-btn add-to-day" data-note-id="${note.id}">
              加入当日
            </button>
            <button class="note-action-btn note-menu" data-note-id="${note.id}">
              ⋯
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  static renderNoteList(notes, container) {
    if (notes.length === 0) {
      container.innerHTML = '<div class="notes-empty">暂无随心记</div>';
      return;
    }
    
    container.innerHTML = notes.map(note => QuickNoteComponent.renderNote(note)).join('');
  }
}

// =============================================================================
// 模板组件
// =============================================================================

class TemplateComponent {
  static renderTemplate(template) {
    const priorityDisplay = {
      'none': '无优先级',
      'low': '低优先级',
      'med': '中优先级',
      'high': '高优先级'
    };
    
    return `
      <div class="template-item" data-template-id="${template.id}">
        <div class="template-title">${escapeHtml(template.title)}</div>
        ${template.desc ? `<div class="template-desc">${escapeHtml(template.desc)}</div>` : ''}
        <div class="template-meta">
          <span class="template-priority">${priorityDisplay[template.defaultPriority]}</span>
        </div>
      </div>
    `;
  }
  
  static renderTemplateList(templates, container) {
    if (templates.length === 0) {
      container.querySelector('.template-list').innerHTML = '';
      container.querySelector('.template-empty').style.display = 'block';
      return;
    }
    
    container.querySelector('.template-empty').style.display = 'none';
    container.querySelector('.template-list').innerHTML = templates.map(template => 
      TemplateComponent.renderTemplate(template)
    ).join('');
  }
}

// =============================================================================
// 日历组件
// =============================================================================

class CalendarComponent {
  constructor(container, store) {
    this.container = container;
    this.store = store;
    this.currentMonth = new Date();
  }
  
  render() {
    this.renderHeader();
    this.renderGrid();
  }
  
  renderHeader() {
    const titleElement = this.container.querySelector('.calendar-title');
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth() + 1;
    titleElement.textContent = `${year}年${month}月`;
  }
  
  renderGrid() {
    const grid = this.container.querySelector('.calendar-grid');
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    // 获取月份的第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 获取月份第一天是星期几（0-6，0为星期日）
    const startWeekday = firstDay.getDay();
    
    // 创建日历网格
    const days = [];
    
    // 添加上个月的日期（填充空白）
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startWeekday - 1; i >= 0; i--) {
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonth.getDate() - i);
      days.push({
        date: date.getDate(),
        fullDate: formatDate(date),
        isOtherMonth: true,
        isToday: false
      });
    }
    
    // 添加当前月的日期
    for (let date = 1; date <= lastDay.getDate(); date++) {
      const fullDate = formatDate(new Date(year, month, date));
      days.push({
        date,
        fullDate,
        isOtherMonth: false,
        isToday: isToday(fullDate)
      });
    }
    
    // 添加下个月的日期（填充到42天，6周）
    const remainingDays = 42 - days.length;
    for (let date = 1; date <= remainingDays; date++) {
      const fullDate = formatDate(new Date(year, month + 1, date));
      days.push({
        date,
        fullDate,
        isOtherMonth: true,
        isToday: false
      });
    }
    
    // 渲染日历网格
    grid.innerHTML = days.map(day => {
      const classes = ['calendar-day'];
      if (day.isOtherMonth) classes.push('other-month');
      if (day.isToday) classes.push('today');
      
      return `
        <div class="${classes.join(' ')}" data-date="${day.fullDate}">
          ${day.date}
        </div>
      `;
    }).join('');
    
    this.bindEvents();
  }
  
  bindEvents() {
    // 日期点击
    const grid = this.container.querySelector('.calendar-grid');
    grid.addEventListener('click', (e) => {
      const dayElement = e.target.closest('.calendar-day');
      if (dayElement && !dayElement.classList.contains('other-month')) {
        const date = dayElement.dataset.date;
        this.store.setCurrentDate(date);
        this.hide();
      }
    });
    
    // 月份导航
    const prevBtn = this.container.querySelector('#calendar-prev');
    const nextBtn = this.container.querySelector('#calendar-next');
    
    prevBtn.addEventListener('click', () => {
      this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
      this.render();
    });
    
    nextBtn.addEventListener('click', () => {
      this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
      this.render();
    });
  }
  
  show() {
    this.container.classList.add('show');
    this.render();
  }
  
  hide() {
    this.container.classList.remove('show');
  }
}

// =============================================================================
// 模态框组件
// =============================================================================

class ModalComponent {
  constructor() {
    this.overlay = document.getElementById('modal-overlay');
    this.modal = document.getElementById('modal');
  }
  
  show(content, options = {}) {
    this.modal.innerHTML = content;
    this.overlay.classList.add('show');
    
    // 绑定关闭事件
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
    
    // 绑定ESC键
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.hide();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
    
    // 聚焦第一个输入框
    const firstInput = this.modal.querySelector('input, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
    
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }
  
  hide() {
    this.overlay.classList.remove('show');
    if (this.resolvePromise) {
      this.resolvePromise(null);
    }
  }
  
  static confirm(message, title = '确认') {
    const modal = new ModalComponent();
    const content = `
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
      </div>
      <div class="modal-body">
        <p>${escapeHtml(message)}</p>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel">取消</button>
        <button class="btn-confirm">确认</button>
      </div>
    `;
    
    const promise = modal.show(content);
    
    // 绑定按钮事件
    modal.modal.querySelector('.btn-cancel').addEventListener('click', () => {
      modal.resolvePromise(false);
      modal.hide();
    });
    
    modal.modal.querySelector('.btn-confirm').addEventListener('click', () => {
      modal.resolvePromise(true);
      modal.hide();
    });
    
    return promise;
  }
  
  static prompt(message, defaultValue = '', title = '输入') {
    const modal = new ModalComponent();
    const content = `
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
      </div>
      <div class="modal-body">
        <p>${escapeHtml(message)}</p>
        <input type="text" class="modal-input" value="${escapeHtml(defaultValue)}" />
      </div>
      <div class="modal-footer">
        <button class="btn-cancel">取消</button>
        <button class="btn-confirm">确认</button>
      </div>
    `;
    
    const promise = modal.show(content);
    const input = modal.modal.querySelector('.modal-input');
    
    // 绑定按钮事件
    modal.modal.querySelector('.btn-cancel').addEventListener('click', () => {
      modal.resolvePromise(null);
      modal.hide();
    });
    
    modal.modal.querySelector('.btn-confirm').addEventListener('click', () => {
      modal.resolvePromise(input.value.trim());
      modal.hide();
    });
    
    // 回车确认
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        modal.resolvePromise(input.value.trim());
        modal.hide();
      }
    });
    
    return promise;
  }
}

// =============================================================================
// 轻提示组件
// =============================================================================

class ToastComponent {
  constructor() {
    this.container = document.getElementById('toast');
    this.messageElement = this.container.querySelector('.toast-message');
    this.hideTimer = null;
  }
  
  show(message, duration = 3000) {
    // 清除之前的定时器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    
    // 设置消息并显示
    this.messageElement.textContent = message;
    this.container.classList.add('show');
    
    // 自动隐藏
    this.hideTimer = setTimeout(() => {
      this.hide();
    }, duration);
  }
  
  hide() {
    this.container.classList.remove('show');
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
  
  static show(message, duration = 3000) {
    if (!window.toastInstance) {
      window.toastInstance = new ToastComponent();
    }
    window.toastInstance.show(message, duration);
  }
}

// =============================================================================
// 抽屉组件
// =============================================================================

class DrawerComponent {
  constructor() {
    this.overlay = document.getElementById('drawer-overlay');
    this.drawer = document.getElementById('add-drawer');
    this.isVisible = false;
  }
  
  show() {
    this.overlay.classList.add('show');
    this.isVisible = true;
    
    // 聚焦第一个输入框
    const firstInput = this.drawer.querySelector('input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 200);
    }
  }
  
  hide() {
    this.overlay.classList.remove('show');
    this.isVisible = false;
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  switchTab(tabName) {
    // 切换标签按钮状态
    this.drawer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // 切换内容区域
    this.drawer.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
  }
}

// =============================================================================
// 导出组件
// =============================================================================

if (typeof window !== 'undefined') {
  window.DateTabsComponent = DateTabsComponent;
  window.TaskComponent = TaskComponent;
  window.QuickNoteComponent = QuickNoteComponent;
  window.TemplateComponent = TemplateComponent;
  window.CalendarComponent = CalendarComponent;
  window.ModalComponent = ModalComponent;
  window.ToastComponent = ToastComponent;
  window.DrawerComponent = DrawerComponent;
}