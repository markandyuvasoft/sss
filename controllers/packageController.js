const Package = require('../models/package');
const { sendNotification } = require('../services/notificationService')

// Create a new package
exports.createPackage = async(req, res) => {
    console.log(req.body);
    const { title, eventType, description, budget, location,servicesIncluded, availableCities} = req.body

    try{
        const newPackage = new Package({
            title,
            description,
            eventType,
            budget,
            servicesIncluded,
            location: {
                city: location.city,
                state: location.state,
                country: location.country || 'India',
            },
            availableCities,
            managerId:req.user.id // Assuming the user is an event manager or event agency
        })

        await newPackage.save()
        res.status(201).json({message:'Package created successfully', pakage:newPackage})
    }catch(error){
        res.status(500).json({message:'Failed to create package', error:error.message})
    }
}

// Get packages for a specific manager
exports.getManagerPackages = async (req, res) => {
    const { managerId } = req.params;
  
    try {
      const packages = await Package.find({ managerId, status: 'active' })
        .populate('managerId', 'name email');
  
      res.status(200).json(packages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch the packages', error: error.message });
    }
  };

// Get all the packages (everyone can see these)
exports.getAllPackages = async(req, res) =>{
    const {city } = req.query
    try{
        const filter = { status: 'active'}

        if(city) {
            filter.availableCities = city // Filter packages by city
        }
        
        
        const packages = await Package.find({status:'active'})
        .populate('managerId', 'name email')

        res.status(200).json(packages)
    } catch(error){
        res.status(500).json({message:'Failed to fetch the packages', error:error.message})
    }
}

//Get package details(for viewing a single package)
exports.getPackageDetails = async(req, res) =>{
    const { packageId } = req.params;

    try{
        const packageDetails = await Package.findById(packageId).populate('managerId', 'name email')

        if(!packageDetails){
            return res.status(404).json({message:'Package not found'})
        }

        res.status(200).json(packageDetails)

    }catch(error){
        res.status(500).json({message:'Failed to fetch package details', error:error.message})
    }
}

// Update package (event manager can modify their package)
exports.updatePackage = async (req, res) =>{
    const { packageId } = req.params
    const {title, description, budget, servicesIncluded, status, location} = req.body

    try{
        const existingPackage = await Package.findById(packageId)

        if (!existingPackage || existingPackage.managerId.toString() !== req.user.id){
            return res.status(403).json({messsage:'Not Authorized to modify this package'})
        }

        existingPackage.title = title || existingPackage.title;
        existingPackage.description = description || existingPackage.description;
        existingPackage.budget = budget || existingPackage.budget;
        existingPackage.servicesIncluded = servicesIncluded || existingPackage.servicesIncluded;
        existingPackage.location = location || existingPackage.location;
        existingPackage.status = status || existingPackage.status;
    
        await existingPackage.save();
        res.status(200).json({ message: 'Package updated successfully', package: existingPackage });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update package', error: error.message });
    }
}

// Delete package (event manager can delete their package)
exports.deletePackage = async(req, res) =>{
    const { packageId } = req.params;

    try{
        const existingPackage = await Package.findById(packageId)

        if( !existingPackage || existingPackage.managerId.toString() !== req.user.id){
            return res.status(403).json({ message:'Not authorized to delete this package'})
        }

        await existingPackage.deleteOne()
        
        res.status(200).json({message:'package deleted successfully'})
    } catch(error){
        res.status(500).json({message: 'failed to delete package', error: error.message})
    }
}

//  Modify a package based on customer requirements (could be handled via a proposal or direct request)
exports.modifyPackage = async (req, res) => {
    const { packageId } = req.params;
    const { newServices, newBudget } = req.body;
  
    try {
      const existingPackage = await Package.findById(packageId);
  
      if (!existingPackage) {
        return res.status(404).json({ message: 'Package not found' });
      }
  
      existingPackage.servicesIncluded = [...existingPackage.servicesIncluded, ...newServices];
      existingPackage.budget = newBudget || existingPackage.budget;
  
      await existingPackage.save();
  
      // Optionally, notify the event manager or customer
      await sendNotification(existingPackage.managerId.email, `The package has been modified as per customer request.`);
  
      res.status(200).json({ message: 'Package modified successfully', package: existingPackage });
    } catch (error) {
      res.status(500).json({ message: 'Failed to modify package', error: error.message });
    }
  };

exports.getPopularCities = (req, res) => {
    const popularCities = [
      "Delhi",
      "Mumbai",
      "Bengaluru",
      "Chennai",
      "Kolkata",
      "Hyderabad",
      "Ahmedabad",
      "Pune",
      "Jaipur",
      "Lucknow"
    ];
  
    res.status(200).json({ popularCities });
  };
  