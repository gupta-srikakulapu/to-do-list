/**
 * TaskPulse — Modern Task & Workflow Management Application
 * Pure Vanilla JavaScript ES6+ Full-Stack Integration
 */

class TaskPulseApp {
  constructor() {
    // API Configuration & Auth State
    this.apiBase = window.location.origin.includes(':5000') ? '' : 'http://localhost:5000';
    this.token = localStorage.getItem('taskpulse_token') || null;
    this.user = null;

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
    // Start Application
    this.init();
  }

  initElements() {
    // Header & Brand
    this.currentDateEl = document.getElementById('currentDate');
    this.themeToggleBtn = document.getElementById('themeToggleBtn');
    this.exportDataBtn = document.getElementById('exportDataBtn');
    this.importFileInput = document.getElementById('importFileInput');
    this.openAddTaskModalBtn = document.getElementById('openAddTaskModalBtn');
    this.emptyAddTaskBtn = document.getElementById('emptyAddTaskBtn');

    // User Profile & Authentication Header Elements
    this.userProfileSection = document.getElementById('userProfileSection');
    this.userAvatarBadge = document.getElementById('userAvatarBadge');
    this.userAvatarInitial = document.getElementById('userAvatarInitial');
    this.userDisplayName = document.getElementById('userDisplayName');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.openAuthModalBtn = document.getElementById('openAuthModalBtn');
    this.welcomeUserName = document.getElementById('welcomeUserName');

    // Stats & Progress
    this.completionPercentEl = document.getElementById('completionPercent');
    this.progressBarFillEl = document.getElementById('progressBarFill');
    this.statTotalEl = document.getElementById('statTotal');
    this.statActiveEl = document.getElementById('statActive');
    this.statCompletedEl = document.getElementById('statCompleted');
    this.statOverdueEl = document.getElementById('statOverdue');

    // Controls: Search & Filters
    this.searchInput = document.getElementById('searchInput');
    this.clearSearchBtn = document.getElementById('clearSearchBtn');
    this.segmentedBtns = document.querySelectorAll('.segmented-btn');
    this.categoryFilter = document.getElementById('categoryFilter');
    this.sortBySelect = document.getElementById('sortBySelect');
    this.clearCompletedBtn = document.getElementById('clearCompletedBtn');

    // Task List & Empty State
    this.taskListEl = document.getElementById('taskList');
    this.emptyStateEl = document.getElementById('emptyState');
    this.emptyStateTitle = document.getElementById('emptyStateTitle');
    this.emptyStateDesc = document.getElementById('emptyStateDesc');

    // Task Modal Elements
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

    // Auth Modal Elements
    this.authModal = document.getElementById('authModal');
    this.authModalTitle = document.getElementById('authModalTitle');
    this.authModalSubtitle = document.getElementById('authModalSubtitle');
    this.authAlert = document.getElementById('authAlert');

    this.loginForm = document.getElementById('loginForm');
    this.loginEmail = document.getElementById('loginEmail');
    this.loginPassword = document.getElementById('loginPassword');
    this.switchToRegisterBtn = document.getElementById('switchToRegisterBtn');

    this.registerForm = document.getElementById('registerForm');
    this.registerName = document.getElementById('registerName');
    this.registerEmail = document.getElementById('registerEmail');
    this.registerPassword = document.getElementById('registerPassword');
    this.registerConfirmPassword = document.getElementById('registerConfirmPassword');
    this.switchToLoginBtn = document.getElementById('switchToLoginBtn');

    // Toast Container
    this.toastContainer = document.getElementById('toastContainer');
  }

  async init() {
    this.displayCurrentDate();
    this.loadTheme();
    this.setupEventListeners();

    // Check user authentication on startup
    await this.checkAuthSession();
  }

  displayCurrentDate() {
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    const today = new Date();
    if (this.currentDateEl) {
      this.currentDateEl.textContent = today.toLocaleDateString('en-US', options);
    }
  }

  // Theme Management
  loadTheme() {
    const savedTheme = localStorage.getItem('taskpulse_theme');
    if (savedTheme) {
      this.theme = savedTheme;
    }
    this.applyTheme();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
    localStorage.setItem('taskpulse_theme', this.theme);
    this.showToast(`Switched to ${this.theme} theme`, 'info');
  }

