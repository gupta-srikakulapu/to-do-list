const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  toggleTaskComplete,
  deleteTask,
  clearCompletedTasks,
  toggleSubtask
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

// All task routes are protected
router.use(protect);

// Specific routes (defined before :id parameter)
router.get('/', getTasks);
router.post('/', createTask);
router.delete('/clear-completed', clearCompletedTasks);

// Parameterized task routes
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/complete', toggleTaskComplete);
router.patch('/:id/subtasks/:subtaskId', toggleSubtask);

module.exports = router;
