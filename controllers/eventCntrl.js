const Event = require("../models/Event")
const PrivateEvent = require("../models/privateEvent")
const Portfolio = require('../models/Portfolio');
const Proposal = require("../models/Proposal")
const { sendNotification } = require('../services/notificationService')
const crypto = require('crypto')
const bcrypt = require('bcryptjs');
const User = require("../models/User");
const templates = require("../templates/index");


// Utility function to handle errors
const handleError = (res, status, message, error) => {
  console.error(`${message}:`, error.message);
  return res.status(status).json({ status: "error", message: error.message });
};

// Create Event Controller
const createEvent = async (req, res) => {
  try {

    const {
      email,
      eventName,
      eventType,
      location,
      guests,
      startDate,
      endDate,
      budget,
      currency,
      requirements,
      additionalInfo,
      fullName,
      // phone,
      organization,
    } = req.body;

    // Step 1: Check if the email is associated with an Event Manager or Event Agency
    const existingEventManager = await User.findOne({ email, role: { $in: ['event-manager', 'event-agency', 'independent'] } });
    if (existingEventManager) {
      return res.status(400).json({ message: 'This email is already associated with an event organizing role and cannot be used for event posting as a customer.' });
    }

    // Step 2: Check if the user is logged in (JWT token) or posting as an anonymous user
    let customerId = null;
    let isAnonymous = false;
    let generatedPassword = null;

    if (req.user && req.user.id) {
      // If the user is logged in (has JWT token), use their ID
      customerId = req.user.id;
    } else {
      // If the user is not logged in (anonymous user), find or create a new customer based on the email
      const existingCustomer = await User.findOne({ email:email.toLowerCase(), role: 'customer' });
        
      if (existingCustomer) {
            // If customer already exists, reuse their ID
            customerId = existingCustomer._id;
            // Optionally, you can send a message saying this user is returning
      } else {
            generatedPassword = crypto.randomBytes(8).toString('hex') // Generate a random password
            console.log('Generated password:', generatedPassword); // Log the raw password
            // If this is a new user, create a new customer
            //const hashedPassword = bcrypt.hashSync(generatedPassword, 10);
            //console.log('Hashed password:', hashedPassword);
            
            const newCustomer = new User({
              fullName,  // Use the fullName provided by the user
              email: email.toLowerCase(),
              password: generatedPassword,  // Set password as null since it's not needed for a guest user
              role: 'customer',  // Set role as customer
              purpose: 'host',  // Set purpose as 'plan'
            });

            await newCustomer.save();
            console.log('Saved user:', { email, password: newCustomer.password }); // Log saved user
            customerId = newCustomer._id;
            isAnonymous = true;

      }
    }

        const event = new Event({
          eventName,
          eventType,
          location,
          guests,
          startDate,
          endDate,
          budget: {
            amount: budget,
            currency: currency,
          },
          requirements,
          additionalInfo,
          contact: {
            fullName,
            email,
            // phone,
            organization,
          },
          customer: customerId,
        });

        await event.save();
        // const existingPortfolio = await Portfolio.findOne({ user: customerId });

        // if (existingPortfolio) {
        //   await Portfolio.findOneAndUpdate(
        //     { user: customerId },
        //     { $set: { 'contact.phone': phone } },
        //     { new: true }
        //   );
        //   console.log('Updated phone in existing portfolio.');
        // } else {
        //   const newPortfolio = new Portfolio({
        //     user: customerId,
        //     contact: {
        //       phone: phone
        //     }
        //   });
        //   await newPortfolio.save();
        //   console.log('Created new portfolio with phone.');
        // }
    
        baseUrl = process.env.CLIENT_URL;
        
        const eventUrl = `${baseUrl}`;
        console.log('Generated eventUrl:', eventUrl); // Debug the URL
      
      //  Step 6:send email notification
          const customerEmailContent = templates.eventPosted(
            fullName, 
            eventName, 
            eventType, 
            location, 
            guests,
            startDate, 
            endDate, 
            budget, 
            currency,  
            additionalInfo,   
            eventUrl,
          );
          console.log('Customer email content:', customerEmailContent);
          await sendNotification(email, "Your Event is Live!",customerEmailContent, 'email');
          console.log('Customer notification sent.');


          if(isAnonymous && generatedPassword) {
            const anonymousUserEmailContent = templates.anonymousUserLogin(fullName, email, generatedPassword, eventUrl);
            console.log('Email content:', anonymousUserEmailContent); // Log email content
            await sendNotification(email, "Your Gopratle Account Details",anonymousUserEmailContent, 'email');
            console.log('Anonymous user login details email sent.');
          }

          // // Send email to all event managers about the new event
          // const eventManagers = await User.find({ role: {$in: ['event-manager', 'event-agency']} });
          // const managerEmailContent = templates.newEventNotificationPost(eventName, eventType, location, guests, startDate, endDate, budget, currency, additionalInfo, eventUrl);
          // for (const manager of eventManagers) {
          //   await sendNotification(manager.email, "New event posted",managerEmailContent , 'email');
          // }

          // Send email only to event managers whose portfolio expertise matches the event type
          const matchingManagerIds = await Portfolio.find({
            expertise: { $regex: `^${eventType}$`, $options: 'i' },
          }).distinct('user');

          const eventManagers = await User.find({
            _id: { $in: matchingManagerIds },
            role: { $in: ['event-manager', 'event-agency'] },
          });

          const managerEmailContent = templates.newEventNotificationPost(
            eventName,
            eventType,
            location,
            guests,
            startDate,
            endDate,
            budget,
            currency,
            additionalInfo,
            eventUrl
          );

          for (const manager of eventManagers) {
            await sendNotification(manager.email, "New event posted", managerEmailContent, 'email');
          }
          console.log('Event managers notified.');
    
    res.status(201).json({
      status: "success",
      data: event,
    });
  } catch (error) {

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Duplicate key error: Email already exists or other unique field is duplicated.',
        field: Object.keys(error.keyValue)[0], // Return the field causing the duplicate error
      });
    }

    res.status(400).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get all events
