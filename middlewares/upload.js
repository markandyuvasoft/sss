const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const allowedFormats = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"];

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    console.log("File being uploaded:", file.originalname);
    console.log("Mimetype:", file.mimetype);
    console.log("Resource Type:", file.mimetype.startsWith("video") ? "video" : "image");

    if (!allowedFormats.includes(file.mimetype)) {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    const originalName = file.originalname.split(".")[0];
    const sanitizedFilename = originalName.replace(/\s+/g, "_");

    return {
      folder: `portfolio/${req.user?.id || "guest"}`,
      resource_type: file.mimetype.startsWith("video") ? "video" : "image",
      public_id: sanitizedFilename,
      overwrite: false,
      invalidate: true,
    };
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB to match Nginx client_max_body_size
  },
});

module.exports = upload;