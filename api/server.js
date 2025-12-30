const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
// Serverless-compatible core + chromium; fallback to local Puppeteer/Chrome on dev
const puppeteerCore = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

const Tour = require('./tourModel');
const Settings = require('./settingsModel');
const Travell = require('./travellModel');
const HeroImage = require('./heroImageModel');
const Booking = require('./bookingModel');
const PricingCard = require('./pricingModel');
const Bill = require('./billModel');
const { uploadImage, uploadMultipleImages } = require('./cloudinary');

const app = express();

// Detect serverless vs local environment
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;

// Helper: find a local Chrome executable on Windows/macOS/Linux
function getLocalChromePath() {
  const platform = os.platform();
  if (platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google\\Chrome\\Application\\chrome.exe'),
    ];
    for (const p of candidates) {
      if (p && fs.existsSync(p)) return p;
    }
  } else if (platform === 'darwin') {
    const macPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    if (fs.existsSync(macPath)) return macPath;
  } else {
    const linuxCandidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ];
    for (const p of linuxCandidates) {
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

// Middleware
const allowedOrigins = [
  process.env.ADMIN_ORIGIN,
  process.env.MAIN_ORIGIN,
  'https://hauntingvoyagers-9zwz.vercel.app',
  'https://hauntingvoyagers.vercel.app'
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
  res.header('Access-Control-Max-Age', '600');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Serve static files from the project root, regardless of where node is started
const STATIC_ROOT = path.join(__dirname, '..');
app.use(express.static(STATIC_ROOT));
// Explicit routes for home to avoid path/cwd issues
app.get('/', (req, res) => {
  res.sendFile(path.join(STATIC_ROOT, 'home.html'));
});
app.get('/home.html', (req, res) => {
  res.sendFile(path.join(STATIC_ROOT, 'home.html'));
});

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
      { new: true, runValidators: false, strict: false } // disable validation
    );
    if (!tour) {
      return res.status(404).json({ error: 'Tour not found' });
    }
    res.json(tour);
  } catch (error) {
    console.error('Tour update error:', error);
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

// ==================== VEHICLE (TRAVELL) ROUTES ====================

// Get all vehicles
app.get('/api/travells', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.isActive = status === 'active';
    const travells = await Travell.find(filter).sort({ displayOrder: 1, createdAt: -1 });
    res.json(travells);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get one vehicle
app.get('/api/travells/:id', async (req, res) => {
  try {
    const doc = await Travell.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create vehicle
app.post('/api/travells', async (req, res) => {
  try {
    const body = { ...req.body };
    if (!body.slug && body.name) {
      body.slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    }
    const doc = new Travell(body);
    await doc.save();
    res.status(201).json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update vehicle
app.put('/api/travells/:id', async (req, res) => {
  try {
    const doc = await Travell.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false, strict: false });
    if (!doc) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(doc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete vehicle
app.delete('/api/travells/:id', async (req, res) => {
  try {
    const doc = await Travell.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HERO IMAGES ROUTES (RENTALS) ====================

// Get hero images
app.get('/api/hero-images', async (req, res) => {
  try {
    const images = await HeroImage.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create hero image
app.post('/api/hero-images', async (req, res) => {
  try {
    const image = new HeroImage(req.body);
    await image.save();
    res.status(201).json(image);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update hero image
app.put('/api/hero-images/:id', async (req, res) => {
  try {
    const image = await HeroImage.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false, strict: false });
    if (!image) return res.status(404).json({ error: 'Image not found' });
    res.json(image);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete hero image
app.delete('/api/hero-images/:id', async (req, res) => {
  try {
    const image = await HeroImage.findByIdAndDelete(req.params.id);
    if (!image) return res.status(404).json({ error: 'Image not found' });
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
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
    // Clone body to avoid mutating req.body directly
    const body = { ...req.body };

    // Enforce constant type and prevent operator conflict on 'type'
    if (body.type) delete body.type;

    // Sanitize heroImages: ensure array of strings only
    if (Array.isArray(body.heroImages)) {
      body.heroImages = body.heroImages
        .map(img => typeof img === 'string' ? img : (img && (img.url || img.secure_url || img.type) || ''))
        .filter(Boolean);
    }

    // Defensive: strip any Mongo/operator keys accidentally passed
    const unsafeKeys = Object.keys(body).filter(k => k.startsWith('$'));
    unsafeKeys.forEach(k => delete body[k]);

    // Build update doc without conflicting 'type' usage
    const update = { $set: body, $setOnInsert: { type: 'site_settings' } };
    const options = { new: true, upsert: true, runValidators: false, strict: false }; // keep validation off

    const settings = await Settings.findOneAndUpdate({ type: 'site_settings' }, update, options);
    res.json(settings);
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== BOOKINGS ROUTES ====================

// Get all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.getAllBookings();
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const bookingData = {
      name: req.body.name,
      phone: req.body.phone,
      travelDate: req.body.travelDate,
      vehicleType: req.body.vehicleType,
      additionalRequirements: req.body.additionalRequirements || ''
    };
    const newBooking = await Booking.createBooking(bookingData);
    res.status(201).json(newBooking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get booking by ID
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update booking (e.g., confirm status)
app.put('/api/bookings/:id', async (req, res) => {
  try {
    const updatedBooking = await Booking.updateBooking(req.params.id, req.body);
    if (!updatedBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(updatedBooking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete booking
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const deleted = await Booking.deleteBooking(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PRICING CARDS ROUTES ====================

// Get all pricing cards
app.get('/api/pricing', async (req, res) => {
  try {
    const filter = req.query.status === 'all' ? {} : { isActive: true };
    const cards = await PricingCard.find(filter).sort({ displayOrder: 1, createdAt: 1 });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single pricing card
app.get('/api/pricing/:id', async (req, res) => {
  try {
    const card = await PricingCard.findById(req.params.id);
    if (!card) return res.status(404).json({ error: 'Pricing card not found' });
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create pricing card
app.post('/api/pricing', async (req, res) => {
  try {
    const card = new PricingCard(req.body);
    await card.save();
    res.status(201).json(card);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update pricing card
app.put('/api/pricing/:id', async (req, res) => {
  try {
    const card = await PricingCard.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: false, strict: false });
    if (!card) return res.status(404).json({ error: 'Pricing card not found' });
    res.json(card);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete pricing card
app.delete('/api/pricing/:id', async (req, res) => {
  try {
    const card = await PricingCard.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ error: 'Pricing card not found' });
    res.json({ message: 'Pricing card deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BILL MANAGEMENT ROUTES
// ============================================

// Get all bills
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single bill by ID
app.get('/api/bills/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new bill
app.post('/api/bills', async (req, res) => {
  try {
    const bill = new Bill(req.body);
    await bill.save();
    res.status(201).json(bill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update bill
app.put('/api/bills/:id', async (req, res) => {
  try {
    const bill = await Bill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete bill
app.delete('/api/bills/:id', async (req, res) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate PDF and send email for bill
app.post('/api/bills/:id/send-email', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    // Generate HTML for invoice (matching exact viewBill styling)
    const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bill - ${bill.billNo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif; 
          padding: 20px 30px; 
          max-width: 210mm;
          margin: 0 auto;
          font-size: 12px;
          line-height: 1.4;
        }
        
        /* Header Section */
        .company-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 3px double #333;
        }
        .company-left { flex: 1; }
        .company-center { flex: 2; text-align: center; padding: 0 20px; }
        .company-right { flex: 1; text-align: right; }
        .company-name {
          font-size: 20px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 5px;
          letter-spacing: 1px;
        }
        .bus-icon {
          font-size: 24px;
          color: #ea580c;
          margin-bottom: 5px;
        }
        .company-info {
          font-size: 10px;
          color: #444;
          line-height: 1.6;
        }
        .contact-numbers {
          font-size: 11px;
          font-weight: 600;
          color: #333;
          line-height: 1.8;
        }
        
        /* Bill Header */
        .bill-header {
          text-align: center;
          margin: 15px 0;
          padding: 8px;
          background: linear-gradient(to right, #dbeafe, #fce7f3);
          border-radius: 5px;
        }
        .bill-header h2 {
          font-size: 16px;
          color: #1e40af;
          margin-bottom: 5px;
        }
        .bill-info {
          font-size: 11px;
          color: #555;
        }
        
        /* Content Sections */
        .section {
          margin: 12px 0;
        }
        .section-title {
          font-size: 13px;
          font-weight: bold;
          color: #1e40af;
          border-bottom: 2px solid #ddd;
          padding-bottom: 4px;
          margin-bottom: 8px;
        }
        .row {
          display: flex;
          gap: 15px;
          margin: 6px 0;
        }
        .col {
          flex: 1;
        }
        .field-label {
          font-weight: 600;
          color: #555;
          font-size: 11px;
        }
        .field-value {
          color: #000;
          margin-top: 2px;
          font-size: 11px;
        }
        
        /* Billing Summary */
        .billing-summary {
          background: #f0f9ff;
          padding: 12px;
          margin: 12px 0;
          border: 2px solid #1e40af;
          border-radius: 5px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
          font-size: 11px;
        }
        .summary-label {
          font-weight: 600;
          color: #555;
        }
        .summary-value {
          font-weight: 600;
          color: #000;
        }
        .grand-total-row {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #1e40af;
          font-size: 14px;
        }
        .grand-total-row .summary-label,
        .grand-total-row .summary-value {
          font-weight: bold;
          color: #1e40af;
        }
        .amount-words {
          margin-top: 8px;
          font-size: 10px;
          font-style: italic;
          color: #666;
          text-align: center;
        }
        
        /* Terms */
        .terms {
          background: #fffbeb;
          padding: 10px;
          margin: 12px 0;
          border-left: 4px solid #f59e0b;
          font-size: 10px;
        }
        .terms strong {
          color: #b45309;
          display: block;
          margin-bottom: 5px;
        }
        .terms ul {
          margin-left: 15px;
          line-height: 1.6;
        }
        
        /* Footer */
        .footer {
          text-align: center;
          margin-top: 15px;
          padding-top: 10px;
          border-top: 2px solid #ddd;
          font-size: 11px;
          color: #666;
        }
        
        /* Print Styles */
        @media print {
          body { 
            padding: 15px 20px;
            font-size: 11px;
          }
          .company-name { font-size: 18px; }
          .bill-header h2 { font-size: 15px; }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      </style>
    </head>
    <body>
      <!-- Company Header -->
      <div class="company-header">
        <div class="company-left">
          <div class="company-info">
            <strong>Prop:</strong> P. Kiran Kumar
          </div>
        </div>
        
        <div class="company-center">
          <div class="bus-icon">🚌</div>
          <div class="company-name">PAVAN KRISHNA TRAVELS (GOUD)</div>
          <div class="company-info">
            Shop No. 3-3-158/1, Enugulagadda, Chowrastha, HANAMKONDA
          </div>
        </div>
        
        <div class="company-right">
          <div class="contact-numbers">
            <div>Cell: 98494 58582</div>
            <div>98499 44429</div>
            <div>98496 58850</div>
          </div>
        </div>
      </div>
      
      <!-- Bill Header -->
      <div class="bill-header">
        <h2>TRAVEL BILL</h2>
        <div class="bill-info">
          Bill No: <strong>${bill.billNo}</strong> | Date: <strong>${new Date(bill.date).toLocaleDateString('en-IN')}</strong>
        </div>
      </div>
      
      <!-- Customer Details -->
      <div class="section">
        <div class="section-title">Customer Details</div>
        <div class="row">
          <div class="col">
            <div class="field-label">Name:</div>
            <div class="field-value">${bill.customerName}</div>
          </div>
          <div class="col">
            <div class="field-label">Contact:</div>
            <div class="field-value">${bill.contactNo}</div>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <div class="field-label">Address:</div>
            <div class="field-value">${bill.address}</div>
          </div>
        </div>
      </div>
      
      <!-- Vehicle & Travel Details -->
      <div class="section">
        <div class="section-title">Vehicle & Travel Details</div>
        <div class="row">
          <div class="col">
            <div class="field-label">Vehicle No:</div>
            <div class="field-value">${bill.vehicleNo}</div>
          </div>
          <div class="col">
            <div class="field-label">Seats:</div>
            <div class="field-value">${bill.seats}</div>
          </div>
          <div class="col">
            <div class="field-label">Destination:</div>
            <div class="field-value">${bill.destination}</div>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <div class="field-label">From:</div>
            <div class="field-value">${new Date(bill.dateFrom).toLocaleDateString('en-IN')}</div>
          </div>
          <div class="col">
            <div class="field-label">To:</div>
            <div class="field-value">${new Date(bill.dateTo).toLocaleDateString('en-IN')}</div>
          </div>
        </div>
      </div>
      
      <!-- Billing Summary -->
      <div class="billing-summary">
        <div class="section-title" style="border: none; margin-bottom: 10px;">Billing Summary</div>
        <div class="summary-row">
          <span class="summary-label">Rate per KM:</span>
          <span class="summary-value">₹${bill.ratePerKm}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Total Amount:</span>
          <span class="summary-value">₹${parseFloat(bill.totalAmount).toLocaleString('en-IN')}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Advance Paid:</span>
          <span class="summary-value">₹${parseFloat(bill.advance).toLocaleString('en-IN')}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Balance:</span>
          <span class="summary-value">₹${(parseFloat(bill.totalAmount) - parseFloat(bill.advance)).toLocaleString('en-IN')}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Driver Batta:</span>
          <span class="summary-value">₹${parseFloat(bill.driverBatta).toLocaleString('en-IN')}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Extra Charges:</span>
          <span class="summary-value">₹${parseFloat(bill.extraCharges || 0).toLocaleString('en-IN')}</span>
        </div>
        <div class="summary-row grand-total-row">
          <span class="summary-label">Grand Total:</span>
          <span class="summary-value">₹${parseFloat(bill.grandTotal).toLocaleString('en-IN')}</span>
        </div>
        <div class="amount-words">${bill.amountWords}</div>
      </div>
      
      <!-- Terms -->
      <div class="terms">
        <strong>Important Terms:</strong>
        <ul>
          <li>Parking, Tollgates, Check Post, R.T.O, and State Taxes will be paid by the party</li>
          <li>Hyderabad entrance tax paid by party only</li>
        </ul>
      </div>
      
      ${bill.routeDetails ? `
      <div class="section">
        <div class="section-title">Route Details / Remarks</div>
        <div class="field-value">${bill.routeDetails}</div>
      </div>
      ` : ''}
      
      <!-- Footer -->
      <div class="footer">
        <p><strong>Thank you for choosing PAVAN KRISHNA TRAVELS!</strong></p>
        <p>For any queries, please contact us at the numbers mentioned above.</p>
      </div>
    </body>
    </html>
    `;

    // Generate PDF using Puppeteer (serverless or local fallback)
    let browser;
    try {
      if (isServerless) {
        // Serverless (Vercel) uses puppeteer-core + @sparticuz/chromium
        browser = await puppeteerCore.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
        });
      } else {
        // Local dev: try system Chrome first, else fallback to full puppeteer
        const localChrome = getLocalChromePath();
        if (localChrome) {
          browser = await puppeteerCore.launch({
            executablePath: localChrome,
            headless: true,
          });
        } else {
          // Lazy-require to avoid bundling in serverless
          const puppeteer = require('puppeteer');
          browser = await puppeteer.launch({ headless: true });
        }
      }

      const page = await browser.newPage();
      await page.setContent(invoiceHTML, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
      });

      await browser.close();

      // Setup nodemailer transporter
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Send email with PDF attachment
      const mailOptions = {
        from: `"PAVAN KRISHNA TRAVELS" <${process.env.EMAIL_USER}>`,
        to: bill.customerEmail,
        subject: `Bill ${bill.billNo} - PAVAN KRISHNA TRAVELS`,
        text: `Dear ${bill.customerName},\n\nThank you for choosing PAVAN KRISHNA TRAVELS.\n\nPlease find attached your bill for the journey to ${bill.destination}.\n\nBill Number: ${bill.billNo}\nGrand Total: ₹${bill.grandTotal}\n\nFor any queries, please contact us at:\n98494 58582 | 98499 44429 | 98496 58850\n\nBest Regards,\nPAVAN KRISHNA TRAVELS`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">🚌 PAVAN KRISHNA TRAVELS</h2>
            <p>Dear <strong>${bill.customerName}</strong>,</p>
            <p>Thank you for choosing PAVAN KRISHNA TRAVELS.</p>
            <p>Please find attached your bill for the journey to <strong>${bill.destination}</strong>.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Bill Number:</strong> ${bill.billNo}</p>
              <p style="margin: 5px 0;"><strong>Grand Total:</strong> ₹${bill.grandTotal}</p>
            </div>
            <p>For any queries, please contact us at:</p>
            <p><strong>98494 58582 | 98499 44429 | 98496 58850</strong></p>
            <p style="margin-top: 30px;">Best Regards,<br><strong>PAVAN KRISHNA TRAVELS</strong></p>
          </div>
        `,
        attachments: [
          {
            filename: `Bill_${bill.billNo}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      };

      await transporter.sendMail(mailOptions);

      res.json({ 
        success: true, 
        message: `Bill sent successfully to ${bill.customerEmail}` 
      });

    } catch (pdfError) {
      if (browser) await browser.close();
      throw pdfError;
    }

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: error.message });
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
