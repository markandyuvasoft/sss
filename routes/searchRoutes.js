const express = require('express')
const router = express.Router()
const { searchPackages, getEventTypes } = require('../controllers/searchController')

router.post('/search-packages', searchPackages)

router.get('/event-types', getEventTypes)

module.exports = router;