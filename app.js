/**
 * TaskPulse — Modern Task & Workflow Management Application
 * Pure Vanilla JavaScript ES6+
 */

class TaskPulseApp {
  constructor() {
    // Application State
    this.tasks = [];
    this.currentStatusFilter = 'all';
    this.currentCategoryFilter = 'all';
    this.currentSort = 'createdAt-desc';
    this.searchQuery = '';
    this.theme = 'dark';
    this.editingTaskId = null;
    this.tempSubtasks = [];

    // DOM Elements Initialization
    this.initElements();
    // Load persisted state & setup event listeners
    this.init();
  }

  initElements() {
    // Header & Controls
    this.currentDateEl = document.getElementById('currentDate');
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.exportDataBtn = document.getElementById('exportDataBtn');
    this.importFileInput = document.getElementById('importFileInput');
    this.openAddTaskModalBtn = document.getElementById('openAddTaskModalBtn');
    this.emptyAddTaskBtn = document.getElementById('emptyAddTaskBtn');
    
    // Stats & Progress
    this.completionPercentEl = document.getElementById('completionPercent');
    this.progressBarFillEl = document.getElementById('progressBarFill');
    this.statTotalEl = document.getElementById('statTotal');
    this.statActiveEl = document.getElementById('statActive');
    this.statCompletedEl = document.getElementById('statCompleted');
    this.statOverdueEl = document.getElementById('statOverdue');

    // Controls
    this.searchInput = document.getElementById('searchInput');
    this.clearSearchBtn = document.getElementById('clearSearchBtn');
    this.segmentedBtns = document.querySelectorAll('.segmented-btn');
    this.categoryFilter = document.getElementById('categoryFilter');
    this.sortBySelect = document.getElementById('sortBySelect');
    this.clearCompletedBtn = document.getElementById('clearCompletedBtn');

    // Task List & Containers
    this.taskListEl = document.getElementById('taskList');
    this.emptyStateEl = document.getElementById('emptyState');
    this.emptyStateTitle = document.getElementById('emptyStateTitle');
    this.emptyStateDesc = document.getElementById('emptyStateDesc');

    // Modal Elements
    this.taskModal = document.getElementById('taskModal');
    this.modalTitle = document.getElementById('modalTitle');
    this.taskForm = document.getElementById('taskForm');
    this.taskIdInput = document.getElementById('taskIdInput');
    this.taskTitleInput = document.getElementById('taskTitleInput');
    this.taskDescInput = document.getElementById('taskDescInput');
    this.taskCategorySelect = document.getElementById('taskCategorySelect');
    this.taskDueDateInput = document.getElementById('taskDueDateInput');
    this.subtaskInputField = document.getElementById('subtaskInputField');
    this.addSubtaskBtn = document.getElementById('addSubtaskBtn');
    this.modalSubtaskList = document.getElementById('modalSubtaskList');
    this.closeModalBtn = document.getElementById('closeModalBtn');
    this.cancelModalBtn = document.getElementById('cancelModalBtn');

    // Toast Container
    this.toastContainer = document.getElementById('toastContainer');
  }

  init() {
    this.displayCurrentDate();
    this.loadState();
    this.applyTheme();
    this.setupEventListeners();
    this.render();
  }

  displayCurrentDate() {
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    const today = new Date();
    if (this.currentDateEl) {
      this.currentDateEl.textContent = today.toLocaleDateString('en-US', options);
    }
  }

  // LocalStorage Persistence
  loadState() {
    const savedTheme = localStorage.getItem('taskpulse_theme');
    if (savedTheme) {
      this.theme = savedTheme;
    }

    const savedTasks = localStorage.getItem('taskpulse_tasks');
    if (savedTasks) {
      try {
        this.tasks = JSON.parse(savedTasks);
      } catch (e) {
        console.error('Error parsing tasks from storage', e);
        this.tasks = [];
      }
    } else {
      // Seed default sample tasks for first-time users
      this.seedDefaultTasks();
    }
  }

  saveState() {
    localStorage.setItem('taskpulse_tasks', JSON.stringify(this.tasks));
    localStorage.setItem('taskpulse_theme', this.theme);
  }

  seedDefaultTasks() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(17, 0, 0, 0);

