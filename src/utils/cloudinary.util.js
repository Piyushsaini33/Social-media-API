import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a local file to Cloudinary and deletes the local temporary file.
 * @param {string} localFilePath - The path to the file stored temporarily on the server.
 * @param {string} folderName - The destination folder name in your Cloudinary media library.
 * @returns {Object|null} The Cloudinary upload response object or null if failed.
 */
export const uploadToCloudinary = async (localFilePath, folderName = 'general') => {
  try {
    if (!localFilePath) return null;

    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto', // Automatically detects image, video, or raw file types
      folder: folderName,
    });

    // Successfully uploaded, remove the local file
    // Async non-blocking cleanup
    await fs.promises.unlink(localFilePath);
    return response;
  } catch (error) {
    // Remove the locally saved temporary file if the upload operation failed
    if (fs.existsSync(localFilePath)) {
      await fs.promises.unlink(localFilePath);
    }
    console.error('Cloudinary Upload Error:', error);
    return null;
  }
};

/**
 * Deletes an asset from Cloudinary using its public ID.
 * @param {string} publicId - The public ID of the asset to delete.
 * @returns {Object} The deletion response from Cloudinary.
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    console.error('Cloudinary Deletion Error:', error);
    return null;
  }
};
