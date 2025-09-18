const PrivateEvent = require('../models/privateEvent');
const User = require('../models/User');
const { sendNotification } = require('../services/notificationService');
const templates = require('../templates/index');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Utility function to handle errors
const handleError = (res, status, message, error) => {
  console.error(`${message}:`, error.message);
  return res.status(status).json({ status: 'error', message: error.message });
};

// Create a private event
const createPrivateEvent = async (req, res) => {
  try {
    const { email, eventName, eventType, location, guests, startDate, endDate, budget, currency, requirements, additionalInfo, fullName, phone, organization, managerId } = req.body;

    if (!managerId) {
      return res.status(400).json({ message: 'Manager ID is required for private events' });
    }

    // Check if email is associated with a manager/agency
    const existingManager = await User.findOne({ email, role: { $in: ['event-manager', 'event-agency'] } });
    if (existingManager) {
      return res.status(400).json({ message: 'This email is associated with a manager/agency role.' });
    }

    // Validate managerId
    const manager = await User.findOne({ _id: managerId, role: { $in: ['event-manager', 'event-agency'] } });
    if (!manager) {
      return res.status(400).json({ message: 'Event manager or agency not found' });
    }

    // Determine customer
    let customerId = null;
    let isAnonymous = false;
    let generatedPassword = null;

    if (req.user && req.user.id) {
      customerId = req.user.id;
    } else {
      const existingCustomer = await User.findOne({ email: email.toLowerCase(), role: 'customer' });
      if (existingCustomer) {
        customerId = existingCustomer._id;
      } else {
        generatedPassword = crypto.randomBytes(8).toString('hex');
       // //const hashedPassword = await bcrypt.hash(generatedPassword, 10);
        const newCustomer = new User({
          fullName,
          email: email.toLowerCase(),
          password: generatedPassword,
          role: 'customer',
          purpose: 'plan'
        });
        await newCustomer.save();
        customerId = newCustomer._id;
        isAnonymous = true;
      }
    }

    const privateEvent = new PrivateEvent({
      eventName,
      eventType,
      location,
      guests,
      startDate,
      endDate,
      budget: { amount: budget, currency },
      requirements,
      additionalInfo,
      contact: { fullName, email, phone, organization },
      customer: customerId,
      assignedManager: managerId,
      status: 'pending'
    });

    await privateEvent.save();

    const baseUrl = process.env.CLIENT_URL;
    const eventUrl = `${baseUrl}`;

    // Notify customer
    const customerEmailContent = templates.eventPosted(
      fullName, eventName, eventType, location, guests, startDate, endDate, budget, currency, additionalInfo, eventUrl
    );
    await sendNotification(email, 'Your Private Event Request is Submitted!', customerEmailContent, 'email');

    // Notify anonymous customer with login details
    if (isAnonymous && generatedPassword) {
      const anonymousEmailContent = templates.anonymousUserLogin(fullName, email, generatedPassword, eventUrl);
      await sendNotification(email, 'Your Gopratle Account Details', anonymousEmailContent, 'email');
    }

    // Notify assigned manager
    const managerEmailContent = templates.privateEventNotification(
      manager.fullName || 'Event Manager', eventName, eventType, location, guests, startDate, endDate, budget, currency, additionalInfo, eventUrl
    );
    await sendNotification(manager.email, 'New Private Event Request', managerEmailContent, 'email');

    res.status(201).json({ status: 'success', data: privateEvent });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Duplicate key error: Email already exists.',
        field: Object.keys(error.keyValue)[0]
      });
    }
    handleError(res, 400, 'Failed to create private event', error);
  }
};

