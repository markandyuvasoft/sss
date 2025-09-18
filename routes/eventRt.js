const express =  require('express')
const protect = require("../middlewares/authMiddleware"); // Path to your protect middleware


const {
  createEvent,
  getAllEvents,
  getEventWithId,
  updateEvent,
  deleteEvent,
  
} = require( '../controllers/eventCntrl');

const router = express.Router();


//router.post('/', protect(['customer']), postEvent);

router.post('/', createEvent);


router.get('/', protect(), getAllEvents);

router.get('/:id', protect(), getEventWithId)
  
router.put("/:id", protect(["customer"]), updateEvent)

router.delete("/:id", protect(["customer"]), deleteEvent);

module.exports = router;