const getAllEvents = async (req, res) => {
  const { page = 1, limit = 10, eventType, startDate, endDate } = req.query;
  
  const filters = {};
  if (eventType) filters.eventType = eventType;
  if (startDate) filters.startDate = { $gte: new Date(startDate) };
  if (endDate) filters.endDate = { $lte: new Date(endDate) };
  
  try {
    let events = [];
    let total = 0;

    if (req.user.role === 'customer') {
      // Fetch public events for the customer
      const publicFilters = { ...filters, customer: req.user.id, isPrivate: false };
      const publicEvents = await Event.find(publicFilters)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('customer', 'name email');
      const publicTotal = await Event.countDocuments(publicFilters);

      // Fetch private events for the customer
      const privateFilters = { ...filters, customer: req.user.id };
      const privateEvents = await PrivateEvent.find(privateFilters)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('customer', 'fullName email')
        .populate('assignedManager', 'fullName email');
      const privateTotal = await PrivateEvent.countDocuments(privateFilters);

      // Combine events
      events = [...publicEvents, ...privateEvents];
      total = publicTotal + privateTotal;
    } else if (['event-manager', 'event-agency', 'independent'].includes(req.user.role)) {
      // Fetch only public events for event managers
      const managerFilters = { ...filters, isPrivate: false };
      events = await Event.find(managerFilters)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('customer', 'name email');
      total = await Event.countDocuments(managerFilters);
    } else {
      return res.status(403).json({ message: 'Forbidden: Invalid user role' });
    }
      res.json({
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        data: events,
      });
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch events', error: err.message });
    }
  };

