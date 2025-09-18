const Package = require('../models/package')

exports.searchPackages = async(req, res) => {
    const {eventType, minBudget, maxBudget,location, sortBy, page = 1, limit = 10} = req.body
    
    const filters = {status: 'active'}


// Apply filters if provided

if (eventType) filters.eventType = { $regex: `^${eventType}$`, $options:'i'}

//Apply budget filter if provided
if (minBudget || maxBudget) {
    filters.budget = {};
    if (minBudget) filters.budget.$gte = Number(minBudget);
    if (maxBudget) filters.budget.$lte = Number(maxBudget);
}
// For available cities
if (req.body.availableCities) {
    filters.availableCities = {
        $elemMatch: { $regex: req.body.availableCities, $options: 'i' },
    };
}

// Apply location filter if provided
if (location) filters['location.city'] = { $regex: location, $options: 'i' };

try{

    const skip = (page - 1) * limit;
    
    // Fetch packages with filters, pagination, and sorting
    const packages = await Package.find(filters)
    .sort(sortBy === 'budgetAsc' ? { budget: 1 } : sortBy === 'budgetDesc' ? { budget: -1 } : {})
    .skip(skip)
    .limit(limit);

    //Total count for pagination metadata
    const totalCount = await Package.countDocuments(filters)

    res.json({
        packages,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        totalPackages: totalCount,
});
}catch(error){
    console.error("Error fetching packages:", error);
    res.status(500).json({message:'Server Error'})
    
}
}

exports.getEventTypes = async (req, res) => {
    try {
        // Use MongoDB aggregation to get unique event types
        const eventTypes = await Package.distinct('eventType', { status: 'active' });

        res.json(eventTypes);
    } catch (error) {
        console.error('Error fetching event types:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
