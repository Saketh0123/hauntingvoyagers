const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Tour = require('./tourModel');
const Settings = require('./settingsModel');
const { uploadImage, uploadMultipleImages } = require('./cloudinary');

const app = express();

// Middleware
const allowedOrigins = [
  process.env.ADMIN_ORIGIN,
  process.env.MAIN_ORIGIN,
  'https://hauntingvoyagers-kijp.vercel.app',
  'https://hauntingvoyagers-5mgf.vercel.app'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow same-origin and curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, true); // default to allow; tighten if needed
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('/api/*', cors(corsOptions));

// Global CORS fallback to ensure headers on every path/method
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('.')); // Serve static HTML files

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-agency';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// API Routes

// Get all tours
app.get('/api/tours', async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status && status !== 'all') filter.status = status;
    else if (!status) filter.status = 'active'; // Default to active tours only if no status param
    
    const tours = await Tour.find(filter).sort({ createdAt: -1 });
    res.json(tours);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single tour by slug
app.get('/api/tours/:slug', async (req, res) => {
  try {
    const tour = await Tour.findOne({ slug: req.params.slug });
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    res.json(tour);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create tour (admin)
app.post('/api/tours', async (req, res) => {
  try {
    const tour = new Tour(req.body);
    await tour.save();
    res.status(201).json(tour);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update tour (admin)
app.put('/api/tours/:id', async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    res.json(tour);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete tour (admin)
app.delete('/api/tours/:id', async (req, res) => {
  try {
    const tour = await Tour.findByIdAndDelete(req.params.id);
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    res.json({ message: 'Tour deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CLOUDINARY UPLOAD ROUTES ====================

// Upload single image to Cloudinary
app.post('/api/upload/image', async (req, res) => {
  try {
    const { image, folder } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    const imageUrl = await uploadImage(image, folder || 'travel-agency');
    res.json({ url: imageUrl });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload multiple images to Cloudinary
app.post('/api/upload/images', async (req, res) => {
  try {
    const { images, folder } = req.body;
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: 'No images array provided' });
    }
    const imageUrls = await uploadMultipleImages(images, folder || 'travel-agency');
    res.json({ urls: imageUrls });
  } catch (error) {
    console.error('Multiple images upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SETTINGS ROUTES ====================

// Get site settings
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne({ type: 'site_settings' });
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = new Settings({
        type: 'site_settings',
        company: {
          name: 'Pawan Krishna Tours & Travells',
          logoUrl: ''
        },
        heroImages: [],
        socialMedia: {
          facebook: 'https://www.facebook.com/profile.php?id=61553794382346',
          instagram: 'https://www.instagram.com/haunting_voyagers/',
          whatsapp: '919502606607'
        },
        footer: {
          email: 'info@travelagency.com',
          phone: '+91 98765 43210',
          copyright: '© 2025 Travel Agency. All rights reserved.',
          developerCredit: '',
          developerLink: ''
        }
      });
      await settings.save();
    } else {
      let updated = false;
      if (!settings.footer) {
        settings.footer = {
          email: 'info@travelagency.com',
          phone: '+91 98765 43210',
          copyright: '© 2025 Travel Agency. All rights reserved.',
          developerCredit: '',
          developerLink: ''
        };
        updated = true;
      } else {
        if (settings.footer.developerCredit === undefined) {
          settings.footer.developerCredit = '';
          updated = true;
        }
        if (settings.footer.developerLink === undefined) {
          settings.footer.developerLink = '';
          updated = true;
        }
      }
      if (updated) await settings.save();
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update site settings
app.put('/api/settings', async (req, res) => {
  try {
    const update = { $set: req.body, $setOnInsert: { type: 'site_settings' } };
    const options = { new: true, upsert: true, runValidators: false }; // allow partials
    const settings = await Settings.findOneAndUpdate({ type: 'site_settings' }, update, options);
    res.json(settings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Only start a local server when not running on Vercel
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
