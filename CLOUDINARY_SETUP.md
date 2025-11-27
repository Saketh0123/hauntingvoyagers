# Cloudinary Setup Guide

## Overview
All images (logo, hero images, tour gallery) are now uploaded to Cloudinary for fast delivery and optimization.

## Setup Steps

### 1. Get Cloudinary Credentials

1. Go to [Cloudinary](https://cloudinary.com/) and create a free account
2. Go to Dashboard
3. Copy your credentials:
   - **Cloud Name**: `dfw1w02tb` (already configured)
   - **API Key**: Found in dashboard
   - **API Secret**: Found in dashboard

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=3000

CLOUDINARY_CLOUD_NAME=dfw1w02tb
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### 3. Create Upload Preset

1. In Cloudinary Dashboard, go to Settings → Upload
2. Scroll to "Upload presets"
3. Click "Add upload preset"
4. Set:
   - **Preset name**: `travel_unsigned`
   - **Signing mode**: `Unsigned`
   - **Folder**: `travel-agency`
5. Save

### 4. Install Dependencies

```bash
npm install
```

This installs:
- `cloudinary`: For server-side uploads
- `multer`: For handling file uploads

### 5. Start the Server

```bash
npm start
```

## Features

✅ **Logo Upload**: Instant upload to Cloudinary with preview
✅ **Hero Images**: Multiple hero slider images
✅ **Tour Gallery**: Multiple gallery images per tour
✅ **Auto Optimization**: Images are automatically optimized for web
✅ **Fast Loading**: CDN delivery eliminates loading delays

## Admin Panel Usage

### Upload Logo
1. Go to Home Settings → Company Information
2. Click "Choose File" under Logo
3. Select image → Auto uploads to Cloudinary
4. Preview appears instantly
5. Click "Save Company Info"

### Upload Hero Images
1. Go to Home Settings → Hero Images
2. Click "Choose File" or enter Cloudinary URL
3. Select image → Auto uploads
4. Click "Add Hero Image"

### Upload Tour Gallery
1. Edit any tour
2. Scroll to "Gallery Images"
3. Click "Choose Files" (can select multiple)
4. All images upload to Cloudinary
5. Preview appears
6. Save tour

## Troubleshooting

### Images not uploading?
- Check `.env` file has correct credentials
- Verify upload preset `travel_unsigned` exists in Cloudinary
- Check browser console for errors

### Slow uploads?
- Cloudinary free tier has limits
- Large images (>5MB) take longer
- Consider image compression before upload

## Benefits

- **No more base64**: Images stored in cloud, not database
- **Fast loading**: CDN delivery worldwide
- **Auto optimization**: Cloudinary optimizes images automatically
- **Scalable**: Handles unlimited images
- **Backup**: All images safely stored in cloud