// Unified “get by id” for both public and private events
const getEventWithId = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Ensure user is authenticated
    if (!req.user || !req.user.id || !req.user.role) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    let event = await Event.findById(id);
    let source = 'public';

    // 2. If not in the public Event collection, try PrivateEvent
    if (!event) {
      event = await PrivateEvent.findById(id)
        .populate('customer', 'fullName email')
        .populate('assignedManager', 'fullName email');
      source = 'private';
    }

    // 3. If still not found, 404
    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event not found' });
    }

    // 4. Role‐based access control
    const { role, id: userId } = req.user;

    if (source === 'public') {
      // Public events only restrict customers who don't own it
      if (role === 'customer' && event.customer.toString() !== userId) {
        return res.status(403).json({ message: 'Forbidden: You cannot view this event' });
      }
    } else {
      // Private events have two possible role checks
      const customerId = event.customer._id ? event.customer._id.toString() : event.customer.toString();
      if (role === 'customer' && customerId !== userId) {
        return res.status(403).json({ message: 'Forbidden: You cannot view this private event' });
      }
      if (['event-manager', 'event-agency'].includes(role) &&
          event.assignedManager.toString() !== userId) {
        return res.status(403).json({ message: 'Forbidden: You cannot view this private event' });
      }
    }

    // 5. Return whichever you found
    res.status(200).json({
      status: 'success',
      source,       // “public” or “private”
      data: event,
    });

  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};


// Update event
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.user || !req.user.id || req.user.role !== 'customer') {
      return res.status(401).json({ message: 'Unauthorized: Only customers can update events' });
    }

    let event = await Event.findById(id);
    let model = Event;
    if (!event) {
      event = await PrivateEvent.findById(id);
      model = PrivateEvent;
    }
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You cannot update this event' });
    }

    const updatedEvent = await model.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('customer', 'fullName email');

    res.json({ status: 'success', data: updatedEvent });
  } catch (error) {
    handleError(res, 400, 'Failed to update event', error);
  }
};
// Delete event

// const deleteEvent = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!req.user || !req.user.id || req.user.role !== 'customer') {
//       return res.status(401).json({ message: 'Unauthorized: Only customers can delete events' });
//     }

//     let event = await Event.findById(id);
//     let model = Event;
//     if (!event) {
//       event = await PrivateEvent.findById(id);
//       model = PrivateEvent;
//     }
//     if (!event) {
//       return res.status(404).json({ message: 'Event not found' });
//     }

//     if (event.customer.toString() !== req.user.id) {
//       return res.status(403).json({ message: 'Forbidden: You cannot delete this event' });
//     }

//     // Delete related proposals
//     await Proposal.deleteMany({ event: id });

//     // Delete the event
//     await model.findByIdAndDelete(id);

//     // Notify event managers or assigned manager
//     if (model === Event) {
//       const eventManagers = await User.find({ role: { $in: ["event-manager", "event-agency"] } });
//       const managerEmailContent = templates.eventDeletedNotification(event.eventName);
//       await Promise.all(
//         eventManagers.map((manager) =>
//           sendNotification(manager.email, `Event "${event.eventName}" Deleted`, managerEmailContent, "email")
//         )
//       );
//     } else {
//       const manager = await User.findById(event.assignedManager);
//       const managerEmailContent = templates.eventDeletedNotification(event.eventName);
//       await sendNotification(manager.email, `Event "${event.eventName}" Deleted`, managerEmailContent, "email");
//     }

