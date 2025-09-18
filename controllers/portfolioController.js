// controllers/profileController.js
const asyncHandler = require('express-async-handler');
const Portfolio = require('../models/Portfolio');
const User = require('../models/User'); // Import the User model
const cloudinary = require("../config/cloudinary")
const mongoose = require("mongoose")

// Get portfolio details for the logged-in user (combining user info and portfolio)
const getPortfolio = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id; // From JWT (authentication middleware)
    // const user = await User.findById(userId).select('fullName email role experience');
    const user = await User.findById(userId)
      .select("-password -resetPasswordToken -verificationToken -resetPasswordExpires -verificationTokenExpires")
      .populate("portfolio");

    if (!user) {
      return res.status(404).json({ message: 'Your portfolio could not be found please sign up' });
    }

    let portfolio = await Portfolio.findOne({ user: userId });

    // If no portfolio exists, return a template that contains the registered user's details.
    if (!portfolio) {
      return res.status(200).json({
        user: user,
        portfolio: null
      });
    }

    res.status(200).json({
      user: user,
      portfolio: portfolio
    });

  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update portfolio details for the logged-in user
const updatePortfolio = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      companyName,
      location,
      about,
      additionalDetails,
      languages,
      services,
      expertise,
      contact,
      title,
      type,
      deletedPortfolioIds,
      deletedCertificationIds, // new deletion field for certifications
    } = req.body;

    let portfolio = await Portfolio.findOne({ user: userId });
    if (!portfolio) {
      portfolio = new Portfolio({ user: userId });
    }

    // Handle deleted portfolio items
    if (deletedPortfolioIds) {
      try {
        const parsedDeletedIds =
          typeof deletedPortfolioIds === "string"
            ? JSON.parse(deletedPortfolioIds)
            : deletedPortfolioIds;

        // Filter out deleted items and delete from Cloudinary
        const itemsToDelete = portfolio.portfolio.filter((item) =>
          parsedDeletedIds.includes(item._id.toString())
        );
        portfolio.portfolio = portfolio.portfolio.filter(
          (item) => !parsedDeletedIds.includes(item._id.toString())
        );

        // Delete files from Cloudinary with proper resource type
        for (const item of itemsToDelete) {
          if (item.public_id) {
            const options = { invalidate: true };
            // If the file is a video, specify the resource_type as video
            if (item.fileType === "video" || (item.type && item.type === "video")) {
              options.resource_type = "video";
            }
            await cloudinary.uploader.destroy(item.public_id, options);
          }
        }
      } catch (error) {
        console.error("Error processing deleted portfolio items:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to delete portfolio items",
          error: error.message,
        });
      }
    }

    // Handle deleted certification items
    if (deletedCertificationIds) {
      try {
        const parsedDeletedCertIds =
          typeof deletedCertificationIds === "string"
            ? JSON.parse(deletedCertificationIds)
            : deletedCertificationIds;

        // Filter out deleted certification items and delete from Cloudinary
        const certsToDelete = portfolio.certifications.filter((item) =>
          parsedDeletedCertIds.includes(item._id.toString())
        );
        portfolio.certifications = portfolio.certifications.filter(
          (item) => !parsedDeletedCertIds.includes(item._id.toString())
        );

        // Delete files from Cloudinary with proper resource type
        for (const item of certsToDelete) {
          if (item.public_id) {
            const options = { invalidate: true };
            // Check if the certification is a video and set resource_type accordingly
            if (item.fileType === "video" || (item.type && item.type === "video")) {
              options.resource_type = "video";
            }
            await cloudinary.uploader.destroy(item.public_id, options);
          }
        }
      } catch (error) {
        console.error("Error processing deleted certification items:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to delete certification items",
          error: error.message,
        });
      }
    }

    // Update basic fields
    portfolio.companyName = companyName || portfolio.companyName || "";
    portfolio.location = location || portfolio.location || "";
    portfolio.about = about || portfolio.about || "";
    portfolio.additionalDetails =
      additionalDetails || portfolio.additionalDetails || "";
    portfolio.languages = languages || portfolio.languages || "";

    // Handle expertise array
    if (expertise) {
      const parsedExpertise =
        typeof expertise === "string" ? JSON.parse(expertise) : expertise;
      portfolio.expertise = [
        ...new Set(
          parsedExpertise.filter(
            (exp) => typeof exp === "string" && exp.trim()
          )
        ),
      ];
    }

    // Handle services array
    if (services) {
      const parsedServices =
        typeof services === "string" ? JSON.parse(services) : services;
      portfolio.services = [
        ...new Set(
          parsedServices.filter(
            (exp) => typeof exp === "string" && exp.trim()
          )
        ),
      ];
    }

    // Handle languages array
    if (languages) {
      const parsedLanguages =
        typeof languages === "string" ? JSON.parse(languages) : languages;
      portfolio.languages = [
        ...new Set(
          parsedLanguages.filter(
            (exp) => typeof exp === "string" && exp.trim()
          )
        ),
      ];
    }

    // Handle contact information
    if (contact) {
      portfolio.contact =
        typeof contact === "string" ? JSON.parse(contact) : contact;
    }

    // Handle profile picture upload
    if (req.files?.profilePicture?.length > 0) {
      if (portfolio.profilePicture?.public_id) {
        await cloudinary.uploader.destroy(portfolio.profilePicture.public_id);
      }
      const file = req.files.profilePicture[0];
      portfolio.profilePicture = {
        url: file.path,
        public_id: file.filename,
      };
    }

    // Handle portfolio uploads
    if (req.files?.portfolio?.length > 0) {
      const uploadedFiles = req.files.portfolio.map((file) => ({
        title: title || file.originalname,
        type: type || (file.mimetype.startsWith("video") ? "video" : "image"),
        url: file.path,
        public_id: file.filename,
        fileType: file.mimetype.startsWith("video") ? "video" : "image",
      }));
      portfolio.portfolio.push(...uploadedFiles);
    }

    // Handle certifications uploads
    if (req.files?.certifications?.length > 0) {
      const uploadedCertifications = req.files.certifications.map((file) => ({
        title: title || file.originalname,
        type: type || (file.mimetype.startsWith("video") ? "video" : "image"),
        url: file.path,
        public_id: file.filename,
        fileType: file.mimetype.startsWith("video") ? "video" : "image",
      }));
      portfolio.certifications.push(...uploadedCertifications);
    }

    // Clean up empty arrays
    portfolio.expertise = portfolio.expertise || [];
    portfolio.portfolio = portfolio.portfolio || [];
    portfolio.certifications = portfolio.certifications || [];

    await portfolio.save();

    // Update user's portfolio reference
    await User.findByIdAndUpdate(userId, { portfolio: portfolio._id });

    res.status(200).json({
      success: true,
      message: "Portfolio updated successfully",
      portfolio,
    });
  } catch (error) {
    console.error("Error updating portfolio:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// whose role is 'event-manager' or 'event-agency'
const getAllPortfolios = asyncHandler(async (req, res) => {
  try {
    // Find portfolios and populate the "user" field to get registered data
    const portfolios = await Portfolio.find()
      .populate('user', 'fullName email role experience')
      .where('user')
      .in(await User.find({ role: { $in: ['event-manager', 'event-agency', 'independent'] } }).distinct('_id'));

    res.status(200).json({ portfolios });
  } catch (error) {
    console.error('Error fetching all portfolios:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

const getAllVolunteerPortfolios = asyncHandler(async (req, res) => {
  try {
    // Find portfolios and populate the "user" field to get registered data
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: No user authenticated' });
    }

    const portfolios = await Portfolio.find()
      .populate('user', 'fullName email role experience')
      .where('user')
      .in(await User.find({ role: { $in: ['volunteer'] } }).distinct('_id'));

    // Filter out portfolios where user is null (non-volunteers)
    const volunteerPortfolios = portfolios.filter((portfolio) => portfolio.user !== null);

    if (!volunteerPortfolios.length) {
      return res.status(201).json({ message: 'No volunteer portfolios found' });
    }

    res.status(200).json({ portfolios });
  } catch (error) {
    console.error('Error fetching all portfolios:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// NEW: Get portfolio by its ID (for fetching a specific user’s portfolio)
const getPortfolioById = asyncHandler(async (req, res) => {
  try {
    const portfolioId = req.params.id;
    // Validate the ObjectId
    if (!mongoose.Types.ObjectId.isValid(portfolioId)) {
      return res.status(400).json({ message: 'Invalid portfolio ID' });
    }
    const portfolio = await Portfolio.findById(portfolioId)
      .populate('user', 'fullName email role experience');
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    res.status(200).json({ portfolio });
  } catch (error) {
    console.error("Error fetching portfolio by ID:", error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Export only the routes you want to keep for the new design
module.exports = {
  getPortfolio,
  updatePortfolio,
  getAllPortfolios,
  getPortfolioById,
  getAllVolunteerPortfolios,
};
