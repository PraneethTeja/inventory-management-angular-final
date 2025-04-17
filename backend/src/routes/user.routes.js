const express = require('express');
const router = express.Router();
const { authenticateUser, isAdmin } = require('../middleware/auth.middleware');

// Import user controller
// Note: We'll use a simplified preferences endpoint since we already have auth endpoints
const userController = {
  updatePreferences: async (req, res) => {
    try {
      const { preferences } = req.body;

      // Update user preferences
      const user = req.user;
      user.preferences = {
        ...user.preferences,
        ...preferences
      };

      await user.save();

      res.json({
        message: 'Preferences updated successfully',
        preferences: user.preferences
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  // Admin only - get all users (simplified)
  getAllUsers: async (req, res) => {
    try {
      const User = require('../models/user.model');
      const users = await User.find({}).select('-password');

      res.json(users);
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
};

// Routes
router.put('/preferences', authenticateUser, userController.updatePreferences);
router.get('/', authenticateUser, isAdmin, userController.getAllUsers);

module.exports = router; 