// Get all private events for the authenticated user
const getAllPrivateEvents = async (req, res) => {
  try {
    if (!req.user || !req.user.id || !req.user.role) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    const { page = 1, limit = 10, eventType, startDate, endDate } = req.query;
    const filters = {};

    if (eventType) filters.eventType = eventType;
    if (startDate) filters.startDate = { $gte: new Date(startDate) };
    if (endDate) filters.endDate = { $lte: new Date(endDate) };

    if (req.user.role === 'customer') {
      filters.customer = req.user.id;
    } else if (['event-manager', 'event-agency'].includes(req.user.role)) {
      filters.assignedManager = req.user.id;
    } else {
      return res.status(403).json({ message: 'Forbidden: Invalid user role' });
    }

    const privateEvents = await PrivateEvent.find(filters)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('customer', 'fullName email')
      .populate('assignedManager', 'fullName email');

    const total = await PrivateEvent.countDocuments(filters);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data: privateEvents
    });
  } catch (error) {
    handleError(res, 500, 'Failed to fetch private events', error);
  }
};

// Get a single private event
// const getPrivateEventById = async (req, res) => {
//   try {
//     if (!req.user || !req.user.id || !req.user.role) {
//       return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
//     }

//     const privateEvent = await PrivateEvent.findById(req.params.id)
//       .populate('customer', 'fullName email')
//       .populate('assignedManager', 'fullName email');

//     if (!privateEvent) {
//       return res.status(404).json({ message: 'Private event not found' });
//     }

//     if (req.user.role === 'customer' && privateEvent.customer.toString() !== req.user.id) {
//       return res.status(403).json({ message: 'Forbidden: You cannot view this event' });
//     }
//     if (['event-manager', 'event-agency'].includes(req.user.role) && privateEvent.assignedManager.toString() !== req.user.id) {
//       return res.status(403).json({ message: 'Forbidden: You cannot view this event' });
//     }

//     res.json({ status: 'success', data: privateEvent });
//   } catch (error) {
//     handleError(res, 400, 'Failed to fetch private event', error);
//   }
// };

// // Update a private event
// const updatePrivateEvent = async (req, res) => {
//   try {
//     if (!req.user || !req.user.id || !req.user.role) {
//       return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
//     }

//     const privateEvent = await PrivateEvent.findById(req.params.id);
//     if (!privateEvent) {
//       return res.status(404).json({ message: 'Private event not found' });
//     }

//     if (req.user.role !== 'customer' || privateEvent.customer.toString() !== req.user.id) {
//       return res.status(403).json({ message: 'Forbidden: Only the customer can update this event' });
//     }

//     const updatedEvent = await PrivateEvent.findByIdAndUpdate(
//       req.params.id,
//       { $set: req.body },
//       { new: true, runValidators: true }
//     ).populate('customer', 'fullName email')
//      .populate('assignedManager', 'fullName email');

//     res.json({ status: 'success', data: updatedEvent });
//   } catch (error) {
//     handleError(res, 400, 'Failed to update private event', error);
//   }
// };

// // Delete a private event
// const deletePrivateEvent = async (req, res) => {
//   try {
//     if (!req.user || !req.user.id || !req.user.role) {
//       return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
//     }

//     const privateEvent = await PrivateEvent.findById(req.params.id);
//     if (!privateEvent) {
//       return res.status(404).json({ message: 'Private event not found' });
//     }

//     if (req.user.role !== 'customer' || privateEvent.customer.toString() !== req.user.id) {
//       return res.status(403).json({ message: 'Forbidden: Only the customer can delete this event' });
//     }

//     await PrivateEvent.findByIdAndDelete(req.params.id);

//     const manager = await User.findById(privateEvent.assignedManager);
//     const managerEmailContent = templates.eventDeletedNotification(privateEvent.eventName);
//     await sendNotification(manager.email, `Event "${privateEvent.eventName}" Deleted`, managerEmailContent, 'email');

//     res.json({ status: 'success', message: 'Private event deleted successfully' });
//   } catch (error) {
//     handleError(res, 500, 'Failed to delete private event', error);
//   }
// };

module.exports = {
  createPrivateEvent,
  getAllPrivateEvents,
  // getPrivateEventById,
  // updatePrivateEvent,
  // deletePrivateEvent
};