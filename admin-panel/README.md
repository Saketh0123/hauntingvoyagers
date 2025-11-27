# Admin Panel Setup Guide

## What's Been Created

1. **Backend API** (`/api` folder)
   - Express.js server with MongoDB
   - Tour management endpoints (CRUD)
   - Runs on port 3000

2. **Admin Panel** (`/admin-panel` folder)
   - Standalone HTML admin interface
   - Add/Edit/Delete tours
   - Image URL input + file upload support
   - Completely separate from your main website

## Setup Instructions

### Step 1: Install Dependencies

```powershell
cd c:\Users\DELL\Desktop\Travel
npm install
```

### Step 2: Set Up MongoDB

**Option A: MongoDB Atlas (Free Cloud Database - Recommended)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a new cluster (free tier)
4. Create database user (username/password)
5. Get connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/travel-agency`)

**Option B: Local MongoDB**
1. Install MongoDB locally
2. Connection string: `mongodb://localhost:27017/travel-agency`

### Step 3: Configure Environment

Create `.env` file in the Travel folder:

```
MONGODB_URI=your_mongodb_connection_string_here
PORT=3000
ADMIN_PASSWORD=your_secure_password_here
```

### Step 4: Start the Backend Server

```powershell
npm run dev
```

Server will run on http://localhost:3000

### Step 5: Open Admin Panel

Open in browser: `http://localhost:3000/admin-panel/index.html`

**Default login password:** `admin123` (change this in `admin-panel/admin.js`)

## Admin Panel Features

### Tour Management
- ✅ Add new tours with all details
- ✅ Edit existing tours
- ✅ Delete tours
- ✅ Set tours as Featured/Active/Draft
- ✅ Categorize as Indian/International

### Content Fields
- Basic info (title, location, price, duration, difficulty)
- Description
- Hero image (URL or upload)
- Gallery images (multiple URLs or uploads)
- Tour highlights (bullet points)
- Day-by-day itinerary
- Inclusions/Exclusions
- Available dates with spots

### How It Works

1. **Admin adds tour** → Saved to MongoDB
2. **User visits website** → JavaScript fetches tours from API
3. **Display with exact same UI** → Your HTML/CSS stays unchanged

## Next Steps

After backend is running:

1. I'll add JavaScript to `trip.html` to fetch and display tours dynamically
2. I'll add JavaScript to `home.html` for featured tours
3. I'll create `tour-detail.html` template (using Kerala's design)
4. Deploy to Vercel

## File Structure

```
Travel/
├── admin-panel/          ← Standalone admin interface
│   ├── index.html
│   └── admin.js
├── api/                  ← Backend server
│   ├── server.js
│   └── tourModel.js
├── package.json
├── .env                  ← Your config (create this)
├── home.html            ← Will add dynamic JS
├── trip.html            ← Will add dynamic JS
└── tour-detail.html     ← Will create this
```

## Image Upload Note

Currently supports:
- ✅ Direct image URLs (paste any image URL)
- ⏳ File upload UI ready (needs integration with Cloudinary/ImgBB)

For file uploads, you'll need to sign up for free image hosting:
- **Cloudinary** (free 25GB): https://cloudinary.com
- **ImgBB** (free unlimited): https://imgbb.com

Let me know when you want to set this up!
