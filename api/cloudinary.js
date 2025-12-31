const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadImage(base64String, folder = 'travel-agency') {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder,
      resource_type: 'auto',
      transformation: [ { quality: 'auto:best' }, { fetch_format: 'auto' } ]
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

async function uploadMultipleImages(base64Array, folder = 'travel-agency') {
  const uploadPromises = base64Array.map(base64 => uploadImage(base64, folder));
  return Promise.all(uploadPromises);
}

module.exports = { uploadImage, uploadMultipleImages, cloudinary };