    this.tasks = [
      {
        id: 'task-1',
        title: '🚀 Deploy TaskPulse to GitHub Pages',
        description: 'Push source code to repository and enable GitHub Pages in repository settings.',
        category: 'Work',
        priority: 'high',
        dueDate: tomorrow.toISOString().slice(0, 16),
        completed: false,
        createdAt: new Date().toISOString(),
        subtasks: [
          { id: 'sub-1', text: 'Commit all files to git', completed: true },
          { id: 'sub-2', text: 'Push to main branch', completed: false }
        ]
      },
      {
        id: 'task-2',
        title: '🎨 Review UI Design & Micro-animations',
        description: 'Test dark mode contrast and responsive layout on mobile screens.',
        category: 'Personal',
        priority: 'medium',
        dueDate: '',
        completed: true,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        subtasks: []
      }
    ];
    this.saveState();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    this.saveState();
    this.showToast(`Switched to ${this.theme} theme`, 'info');
  }

  // Event Listeners Setup
  setupEventListeners() {
    // Theme Toggle
    this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());

    // Search Input
    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.clearSearchBtn.classList.toggle('hidden', this.searchQuery === '');
      this.render();
    });

    this.clearSearchBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchQuery = '';
      this.clearSearchBtn.classList.add('hidden');
      this.searchInput.focus();
      this.render();
    });

    // Segmented Status Buttons
    this.segmentedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.segmentedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentStatusFilter = btn.dataset.status;
        this.render();
      });
    });

    // Category Filter & Sort Select
    this.categoryFilter.addEventListener('change', (e) => {
      this.currentCategoryFilter = e.target.value;
      this.render();
    });

    this.sortBySelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.render();
    });

    // Clear Completed Tasks
    this.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());

    // Export / Import
    this.exportDataBtn.addEventListener('click', () => this.exportData());
    this.importFileInput.addEventListener('change', (e) => this.importData(e));

    // Modal Triggers
    this.openAddTaskModalBtn.addEventListener('click', () => this.openModal());
    this.emptyAddTaskBtn.addEventListener('click', () => this.openModal());
    this.closeModalBtn.addEventListener('click', () => this.closeModal());
    this.cancelModalBtn.addEventListener('click', () => this.closeModal());

    // Close modal when clicking outside backdrop
    this.taskModal.addEventListener('click', (e) => {
      if (e.target === this.taskModal) this.closeModal();
    });

    // Form Submit
    this.taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Subtask Modal Add Button
    this.addSubtaskBtn.addEventListener('click', () => this.addTempSubtask());
    this.subtaskInputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTempSubtask();
      }
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Focus search on '/'
      if (e.key === '/' && document.activeElement !== this.searchInput && !this.isModalOpen()) {
        e.preventDefault();
        this.searchInput.focus();
      }
      // Close modal on 'Escape'
      if (e.key === 'Escape' && this.isModalOpen()) {
        this.closeModal();
      }
    });
  }

  isModalOpen() {
    return !this.taskModal.classList.contains('hidden');
  }

  // Filter & Sort Core Logic
  getFilteredTasks() {
    return this.tasks.filter(task => {
      // Status Filter
      if (this.currentStatusFilter === 'active' && task.completed) return false;
      if (this.currentStatusFilter === 'completed' && !task.completed) return false;

      // Category Filter
      if (this.currentCategoryFilter !== 'all' && task.category !== this.currentCategoryFilter) return false;

      // Search Query
      if (this.searchQuery !== '') {
        const titleMatch = task.title.toLowerCase().includes(this.searchQuery);
        const descMatch = task.description ? task.description.toLowerCase().includes(this.searchQuery) : false;
        const categoryMatch = task.category.toLowerCase().includes(this.searchQuery);
        if (!titleMatch && !descMatch && !categoryMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sorting
      switch (this.currentSort) {
        case 'createdAt-desc':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'createdAt-asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'dueDate-asc':
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'priority-desc':
          const priorityWeight = { high: 3, medium: 2, low: 1 };
          return priorityWeight[b.priority] - priorityWeight[a.priority];
        case 'title-asc':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }

  // Render Core UI
  render() {
    const filteredTasks = this.getFilteredTasks();
    this.renderTaskList(filteredTasks);
    this.updateStats();
  }

  renderTaskList(filteredTasks) {
    this.taskListEl.innerHTML = '';

    if (filteredTasks.length === 0) {
      this.emptyStateEl.classList.remove('hidden');
      if (this.searchQuery !== '') {
        this.emptyStateTitle.textContent = 'No matching tasks found';
        this.emptyStateDesc.textContent = `No tasks matched your search query "${this.searchQuery}". Try clearing filters.`;
      } else if (this.currentStatusFilter !== 'all') {
        this.emptyStateTitle.textContent = `No ${this.currentStatusFilter} tasks`;
        this.emptyStateDesc.textContent = `You currently have zero tasks in the ${this.currentStatusFilter} filter.`;
      } else {
        this.emptyStateTitle.textContent = 'All caught up!';
        this.emptyStateDesc.textContent = 'No tasks found. Click "New Task" to create one and boost your productivity.';
      }
      return;
    }

    this.emptyStateEl.classList.add('hidden');

    filteredTasks.forEach(task => {
      const taskCard = this.createTaskCardElement(task);
      this.taskListEl.appendChild(taskCard);
    });
  }

  createTaskCardElement(task) {
    const card = document.createElement('div');
    card.className = `task-item ${task.completed ? 'completed' : ''}`;
    card.dataset.id = task.id;

    // Check overdue
    let isOverdue = false;
    let formattedDueDate = '';
    if (task.dueDate) {
      const dueTime = new Date(task.dueDate);
      const now = new Date();
      if (!task.completed && dueTime < now) {
        isOverdue = true;
      }
      formattedDueDate = dueTime.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    const categoryIconMap = {
      Work: '💼', Personal: '👤', Health: '💪', Finance: '💰', Shopping: '🛒', Education: '📚'
    };

    const subtasksHtml = task.subtasks && task.subtasks.length > 0 ? `
      <div class="task-subtasks">
        ${task.subtasks.map(sub => `
          <label class="subtask-item ${sub.completed ? 'completed' : ''}">
            <input type="checkbox" class="subtask-checkbox" data-taskid="${task.id}" data-subid="${sub.id}" ${sub.completed ? 'checked' : ''}>
            <span>${this.escapeHtml(sub.text)}</span>
          </label>
        `).join('')}
      </div>
    ` : '';

    card.innerHTML = `
      <div class="task-main-row">
        <label class="custom-checkbox" title="Mark Task Complete">
          <input type="checkbox" class="task-toggle-cb" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
          <span class="checkmark"></span>
        </label>
        
        <div class="task-content">
          <div class="task-header-meta">
            <span class="badge badge-${task.priority}">${task.priority}</span>
            <span class="badge badge-category">${categoryIconMap[task.category] || '📌'} ${task.category}</span>
            ${formattedDueDate ? `
              <span class="due-date-tag ${isOverdue ? 'overdue' : ''}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                ${isOverdue ? 'Overdue: ' : ''}${formattedDueDate}
              </span>
            ` : ''}
          </div>

          <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
          ${task.description ? `<p class="task-desc">${this.escapeHtml(task.description)}</p>` : ''}
          ${subtasksHtml}
        </div>

        <div class="task-actions">
          <button class="action-btn edit-btn" data-id="${task.id}" title="Edit Task">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
          </button>
          <button class="action-btn delete-btn" data-id="${task.id}" title="Delete Task">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Add inline event handlers
    const toggleCb = card.querySelector('.task-toggle-cb');
    toggleCb.addEventListener('change', () => this.toggleTaskComplete(task.id));

    const editBtn = card.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => this.openModal(task.id));

    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

    const subCheckboxes = card.querySelectorAll('.subtask-checkbox');
    subCheckboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const taskId = e.target.dataset.taskid;
        const subId = e.target.dataset.subid;
        this.toggleSubtask(taskId, subId);
      });
    });

    return card;
  }

  updateStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    const active = total - completed;
    
    const now = new Date();
    const overdue = this.tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now).length;

    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    if (this.completionPercentEl) this.completionPercentEl.textContent = `${percent}%`;
    if (this.progressBarFillEl) this.progressBarFillEl.style.width = `${percent}%`;

    if (this.statTotalEl) this.statTotalEl.textContent = total;
    if (this.statActiveEl) this.statActiveEl.textContent = active;
    if (this.statCompletedEl) this.statCompletedEl.textContent = completed;
    if (this.statOverdueEl) this.statOverdueEl.textContent = overdue;
  }

  // Task Actions (CRUD)
  toggleTaskComplete(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.saveState();
      this.render();
      const statusText = task.completed ? 'completed! 🎉' : 'marked active';
      this.showToast(`Task ${statusText}`, 'success');
    }
  }

  toggleSubtask(taskId, subtaskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.subtasks) {
      const sub = task.subtasks.find(s => s.id === subtaskId);
      if (sub) {
        sub.completed = !sub.completed;
        this.saveState();
        this.render();
      }
    }
  }

  deleteTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.saveState();
    this.render();
    this.showToast('Task deleted successfully', 'danger');
  }

  clearCompleted() {
    const initialCount = this.tasks.length;
    this.tasks = this.tasks.filter(t => !t.completed);
    const removedCount = initialCount - this.tasks.length;
    if (removedCount > 0) {
      this.saveState();
      this.render();
      this.showToast(`Cleared ${removedCount} completed task(s)`, 'info');
    } else {
      this.showToast('No completed tasks to clear', 'info');
    }
  }

  // Modal Handlers
  openModal(taskId = null) {
    this.editingTaskId = taskId;
    this.tempSubtasks = [];

    if (taskId) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        this.modalTitle.textContent = 'Edit Task';
        this.taskIdInput.value = task.id;
        this.taskTitleInput.value = task.title;
        this.taskDescInput.value = task.description || '';
        this.taskCategorySelect.value = task.category;
        this.taskDueDateInput.value = task.dueDate || '';
        
        // Priority radio selection
        const radio = this.taskForm.querySelector(`input[name="priority"][value="${task.priority}"]`);
        if (radio) radio.checked = true;

        if (task.subtasks) {
          this.tempSubtasks = [...task.subtasks];
        }
      }
    } else {
      this.modalTitle.textContent = 'Add New Task';
      this.taskForm.reset();
      this.taskIdInput.value = '';
    }

    this.renderTempSubtasks();
    this.taskModal.classList.remove('hidden');
    this.taskModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => this.taskTitleInput.focus(), 100);
  }

  closeModal() {
    this.taskModal.classList.add('hidden');
    this.taskModal.setAttribute('aria-hidden', 'true');
    this.taskForm.reset();
    this.editingTaskId = null;
    this.tempSubtasks = [];
  }

  addTempSubtask() {
    const text = this.subtaskInputField.value.trim();
    if (text) {
      this.tempSubtasks.push({
        id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        text: text,
        completed: false
      });
      this.subtaskInputField.value = '';
      this.renderTempSubtasks();
    }
  }

  removeTempSubtask(subId) {
    this.tempSubtasks = this.tempSubtasks.filter(s => s.id !== subId);
    this.renderTempSubtasks();
  }

  renderTempSubtasks() {
    this.modalSubtaskList.innerHTML = '';
    this.tempSubtasks.forEach(sub => {
      const li = document.createElement('li');
      li.className = 'modal-subtask-item';
      li.innerHTML = `
        <span>${this.escapeHtml(sub.text)}</span>
        <button type="button" data-id="${sub.id}">✕</button>
      `;
      li.querySelector('button').addEventListener('click', () => this.removeTempSubtask(sub.id));
      this.modalSubtaskList.appendChild(li);
    });
  }

  handleFormSubmit(e) {
    e.preventDefault();
    const title = this.taskTitleInput.value.trim();
    if (!title) return;

    const description = this.taskDescInput.value.trim();
    const category = this.taskCategorySelect.value;
    const dueDate = this.taskDueDateInput.value;
    const priorityRadio = this.taskForm.querySelector('input[name="priority"]:checked');
    const priority = priorityRadio ? priorityRadio.value : 'low';

    if (this.editingTaskId) {
      // Edit existing
      const taskIndex = this.tasks.findIndex(t => t.id === this.editingTaskId);
      if (taskIndex !== -1) {
        this.tasks[taskIndex] = {
          ...this.tasks[taskIndex],
          title,
          description,
          category,
          dueDate,
          priority,
          subtasks: this.tempSubtasks
        };
        this.showToast('Task updated successfully', 'success');
      }
    } else {
      // Create new
      const newTask = {
        id: `task-${Date.now()}`,
        title,
        description,
        category,
        dueDate,
        priority,
        completed: false,
        createdAt: new Date().toISOString(),
        subtasks: this.tempSubtasks
      };
      this.tasks.unshift(newTask);
      this.showToast('New task added!', 'success');
    }

    this.saveState();
    this.render();
    this.closeModal();
  }

  // Backup & Import Data
  exportData() {
    const dataStr = JSON.stringify(this.tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `TaskPulse_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showToast('Exported task backup JSON file', 'success');
  }

  importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedTasks = JSON.parse(event.target.result);
        if (Array.isArray(importedTasks)) {
          this.tasks = importedTasks;
          this.saveState();
          this.render();
          this.showToast('Tasks imported successfully!', 'success');
        } else {
          this.showToast('Invalid JSON file format', 'danger');
        }
      } catch (err) {
        this.showToast('Failed to parse JSON file', 'danger');
      }
      this.importFileInput.value = '';
    };
    reader.readAsText(file);
  }

  // Toast Notification System
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconSvg = type === 'success' ? `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    ` : type === 'danger' ? `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
    ` : `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
    `;

    toast.innerHTML = `${iconSvg}<span>${this.escapeHtml(message)}</span>`;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  // Utility to prevent XSS
  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }
}

// Initialize Application when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new TaskPulseApp();
});
