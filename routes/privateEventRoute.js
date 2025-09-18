const express = require('express');
const protect = require('../middlewares/authMiddleware');
const {
  createPrivateEvent,
  getAllPrivateEvents,
  //getPrivateEventById,
  //updatePrivateEvent,
  //deletePrivateEvent
} = require('../controllers/privateEventController');

const router = express.Router();

// Create private event (authenticated or anonymous)
router.post('/', createPrivateEvent);

// Get all private events for the user (customer or manager)
router.get('/', protect(['customer', 'event-manager', 'event-agency']), getAllPrivateEvents);


// Not in work
// Get single private event
// router.get('/:id', protect(['customer', 'event-manager', 'event-agency']), getPrivateEventById);

// // Update private event (customer only)
// router.put('/:id', protect(['customer']), updatePrivateEvent);

// // Delete private event (customer only)
// router.delete('/:id', protect(['customer']), deletePrivateEvent);

module.exports = router;