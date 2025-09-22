// routes/packageRoutes.js
const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const protect = require('../middlewares/authMiddleware'); // Use your middleware
const upload = require('../middlewares/upload'); // Import multer upload middleware

//Static route
// To get the popular cities
router.get('/popular-cities', packageController.getPopularCities); // New route

//CRID route
// Create package (only event managers or agencies can create)
router.post('/create', protect(['event-manager', 'event-agency', 'independent', 'volunteer']), upload.array('packageImages', 10), packageController.createPackage);

// Get all active packages (available to everyone)
router.get('/', packageController.getAllPackages);

router.get('/manager/:managerId', protect(['event-manager', 'event-agency', 'independent', 'volunteer']), packageController.getManagerPackages);

// Get details of a single package
router.get('/:packageId', packageController.getPackageDetails);

// Update a package (only the event manager who created it can update it)
router.put('/:packageId', protect(['event-manager', 'event-agency', 'independent', 'volunteer']), upload.array('packageImages', 10), packageController.updatePackage);

// Delete a package (only the event manager who created it can delete it)
router.delete('/:packageId', protect(['event-manager', 'event-agency', 'independent', 'volunteer']), packageController.deletePackage);

// Modify a package based on customer requirements (still needs event manager/agency role)
router.patch('/:packageId/modify', protect(['event-manager', 'event-agency', 'independent', 'volunteer']), packageController.modifyPackage);

module.exports = router;