//     res.json({ status: 'success', message: 'Event deleted successfully' });
//   } catch (error) {
//     handleError(res, 500, 'Failed to delete event', error);
//   }
// };

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.user || !req.user.id || req.user.role !== 'customer') {
      return res.status(401).json({ message: 'Unauthorized: Only customers can delete events' });
    }

    let event;
    let model;
    let eventModel;
    if ((event = await Event.findById(id))) {
      model = Event;
      eventModel = 'Event';
    } else if ((event = await PrivateEvent.findById(id))) {
      model = PrivateEvent;
      eventModel = 'PrivateEvent';
    } else {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You cannot delete this event' });
    }

    // Delete related proposals
    const deletedProposals = await Proposal.deleteMany({ eventId: id, eventModel });
    console.log(`Deleted ${deletedProposals.deletedCount} proposals for event: ${id}`);

    // Delete the event
    await model.findByIdAndDelete(id);

    // Notify event managers or assigned manager
    if (model === Event) {
      const eventManagers = await User.find({ role: { $in: ['event-manager', 'event-agency'] } });
      const managerEmailContent = templates.eventDeletedNotification(event.eventName);
      await Promise.all(
        eventManagers.map((manager) =>
          sendNotification(
            manager.email,
            `Event "${event.eventName}" Deleted`,
            managerEmailContent,
            'email'
          )
        )
      );
    } else {
      const manager = await User.findById(event.assignedManager);
      const managerEmailContent = templates.eventDeletedNotification(event.eventName);
      await sendNotification(
        manager.email,
        `Event "${event.eventName}" Deleted`,
        managerEmailContent,
        'email'
      );
    }

    res.json({ status: 'success', message: 'Event and related proposals deleted successfully' });
  } catch (error) {
    handleError(res, 500, 'Failed to delete event', error);
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventWithId,
  updateEvent,
  deleteEvent,
};









// // controllers/eventCntrl.js
// const crypto = require("crypto");
// const bcrypt = require("bcryptjs");
// const Event = require("../models/Event");
// const PrivateEvent = require("../models/privateEvent"); // not used here, but kept for consistency
// const Proposal = require("../models/Proposal");          // not used here, but kept for consistency
// const User = require("../models/User");
// const { sendNotification } = require("../services/notificationService");
// const templates = require("../templates/index");

// const handleError = (res, status, message, error) => {
//   if (error) console.error(`${message}:`, error.message);
//   return res.status(status).json({ status: "error", message });
// };

// // POST /api/events
// // Public endpoint (supports both authenticated and anonymous)
// // const createEvent = async (req, res) => {
// //   try {
// //     // 1) Extract and normalize inputs
// //     let {
// //       email,
// //       eventName,
// //       eventType,
// //       location,
// //       guests,
// //       startDate,
// //       endDate,
// //       budget,
// //       currency,
// //       requirements,
// //       additionalInfo,
// //       fullName,
// //       phone,
// //       organization,
// //     } = req.body;

// //     email = (email || "").toLowerCase().trim();
// //     fullName = (fullName || "").trim();
// //     organization = (organization || "").trim();

// //     // 2) Basic validations
// //     if (!eventName || !eventType || !location || !email || !fullName) {
// //       return res.status(400).json({
// //         status: "error",
// //         message: "Missing required fields: eventName, eventType, location, fullName, email",
// //       });
// //     }
// //     if (!startDate || !endDate) {
// //       return res.status(400).json({ status: "error", message: "Start and end dates are required" });
// //     }
// //     if (!currency) {
// //       return res.status(400).json({ status: "error", message: "Currency is required" });
// //     }
// //     // Coerce guests and budget
// //     const guestsNum = Number(guests) || 0;
// //     const budgetAmount = Number(budget) || 0;

// //     // 3) Determine the customer (logged-in vs anonymous)
// //     let customerId = null;
// //     let isAnonymous = false;
// //     let generatedPasswordPlain = null;

// //     // If user is authenticated via middleware (optional), we expect req.user
// //     // router can be configured with or without protect() for this controller
// //     // If protected, req.user contains: { id, role, purpose }
// //     if (req.user && req.user.id) {
// //       // Authenticated path must be host/customer only
// //       if (req.user.purpose !== "host" || req.user.role !== "customer") {
// //         return res.status(403).json({
// //           status: "error",
// //           message: "Only host customers can post events from this endpoint",
// //         });
// //       }
// //       customerId = req.user.id;
// //     } else {
// //       // Anonymous submission: verify the email doesn't belong to a planner
// //       const existingByEmail = await User.findOne({ email });