  // =========================================================================
  // API Request Helper
  // =========================================================================
  async apiRequest(endpoint, method = 'GET', body = null) {
    const url = `${this.apiBase}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options = {
      method,
      headers,
      credentials: 'include' // Send and receive HTTP-only cookies
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(url, options);
      const data = await res.json();

      if (!res.ok) {
        // If 401 Unauthorized, reset user session if not currently logging in/registering
        if (res.status === 401 && !endpoint.startsWith('/api/auth/login') && !endpoint.startsWith('/api/auth/register')) {
          this.handleUnauthenticated();
        }
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  // =========================================================================
  // Authentication & Session Management
  // =========================================================================
  async checkAuthSession() {
    try {
      const data = await this.apiRequest('/api/auth/me');
      if (data && data.success && data.data) {
        this.setUser(data.data);
        await this.fetchTasks();
      } else {
        this.handleUnauthenticated();
      }
    } catch (err) {
      this.handleUnauthenticated();
    }
  }

  setUser(userData) {
    this.user = userData;
    this.updateUserUI();
    this.closeAuthModal();
  }

  handleUnauthenticated() {
    this.user = null;
    this.token = null;
    localStorage.removeItem('taskpulse_token');
    this.tasks = [];
    this.updateUserUI();
    this.render();
    this.openAuthModal();
  }

  updateUserUI() {
    if (this.user) {
      if (this.userProfileSection) this.userProfileSection.classList.remove('hidden');
      if (this.openAuthModalBtn) this.openAuthModalBtn.classList.add('hidden');
      if (this.userDisplayName) this.userDisplayName.textContent = this.user.name;
      if (this.welcomeUserName) this.welcomeUserName.textContent = this.user.name;
      if (this.userAvatarInitial) this.userAvatarInitial.textContent = this.user.name.charAt(0).toUpperCase();
    } else {
      if (this.userProfileSection) this.userProfileSection.classList.add('hidden');
      if (this.openAuthModalBtn) this.openAuthModalBtn.classList.remove('hidden');
      if (this.welcomeUserName) this.welcomeUserName.textContent = 'Guest';
    }
  }

  openAuthModal(isRegister = false) {
    this.clearAuthAlert();
    if (isRegister) {
      this.showRegisterForm();
    } else {
      this.showLoginForm();
    }
    this.authModal.classList.remove('hidden');
    this.authModal.setAttribute('aria-hidden', 'false');
  }

  closeAuthModal() {
    this.authModal.classList.add('hidden');
    this.authModal.setAttribute('aria-hidden', 'true');
    this.clearAuthAlert();
  }

  showLoginForm() {
    this.loginForm.classList.remove('hidden');
    this.registerForm.classList.add('hidden');
    this.authModalTitle.textContent = 'Sign In to TaskPulse';
    this.authModalSubtitle.textContent = 'Manage and sync your tasks securely in MongoDB.';
    this.clearAuthAlert();
    setTimeout(() => this.loginEmail.focus(), 100);
  }

  showRegisterForm() {
    this.registerForm.classList.remove('hidden');
    this.loginForm.classList.add('hidden');
    this.authModalTitle.textContent = 'Create an Account';
    this.authModalSubtitle.textContent = 'Join TaskPulse to keep your workflow synchronized.';
    this.clearAuthAlert();
    setTimeout(() => this.registerName.focus(), 100);
  }

  showAuthAlert(message) {
    if (this.authAlert) {
      this.authAlert.textContent = message;
      this.authAlert.classList.remove('hidden');
    }
  }

  clearAuthAlert() {
    if (this.authAlert) {
      this.authAlert.textContent = '';
      this.authAlert.classList.add('hidden');
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = this.loginEmail.value.trim();
    const password = this.loginPassword.value;

    if (!email || !password) {
      this.showAuthAlert('Please enter both email and password.');
      return;
    }

    try {
      const data = await this.apiRequest('/api/auth/login', 'POST', { email, password });
      if (data.token) {
        this.token = data.token;
        localStorage.setItem('taskpulse_token', data.token);
      }
      this.setUser(data.data);
      this.loginForm.reset();
      this.showToast(`Welcome back, ${data.data.name}! 👋`, 'success');
      await this.fetchTasks();
    } catch (err) {
      this.showAuthAlert(err.message || 'Login failed');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const name = this.registerName.value.trim();
    const email = this.registerEmail.value.trim();
    const password = this.registerPassword.value;
    const confirmPassword = this.registerConfirmPassword.value;

    if (!name || !email || !password) {
      this.showAuthAlert('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      this.showAuthAlert('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      this.showAuthAlert('Password must be at least 6 characters long.');
      return;
    }

    try {
      const data = await this.apiRequest('/api/auth/register', 'POST', {
        name,
        email,
        password,
        confirmPassword
      });
      if (data.token) {
        this.token = data.token;
        localStorage.setItem('taskpulse_token', data.token);
      }
      this.setUser(data.data);
      this.registerForm.reset();
      this.showToast(`Account created! Welcome, ${data.data.name} 🎉`, 'success');
      await this.fetchTasks();
    } catch (err) {
      this.showAuthAlert(err.message || 'Registration failed');
    }
  }

  async handleLogout() {
    try {
      await this.apiRequest('/api/auth/logout', 'POST');
    } catch (err) {
      console.warn('Logout API error:', err);
    }
    this.handleUnauthenticated();
    this.showToast('You have been logged out.', 'info');
  }

  // =========================================================================
  // Task Management (REST API Integration)
  // =========================================================================
  async fetchTasks() {
    if (!this.user) return;

    try {
      const data = await this.apiRequest('/api/tasks');
      if (data && data.success && Array.isArray(data.data)) {
        this.tasks = data.data.map(task => ({
          ...task,
          id: task._id || task.id,
          priority: (task.priority || 'LOW').toLowerCase()
        }));
        this.render();
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      this.showToast('Failed to load tasks from server', 'danger');
    }
  }

  async toggleTaskComplete(taskId) {
    try {
      const data = await this.apiRequest(`/api/tasks/${taskId}/complete`, 'PATCH');
      if (data && data.success) {
        const updatedTask = data.data;
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
          this.tasks[index] = {
            ...updatedTask,
            id: updatedTask._id || updatedTask.id,
            priority: (updatedTask.priority || 'LOW').toLowerCase()
          };
          this.render();
          const statusText = updatedTask.completed ? 'completed! 🎉' : 'marked active';
          this.showToast(`Task ${statusText}`, 'success');
        }
      }
    } catch (err) {
      this.showToast(err.message || 'Error updating task status', 'danger');
    }
  }

  async toggleSubtask(taskId, subtaskId) {
    try {
      const data = await this.apiRequest(`/api/tasks/${taskId}/subtasks/${subtaskId}`, 'PATCH');
      if (data && data.success) {
        const updatedTask = data.data;
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
          this.tasks[index] = {
            ...updatedTask,
            id: updatedTask._id || updatedTask.id,
            priority: (updatedTask.priority || 'LOW').toLowerCase()
          };
          this.render();
        }
      }
    } catch (err) {
      this.showToast(err.message || 'Error updating subtask', 'danger');
    }
  }

  async deleteTask(taskId) {
    try {
      const data = await this.apiRequest(`/api/tasks/${taskId}`, 'DELETE');
      if (data && data.success) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.render();
        this.showToast('Task deleted successfully', 'danger');
      }
    } catch (err) {
      this.showToast(err.message || 'Failed to delete task', 'danger');
    }
  }

  async clearCompleted() {
    const completedCount = this.tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
      this.showToast('No completed tasks to clear', 'info');
      return;
    }

    try {
      const data = await this.apiRequest('/api/tasks/clear-completed', 'DELETE');
      if (data && data.success) {
        this.tasks = this.tasks.filter(t => !t.completed);
        this.render();
        this.showToast(`Cleared ${data.count || completedCount} completed task(s)`, 'info');
      }
    } catch (err) {
      this.showToast(err.message || 'Failed to clear completed tasks', 'danger');
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    const title = this.taskTitleInput.value.trim();
    if (!title) return;

    const description = this.taskDescInput.value.trim();
    const category = this.taskCategorySelect.value;
    const dueDate = this.taskDueDateInput.value;
    const priorityRadio = this.taskForm.querySelector('input[name="priority"]:checked');
    const priority = priorityRadio ? priorityRadio.value.toUpperCase() : 'LOW';

    const payload = {
      title,
      description,
      category,
      dueDate: dueDate || null,
      priority,
      subtasks: this.tempSubtasks
    };

    try {
      if (this.editingTaskId) {
        // Edit existing task
        const data = await this.apiRequest(`/api/tasks/${this.editingTaskId}`, 'PUT', payload);
        if (data && data.success) {
          const updated = data.data;
          const index = this.tasks.findIndex(t => t.id === this.editingTaskId);
          if (index !== -1) {
            this.tasks[index] = {
              ...updated,
              id: updated._id || updated.id,
              priority: (updated.priority || 'LOW').toLowerCase()
            };
          }
          this.showToast('Task updated successfully', 'success');
        }
      } else {
        // Create new task
        const data = await this.apiRequest('/api/tasks', 'POST', payload);
        if (data && data.success) {
          const created = data.data;
          this.tasks.unshift({
            ...created,
            id: created._id || created.id,
            priority: (created.priority || 'LOW').toLowerCase()
          });
          this.showToast('New task added!', 'success');
        }
      }

      this.render();
      this.closeModal();
    } catch (err) {
      this.showToast(err.message || 'Failed to save task', 'danger');
    }
  }

  // =========================================================================
  // Filtering, Sorting & UI Rendering
  // =========================================================================
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
          return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }

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
        ${task.subtasks.map(sub => {
          const subId = sub._id || sub.id;
          return `
            <label class="subtask-item ${sub.completed ? 'completed' : ''}">
              <input type="checkbox" class="subtask-checkbox" data-taskid="${task.id}" data-subid="${subId}" ${sub.completed ? 'checked' : ''}>
              <span>${this.escapeHtml(sub.text)}</span>
            </label>
          `;
        }).join('')}
      </div>
    ` : '';

    const priorityBadge = (task.priority || 'low').toLowerCase();

    card.innerHTML = `
      <div class="task-main-row">
        <label class="custom-checkbox" title="Mark Task Complete">
          <input type="checkbox" class="task-toggle-cb" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
          <span class="checkmark"></span>
        </label>
        
        <div class="task-content">
          <div class="task-header-meta">
            <span class="badge badge-${priorityBadge}">${task.priority.toUpperCase()}</span>
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

    // Event listeners
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

  // =========================================================================
  // Task Modal Handlers
  // =========================================================================
  openModal(taskId = null) {
    if (!this.user) {
      this.openAuthModal();
      return;
    }

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
        
        // Format ISO date to datetime-local input format (YYYY-MM-DDTHH:mm)
        if (task.dueDate) {
          const d = new Date(task.dueDate);
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          this.taskDueDateInput.value = localIso;
        } else {
          this.taskDueDateInput.value = '';
        }

        const priorityVal = (task.priority || 'low').toLowerCase();
        const radio = this.taskForm.querySelector(`input[name="priority"][value="${priorityVal}"]`);
        if (radio) radio.checked = true;

        if (task.subtasks) {
          this.tempSubtasks = task.subtasks.map(s => ({
            id: s._id || s.id,
            text: s.text,
            completed: s.completed
          }));
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

  isModalOpen() {
    return !this.taskModal.classList.contains('hidden') || !this.authModal.classList.contains('hidden');
  }

  // =========================================================================
  // Export & Import
  // =========================================================================
  exportData() {
    if (!this.user) {
      this.openAuthModal();
      return;
    }

    const dataStr = JSON.stringify(this.tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `TaskPulse_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showToast('Exported tasks to JSON backup file', 'success');
  }

