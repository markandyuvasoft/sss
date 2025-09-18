const Notification = require('../models/Notification');
const { sendEmail } = require('../services/emailService');
const User = require('../models/User'); // Assuming you have a User model to fetch event managers.

const sendNotification = async (req, res) => {
  const { recipient, message, postId } = req.body;

  try {
    // Create and save a notification in the database.
    const notification = new Notification({
      recipient,
      message,
      type: 'email',
    });
    await notification.save();

    // Fetch all event managers.
    const eventManagers = await User.find({ role: 'eventManager' });

    // Send email to the customer.
    const customerEmailStatus = await sendEmail(recipient, message);

    // Send emails to all event managers.
    const managerEmails = eventManagers.map((manager) => manager.email);
    const managerEmailPromises = managerEmails.map((email) =>
      sendEmail(email, message)
    );
    const managerEmailStatuses = await Promise.all(managerEmailPromises);

    // Update notification status based on results.
    notification.status =
      customerEmailStatus && managerEmailStatuses.every((status) => status)
        ? 'sent'
        : 'failed';
    await notification.save();

    res.status(200).json({ message: 'Notification sent successfully', notification });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send notification', error: err.message });
  }
};

// Get user's notifications
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status, type } = req.query;

    const filter = { recipient: userId };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(filter)
      .populate('recipient', 'fullName email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
    });
  }
};




// Get notification by ID
const getNotificationById = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
    }).populate('recipient', 'fullName email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification',
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { status: 'read' },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { recipient: userId, status: { $ne: 'read' } },
      { status: 'read' }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
    });
  }
};


module.exports = { sendNotification, getUserNotifications, getNotificationById, markAsRead, markAllAsRead, deleteNotification };