// //       if (existingByEmail) {
// //         // If the email belongs to a planner, block
// //         if (
// //           existingByEmail.purpose !== "host" ||
// //           ["event-manager", "event-agency"].includes(existingByEmail.role)
// //         ) {
// //           return res.status(400).json({
// //             status: "error",
// //             message:
// //               "This email is associated with a planner account and cannot be used for event posting as a customer.",
// //           });
// //         }
// //         // Else: re-use existing customer
// //         customerId = existingByEmail._id;
// //       } else {
// //         // Create a new customer (host) with a generated password
// //         generatedPasswordPlain = crypto.randomBytes(8).toString("hex");
// //         const hashedPassword = await bcrypt.hash(generatedPasswordPlain, 10);

// //         const newCustomer = new User({
// //           fullName,
// //           email,
// //           password: hashedPassword,
// //           role: "customer",
// //           purpose: "host",
// //         });

// //         await newCustomer.save();
// //         customerId = newCustomer._id;
// //         isAnonymous = true;
// //       }
// //     }

// //     // 4) Create and save the event
// //     const event = new Event({
// //       eventName,
// //       eventType,
// //       location,
// //       guests: guestsNum,
// //       startDate,
// //       endDate,
// //       budget: {
// //         amount: budgetAmount,
// //         currency,
// //       },
// //       requirements,
// //       additionalInfo,
// //       contact: {
// //         fullName,
// //         email,
// //         phone,
// //         organization,
// //       },
// //       customer: customerId,
// //     });

// //     await event.save();

// //     // 5) Notifications
// //     const baseUrl = process.env.CLIENT_URL || "";
// //     const eventUrl = `${baseUrl}`; // Customize to specific event URL if needed, e.g., `${baseUrl}/events/${event._id}`

// //     // Notify customer
// //     try {
// //       const customerEmailContent = templates.eventPosted(
// //         fullName,
// //         eventName,
// //         eventType,
// //         location,
// //         guestsNum,
// //         startDate,
// //         endDate,
// //         budgetAmount,
// //         currency,
// //         additionalInfo,
// //         eventUrl
// //       );
// //       await sendNotification(email, "Your Event is Live!", customerEmailContent, "email");
// //     } catch (err) {
// //       console.error("Failed to send customer eventPosted email:", err.message);
// //       // Do not fail the whole request on email failure
// //     }

// //     // If anonymous new account was created, send credentials
// //     if (isAnonymous && generatedPasswordPlain) {
// //       try {
// //         const anonymousUserEmailContent = templates.anonymousUserLogin(
// //           fullName,
// //           email,
// //           generatedPasswordPlain,
// //           eventUrl
// //         );
// //         await sendNotification(email, "Your Gopratle Account Details", anonymousUserEmailContent, "email");
// //       } catch (err) {
// //         console.error("Failed to send anonymous account email:", err.message);
// //       }
// //     }

// //     // Notify event managers about new event
// //     try {
// //       const eventManagers = await User.find({ role: { $in: ["event-manager", "event-agency"] } });
// //       const managerEmailContent = templates.newEventNotificationPost(
// //         eventName,
// //         eventType,
// //         location,
// //         guestsNum,
// //         startDate,
// //         endDate,
// //         budgetAmount,
// //         currency,
// //         additionalInfo,
// //         eventUrl
// //       );
// //       await Promise.all(
// //         eventManagers.map((manager) =>
// //           sendNotification(manager.email, "New event posted", managerEmailContent, "email")
// //         )
// //       );
// //     } catch (err) {
// //       console.error("Failed to notify event managers:", err.message);
// //     }

// //     // 6) Success
// //     return res.status(201).json({
// //       status: "success",
// //       data: event,
// //     });
// //   } catch (error) {
// //     // Duplicate key handling (if any)
// //     if (error.code === 11000) {
// //       return res.status(400).json({
// //         message:
// //           "Duplicate key error: Email already exists or another unique field is duplicated.",
// //         field: Object.keys(error.keyValue)[0],
// //       });
// //     }
// //     return handleError(res, 400, "Failed to create event", error);
// //   }
// // };

