const express = require('express');
const { sendNotification, getUserNotifications, getNotificationById, markAsRead, markAllAsRead, deleteNotification } = require('../controllers/notificationController');
const protect = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/send', protect, sendNotification); // Send notifications

// Get user's notifications
router.get('/', protect(), getUserNotifications);

// Get notification by ID
router.get('/:notificationId', protect(), getNotificationById);

// Mark notification as read
router.patch('/:notificationId/read', protect(), markAsRead);

// Mark all notifications as read
router.patch('/mark-all-read', protect(), markAllAsRead);

// Delete notification
router.delete('/:notificationId', protect(), deleteNotification);


module.exports = router;