  async importData(e) {
    if (!this.user) {
      this.openAuthModal();
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedTasks = JSON.parse(event.target.result);
        if (Array.isArray(importedTasks)) {
          let importedCount = 0;
          for (const item of importedTasks) {
            if (item.title) {
              await this.apiRequest('/api/tasks', 'POST', {
                title: item.title,
                description: item.description || '',
                category: item.category || 'Personal',
                priority: (item.priority || 'LOW').toUpperCase(),
                dueDate: item.dueDate || null,
                subtasks: item.subtasks || []
              });
              importedCount++;
            }
          }
          await this.fetchTasks();
          this.showToast(`Imported ${importedCount} task(s) to MongoDB!`, 'success');
        } else {
          this.showToast('Invalid JSON file format', 'danger');
        }
      } catch (err) {
        this.showToast('Failed to parse or import JSON file', 'danger');
      }
      this.importFileInput.value = '';
    };
    reader.readAsText(file);
  }

  // =========================================================================
  // Event Listeners Setup
  // =========================================================================
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

    // Task Modal Triggers
    this.openAddTaskModalBtn.addEventListener('click', () => this.openModal());
    this.emptyAddTaskBtn.addEventListener('click', () => this.openModal());
    this.closeModalBtn.addEventListener('click', () => this.closeModal());
    this.cancelModalBtn.addEventListener('click', () => this.closeModal());

    this.taskModal.addEventListener('click', (e) => {
      if (e.target === this.taskModal) this.closeModal();
    });

    // Task Form Submit
    this.taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // Subtask Controls
    this.addSubtaskBtn.addEventListener('click', () => this.addTempSubtask());
    this.subtaskInputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTempSubtask();
      }
    });

    // Auth Form Listeners
    if (this.loginForm) this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    if (this.registerForm) this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    if (this.switchToRegisterBtn) this.switchToRegisterBtn.addEventListener('click', () => this.showRegisterForm());
    if (this.switchToLoginBtn) this.switchToLoginBtn.addEventListener('click', () => this.showLoginForm());
    if (this.logoutBtn) this.logoutBtn.addEventListener('click', () => this.handleLogout());
    if (this.openAuthModalBtn) this.openAuthModalBtn.addEventListener('click', () => this.openAuthModal());

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== this.searchInput && !this.isModalOpen()) {
        e.preventDefault();
        this.searchInput.focus();
      }
      if (e.key === 'Escape' && !this.taskModal.classList.contains('hidden')) {
        this.closeModal();
      }
    });
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