// const createEvent = async (req, res) => {
//   try {
//     // 1) Ensure authenticated
//     if (!req.user || !req.user.id) {
//       return res.status(401).json({ status: "error", message: "Please login to post an event" });
//     }

//     // 2) Fetch user and enforce role/purpose
//     const user = await User.findById(req.user.id);
//     if (!user) {
//       return res.status(401).json({ status: "error", message: "User not found" });
//     }
//     if (user.purpose !== "host" || user.role !== "customer") {
//       return res.status(403).json({
//         status: "error",
//         message: "Only host customers can post events",
//       });
//     }

//     // 3) Extract event fields (NO contact fields expected)
//     const {
//       eventName,
//       eventType,
//       location,
//       guests,
//       startDate,
//       endDate,
//       budget,       // number
//       currency,     // string, e.g. "INR"
//       requirements, // array
//       additionalInfo,
//     } = req.body;

//     // 4) Validate minimally
//     if (!eventName || !eventType || !location) {
//       return res.status(400).json({
//         status: "error",
//         message: "Missing required fields: eventName, eventType, location",
//       });
//     }
//     if (!startDate || !endDate) {
//       return res.status(400).json({ status: "error", message: "Start and end dates are required" });
//     }
//     if (!currency) {
//       return res.status(400).json({ status: "error", message: "Currency is required" });
//     }

//     const event = new Event({
//       eventName,
//       eventType,
//       location,
//       guests: Number(guests) || 0,
//       startDate,
//       endDate,
//       budget: {
//         amount: Number(budget) || 0,
//         currency,
//       },
//       requirements,
//       additionalInfo,
//       customer: user._id,
//     });

//     await event.save();

//     // 5) Notifications (email comes from authenticated user)
//     const baseUrl = process.env.CLIENT_URL || "";
//     const eventUrl = `${baseUrl}`; // e.g. could be `${baseUrl}/dashboard/customer/events/${event._id}`

//     try {
//       const customerEmailContent = templates.eventPosted(
//         user.fullName || "Customer",
//         eventName,
//         eventType,
//         location,
//         Number(guests) || 0,
//         startDate,
//         endDate,
//         Number(budget) || 0,
//         currency,
//         additionalInfo,
//         eventUrl
//       );
//       await sendNotification(user.email, "Your Event is Live!", customerEmailContent, "email");
//     } catch (err) {
//       console.error("Failed to send customer event email:", err.message);
//     }

//     try {
//       const planners = await User.find({ role: { $in: ["event-manager", "event-agency"] } });
//       const managerEmailContent = templates.newEventNotificationPost(
//         eventName,
//         eventType,
//         location,
//         Number(guests) || 0,
//         startDate,
//         endDate,
//         Number(budget) || 0,
//         currency,
//         additionalInfo,
//         eventUrl
//       );
//       await Promise.all(
//         planners.map((m) =>
//           sendNotification(m.email, "New event posted", managerEmailContent, "email")
//         )
//       );
//     } catch (err) {
//       console.error("Failed to notify planners:", err.message);
//     }

//     return res.status(201).json({ status: "success", data: event });
//   } catch (error) {
//     return handleError(res, 400, "Failed to create event", error);
//   }
// }


// // Get all events
// const getAllEvents = async (req, res) => {
//   const { page = 1, limit = 10, eventType, startDate, endDate } = req.query;
  
//   const filters = {};
//   if (eventType) filters.eventType = eventType;
//   if (startDate) filters.startDate = { $gte: new Date(startDate) };
//   if (endDate) filters.endDate = { $lte: new Date(endDate) };
  
//   try {
//     let events = [];
//     let total = 0;

//     if (req.user.role === 'customer') {
//       // Fetch public events for the customer
//       const publicFilters = { ...filters, customer: req.user.id, isPrivate: false };
//       const publicEvents = await Event.find(publicFilters)
//         .skip((page - 1) * limit)
//         .limit(parseInt(limit))
//         .populate('customer', 'name email');
//       const publicTotal = await Event.countDocuments(publicFilters);

