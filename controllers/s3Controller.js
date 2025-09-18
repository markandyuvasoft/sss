// controllers/s3Controller.js
const asyncHandler = require("express-async-handler");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/aws");

exports.getPresignedURL = asyncHandler(async (req, res) => {
  const { fileName, fileType } = req.query;
  if (!fileName || !fileType) {
    return res.status(400).json({ message: "fileName and fileType required" });
  }

  const key = `portfolio/${req.user.id}/${Date.now()}_${fileName}`;
  const cmd = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: fileType,
  });

  const uploadURL = await getSignedUrl(s3, cmd, { expiresIn: 60 });
  const fileURL = `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
  res.json({ uploadURL, fileURL, key });
});
