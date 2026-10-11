const mongoose = require('mongoose');
const Task = require('../models/Task');

/**
 * @desc    Get all tasks for authenticated user (with optional search, filter & sort)
 * @route   GET /api/tasks
 * @access  Private
 */
const getTasks = async (req, res, next) => {
  try {
    const { status, category, priority, search, sortBy } = req.query;

    // Base query scoped strictly to the authenticated user
    const query = { userId: req.user._id };

    // Status filter
    if (status === 'completed') {
      query.completed = true;
    } else if (status === 'active') {
      query.completed = false;
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      query.priority = priority.toUpperCase();
    }

    // Search query (title, description, or category)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Sorting
    let sortOptions = { createdAt: -1 }; // Default: Newest first
    if (sortBy === 'createdAt-asc') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'createdAt-desc') {
      sortOptions = { createdAt: -1 };
    } else if (sortBy === 'dueDate-asc') {
      sortOptions = { dueDate: 1 };
    } else if (sortBy === 'dueDate-desc') {
      sortOptions = { dueDate: -1 };
    } else if (sortBy === 'title-asc') {
      sortOptions = { title: 1 };
    } else if (sortBy === 'title-desc') {
      sortOptions = { title: -1 };
    } else if (sortBy === 'priority-desc') {
      // Handled via collation or fetched and sorted if needed
      sortOptions = { priority: -1, createdAt: -1 };
    }

    const tasks = await Task.find(query).sort(sortOptions);

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/tasks/:id
 * @access  Private
 */
const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format'
      });
    }

    // Find task scoped strictly to the authenticated user
    const task = await Task.findOne({ _id: id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new task
 * @route   POST /api/tasks
 * @access  Private
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, priority, category, dueDate, tags, subtasks } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required'
      });
    }

    // Validate priority if provided
    let normalizedPriority = 'LOW';
    if (priority) {
      const upper = priority.toUpperCase();
      if (['LOW', 'MEDIUM', 'HIGH'].includes(upper)) {
        normalizedPriority = upper;
      }
    }

    // Prepare task payload with authenticated user ID
    const taskData = {
      userId: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: normalizedPriority,
      category: category && category.trim() ? category.trim() : 'Personal',
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: Array.isArray(tags) ? tags : [],
      subtasks: Array.isArray(subtasks)
        ? subtasks.map((st) => ({
            text: typeof st === 'string' ? st : st.text,
            completed: typeof st === 'object' && st.completed !== undefined ? Boolean(st.completed) : false
          }))
        : []
    };

    const task = await Task.create(taskData);

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing task
 * @route   PUT /api/tasks/:id
 * @access  Private
 */
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format'
      });
    }

    const task = await Task.findOne({ _id: id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const { title, description, priority, category, dueDate, completed, tags, subtasks } = req.body;

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Task title cannot be empty'
        });
      }
      task.title = title.trim();
    }

    if (description !== undefined) {
      task.description = description.trim();
    }

    if (priority !== undefined) {
      const upper = priority.toUpperCase();
      if (['LOW', 'MEDIUM', 'HIGH'].includes(upper)) {
        task.priority = upper;
      }
    }

    if (category !== undefined) {
      task.category = category.trim();
    }

    if (dueDate !== undefined) {
      task.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (completed !== undefined) {
      task.completed = Boolean(completed);
    }

    if (tags !== undefined && Array.isArray(tags)) {
      task.tags = tags;
    }

    if (subtasks !== undefined && Array.isArray(subtasks)) {
      task.subtasks = subtasks.map((st) => ({
        text: typeof st === 'string' ? st : st.text,
        completed: typeof st === 'object' && st.completed !== undefined ? Boolean(st.completed) : false
      }));
    }

    const updatedTask = await task.save();

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle or update completion status of a task
 * @route   PATCH /api/tasks/:id/complete
 * @access  Private
 */
const toggleTaskComplete = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format'
      });
    }

    const task = await Task.findOne({ _id: id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (req.body.completed !== undefined) {
      task.completed = Boolean(req.body.completed);
    } else {
      task.completed = !task.completed;
    }

    const updatedTask = await task.save();

    return res.status(200).json({
      success: true,
      message: `Task marked as ${updatedTask.completed ? 'completed' : 'pending'}`,
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/tasks/:id
 * @access  Private
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format'
      });
    }

    const task = await Task.findOne({ _id: id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await task.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear all completed tasks for authenticated user
 * @route   DELETE /api/tasks/clear-completed
 * @access  Private
 */
const clearCompletedTasks = async (req, res, next) => {
  try {
    const result = await Task.deleteMany({
      userId: req.user._id,
      completed: true
    });

    return res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} completed task(s)`,
      count: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle a specific subtask completion state
 * @route   PATCH /api/tasks/:id/subtasks/:subtaskId
 * @access  Private
 */
const toggleSubtask = async (req, res, next) => {
  try {
    const { id, subtaskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID format'
      });
    }

    const task = await Task.findOne({ _id: id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: 'Subtask not found'
      });
    }

    if (req.body.completed !== undefined) {
      subtask.completed = Boolean(req.body.completed);
    } else {
      subtask.completed = !subtask.completed;
    }

    await task.save();

    return res.status(200).json({
      success: true,
      message: 'Subtask updated',
      data: task
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  toggleTaskComplete,
  deleteTask,
  clearCompletedTasks,
  toggleSubtask
};