//       // Fetch private events for the customer
//       const privateFilters = { ...filters, customer: req.user.id };
//       const privateEvents = await PrivateEvent.find(privateFilters)
//         .skip((page - 1) * limit)
//         .limit(parseInt(limit))
//         .populate('customer', 'fullName email')
//         .populate('assignedManager', 'fullName email');
//       const privateTotal = await PrivateEvent.countDocuments(privateFilters);

//       // Combine events
//       events = [...publicEvents, ...privateEvents];
//       total = publicTotal + privateTotal;
//     } else if (['event-manager', 'event-agency'].includes(req.user.role)) {
//       // Fetch only public events for event managers
//       const managerFilters = { ...filters, isPrivate: false };
//       events = await Event.find(managerFilters)
//         .skip((page - 1) * limit)
//         .limit(parseInt(limit))
//         .populate('customer', 'name email');
//       total = await Event.countDocuments(managerFilters);
//     } else {
//       return res.status(403).json({ message: 'Forbidden: Invalid user role' });
//     }
//       res.json({
//         total,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         data: events,
//       });
//     } catch (err) {
//       res.status(500).json({ message: 'Failed to fetch events', error: err.message });
//     }
//   };

// // Unified “get by id” for both public and private events
// const getEventWithId = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // 1. Ensure user is authenticated
//     if (!req.user || !req.user.id || !req.user.role) {
//       return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
//     }

//     let event = await Event.findById(id);
//     let source = 'public';

//     // 2. If not in the public Event collection, try PrivateEvent
//     if (!event) {
//       event = await PrivateEvent.findById(id)
//         .populate('customer', 'fullName email')
//         .populate('assignedManager', 'fullName email');
//       source = 'private';
//     }

//     // 3. If still not found, 404
//     if (!event) {
//       return res.status(404).json({ status: 'error', message: 'Event not found' });
//     }

//     // 4. Role‐based access control
//     const { role, id: userId } = req.user;

//     if (source === 'public') {
//       // Public events only restrict customers who don't own it
//       if (role === 'customer' && event.customer.toString() !== userId) {
//         return res.status(403).json({ message: 'Forbidden: You cannot view this event' });
//       }
//     } else {
//       // Private events have two possible role checks
//       const customerId = event.customer._id ? event.customer._id.toString() : event.customer.toString();
//       if (role === 'customer' && customerId !== userId) {
//         return res.status(403).json({ message: 'Forbidden: You cannot view this private event' });
//       }
//       if (['event-manager', 'event-agency'].includes(role) &&
//           event.assignedManager.toString() !== userId) {
//         return res.status(403).json({ message: 'Forbidden: You cannot view this private event' });
//       }
//     }

//     // 5. Return whichever you found
//     res.status(200).json({
//       status: 'success',
//       source,       // “public” or “private”
//       data: event,
//     });

//   } catch (error) {
//     res.status(400).json({
//       status: 'error',
//       message: error.message,
//     });
//   }
// };


// // Update event
// const updateEvent = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!req.user || !req.user.id || req.user.role !== 'customer') {
//       return res.status(401).json({ message: 'Unauthorized: Only customers can update events' });
//     }

//     let event = await Event.findById(id);
//     let model = Event;
//     if (!event) {
//       event = await PrivateEvent.findById(id);
//       model = PrivateEvent;
//     }
//     if (!event) {
//       return res.status(404).json({ message: 'Event not found' });
//     }

//     if (event.customer.toString() !== req.user.id) {
//       return res.status(403).json({ message: 'Forbidden: You cannot update this event' });
//     }

//     const updatedEvent = await model.findByIdAndUpdate(
//       id,
//       { $set: req.body },
//       { new: true, runValidators: true }
//     ).populate('customer', 'fullName email');

