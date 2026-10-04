const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Subtask text is required'],
      trim: true
    },
    completed: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must belong to a user'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    completed: {
      type: Boolean,
      default: false
    },
    priority: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH'],
        message: 'Priority must be LOW, MEDIUM, or HIGH'
      },
      default: 'LOW',
      uppercase: true
    },
    category: {
      type: String,
      trim: true,
      default: 'Personal'
    },
    dueDate: {
      type: Date,
      default: null
    },
    tags: [
      {
        type: String,
        trim: true
      }
    ],
    subtasks: [subtaskSchema]
  },
  {
    timestamps: true
  }
);

// Compound indexes for fast user task filtering and sorting
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, completed: 1 });

module.exports = mongoose.model('Task', taskSchema);
