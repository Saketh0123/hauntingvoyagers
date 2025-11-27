const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {string} base64String - Base64 encoded image string
 * @param {string} folder - Folder name in Cloudinary (e.g., 'logos', 'hero', 'tours')
 * @returns {Promise<string>} - Cloudinary URL
 */
async function uploadImage(base64String, folder = 'travel-agency') {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto:best' },
        { fetch_format: 'auto' }
      ]
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 */
async function deleteImage(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
}

/**
 * Upload multiple images
 * @param {Array<string>} base64Array - Array of base64 encoded images
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<Array<string>>} - Array of Cloudinary URLs
 */
async function uploadMultipleImages(base64Array, folder = 'travel-agency') {
  try {
    const uploadPromises = base64Array.map(base64 => uploadImage(base64, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple image upload error:', error);
    throw new Error('Failed to upload images to Cloudinary');
  }
}

module.exports = {
  uploadImage,
  deleteImage,
  uploadMultipleImages,
  cloudinary
};