//     res.json({ status: 'success', data: updatedEvent });
//   } catch (error) {
//     handleError(res, 400, 'Failed to update event', error);
//   }
// };
// // Delete event

// // const deleteEvent = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     if (!req.user || !req.user.id || req.user.role !== 'customer') {
// //       return res.status(401).json({ message: 'Unauthorized: Only customers can delete events' });
// //     }

// //     let event = await Event.findById(id);
// //     let model = Event;
// //     if (!event) {
// //       event = await PrivateEvent.findById(id);
// //       model = PrivateEvent;
// //     }
// //     if (!event) {
// //       return res.status(404).json({ message: 'Event not found' });
// //     }

// //     if (event.customer.toString() !== req.user.id) {
// //       return res.status(403).json({ message: 'Forbidden: You cannot delete this event' });
// //     }

// //     // Delete related proposals
// //     await Proposal.deleteMany({ event: id });

// //     // Delete the event
// //     await model.findByIdAndDelete(id);

// //     // Notify event managers or assigned manager
// //     if (model === Event) {
// //       const eventManagers = await User.find({ role: { $in: ["event-manager", "event-agency"] } });
// //       const managerEmailContent = templates.eventDeletedNotification(event.eventName);
// //       await Promise.all(
// //         eventManagers.map((manager) =>
// //           sendNotification(manager.email, `Event "${event.eventName}" Deleted`, managerEmailContent, "email")
// //         )
// //       );
// //     } else {
// //       const manager = await User.findById(event.assignedManager);
// //       const managerEmailContent = templates.eventDeletedNotification(event.eventName);
// //       await sendNotification(manager.email, `Event "${event.eventName}" Deleted`, managerEmailContent, "email");
// //     }

// //     res.json({ status: 'success', message: 'Event deleted successfully' });
// //   } catch (error) {
// //     handleError(res, 500, 'Failed to delete event', error);
// //   }
// // };

// const deleteEvent = async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!req.user || !req.user.id || req.user.role !== 'customer') {
//       return res.status(401).json({ message: 'Unauthorized: Only customers can delete events' });
//     }

//     let event;
//     let model;
//     let eventModel;
//     if ((event = await Event.findById(id))) {
//       model = Event;
//       eventModel = 'Event';
//     } else if ((event = await PrivateEvent.findById(id))) {
//       model = PrivateEvent;
//       eventModel = 'PrivateEvent';
//     } else {
//       return res.status(404).json({ message: 'Event not found' });
//     }

//     if (event.customer.toString() !== req.user.id) {
//       return res.status(403).json({ message: 'Forbidden: You cannot delete this event' });
//     }

//     // Delete related proposals
//     const deletedProposals = await Proposal.deleteMany({ eventId: id, eventModel });
//     console.log(`Deleted ${deletedProposals.deletedCount} proposals for event: ${id}`);

//     // Delete the event
//     await model.findByIdAndDelete(id);

//     // Notify event managers or assigned manager
//     if (model === Event) {
//       const eventManagers = await User.find({ role: { $in: ['event-manager', 'event-agency'] } });
//       const managerEmailContent = templates.eventDeletedNotification(event.eventName);
//       await Promise.all(
//         eventManagers.map((manager) =>
//           sendNotification(
//             manager.email,
//             `Event "${event.eventName}" Deleted`,
//             managerEmailContent,
//             'email'
//           )
//         )
//       );
//     } else {
//       const manager = await User.findById(event.assignedManager);
//       const managerEmailContent = templates.eventDeletedNotification(event.eventName);
//       await sendNotification(
//         manager.email,
//         `Event "${event.eventName}" Deleted`,
//         managerEmailContent,
//         'email'
//       );
//     }

//     res.json({ status: 'success', message: 'Event and related proposals deleted successfully' });
//   } catch (error) {
//     handleError(res, 500, 'Failed to delete event', error);
//   }
// };

// module.exports = {
//   createEvent,
//   getAllEvents,
//   getEventWithId,
//   updateEvent,
//   deleteEvent,
// };