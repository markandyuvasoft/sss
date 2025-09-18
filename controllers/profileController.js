const bcrypt = require("bcryptjs");
const User = require("../models/User");

// Email and phone validation patterns
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[+]?[1-9]?[0-9]{7,15}$/;

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -resetPasswordToken -verificationToken -resetPasswordExpires -verificationTokenExpires")
      .populate("portfolio");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, phone, profilePicture } = req.body;

    let updateData = {};

    if (fullName) updateData.fullName = fullName;

    if (email) {
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      updateData.email = email.toLowerCase();
    }

    if (phone) {
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ message: "Invalid phone format" });
      }
      updateData.phone = phone;
    }

    if (profilePicture) updateData.profilePicture = profilePicture;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password -resetPasswordToken -verificationToken -resetPasswordExpires -verificationTokenExpires");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ success: true, message: "Profile updated successfully", data: updatedUser });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Get user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has a password (not Google OAuth user)
    if (!user.password) {
      return res.status(400).json({ message: 'Cannot change password for Google OAuth users' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete user account
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // For non-Google users, verify password
    if (user.password && password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Password is incorrect' });
      }
    } else if (user.password && !password) {
      return res.status(400).json({ message: 'Password is required to delete account' });
    }

    // Delete associated portfolio if exists
    if (user.portfolio) {
      await Portfolio.findByIdAndDelete(user.portfolio);
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user by ID (for public profiles)
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('fullName email phone role purpose experience portfolio createdAt isVerified')
      .populate('portfolio');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only show verified users publicly
    if (!user.isVerified) {
      return res.status(404).json({ message: 'User profile not available' });
    }

    // Extract profile picture URL safely
    const profilePicture = user.portfolio?.profilePicture?.url || null;

    res.status(200).json({
      message: "User profile retrieved successfully",
      user: {
        userId: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        purpose: user.purpose,
        isVerified: user.isVerified,
        profilePicture,
        portfolio: user.portfolio,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get users by purpose (for listing hosts/planners)
exports.getUsersByPurpose = async (req, res) => {
  try {
    const { purpose } = req.params;
    const { page = 1, limit = 10, search = '' } = req.query;

    if (!['host', 'planner'].includes(purpose)) {
      return res.status(400).json({ message: 'Invalid purpose. Must be host or planner' });
    }

    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = {
      purpose,
      isVerified: true
    };

    if (search) {
      searchQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(searchQuery)
      .select('fullName email purpose phone portfolio createdAt isVerified')
      .populate('portfolio')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(searchQuery);

    // Format users data
    const formattedUsers = users.map(user => ({
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      purpose: user.purpose,
      role: user.role,
      isVerified: user.isVerified,
      profilePicture: user.portfolio?.profilePicture?.url || null,
      portfolio: user.portfolio,
      createdAt: user.createdAt
    }));

    res.status(200).json({
      message: `${purpose === 'host' ? 'Hosts' : 'Planners'} retrieved successfully`,
      users: formattedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get users by purpose error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all users (admin functionality)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role = '', purpose = '', search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = {};

    if (role && ['customer', 'event-manager'].includes(role)) {
      searchQuery.role = role;
    }

    if (purpose && ['host', 'planner'].includes(purpose)) {
      searchQuery.purpose = purpose;
    }

    if (search) {
      searchQuery.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(searchQuery)
      .select('-password -resetPasswordToken -verificationToken -resetPasswordExpires -verificationTokenExpires')
      .populate('portfolio')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(searchQuery);

    // Format users data
    const formattedUsers = users.map(user => ({
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      purpose: user.purpose,
      phone: user.phone,
      isVerified: user.isVerified,
      profilePicture: user.portfolio?.profilePicture?.url || null,
      portfolio: user.portfolio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.status(200).json({
      message: "All users retrieved successfully",
      users: formattedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};