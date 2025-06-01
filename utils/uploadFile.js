const cloudinary = require("../services/cloudinary");
const path = require("path");

async function uploadFileToCloudinary(filePath, publicId) {
  try {
    const res = await cloudinary.uploader.upload(filePath, {
      upload_preset: "budget_preset",
      resource_type: "raw", // important for non-image files like PDF/Excel
      public_id: publicId,
      folder: "budget_summaries", // optional: Cloudinary folder
    });

    return res.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed", error);
    throw error;
  }
}

module.exports = uploadFileToCloudinary;
