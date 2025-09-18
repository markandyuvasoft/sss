// middleware/uploadMemory.js
// Memory storage + validation + robust logging + size enforcement
const multer = require('multer');

// Allowed MIME types
const allowedImageFormats = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
const allowedVideoFormats = [
  'video/mp4',
  'video/quicktime',
  'video/mov',
  'video/heivc',
];
const allowedPortfolioFormats = [
  ...allowedImageFormats,
  ...allowedVideoFormats,
];

// Multer storage (in-memory)
const storage = multer.memoryStorage();

// File filter for type validation and logging
function fileFilter(req, file, cb) {
  const { fieldname, mimetype, originalname } = file;
  // size is not yet populated here, will log in enforceAndLog
  let valid = true;
  let msg = '';

  // Validate by field
  switch (fieldname) {
    case 'profilePicture':
      if (!allowedImageFormats.includes(mimetype)) {
        valid = false;
        msg = `Invalid profile picture type: ${mimetype}`;
      }
      break;
    case 'portfolio':
      if (!allowedPortfolioFormats.includes(mimetype)) {
        valid = false;
        msg = `Invalid portfolio file type: ${mimetype}`;
      }
      break;
    case 'certifications':
      if (!allowedImageFormats.includes(mimetype)) {
        valid = false;
        msg = `Invalid certification file type: ${mimetype}`;
      }
      break;
    default:
      valid = false;
      msg = `Unknown field: ${fieldname}`;
  }

  console.log(`
[uploadMemory] Received file:`);
  console.log(`  Field:    ${fieldname}`);
  console.log(`  Name:     ${originalname}`);
  console.log(`  Mimetype: ${mimetype}`);
  console.log(`  Allowed:  ${valid}
`);

  if (!valid) return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', msg), false);
  cb(null, true);
}

// Instantiate multer
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // per-file limit: 50 MB (portfolio individual or profile)
  fileFilter,
});

module.exports = upload;