const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
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
    if (error && error.code === 11000) {
      const key = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'field';
      if (key === 'billNo') {
        return res.status(409).json({ error: 'Bill No already exists. Please use a different Bill No.' });
      }
      return res.status(409).json({ error: `${key} already exists. Please use a different value.` });
    }
    if (error && error.name === 'ValidationError') {
      const firstError = Object.values(error.errors || {})[0];
      return res.status(400).json({ error: firstError?.message || error.message });
    }
    res.status(400).json({ error: error?.message || 'Failed to save bill' });
  }
});

// Update bill
app.put('/api/bills/:id', async (req, res) => {
  try {
    const bill = await Bill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    if (error && error.code === 11000) {
      const key = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'field';
      if (key === 'billNo') {
        return res.status(409).json({ error: 'Bill No already exists. Please use a different Bill No.' });
      }
      return res.status(409).json({ error: `${key} already exists. Please use a different value.` });
    }
    if (error && error.name === 'ValidationError') {
      const firstError = Object.values(error.errors || {})[0];
      return res.status(400).json({ error: firstError?.message || error.message });
    }
    res.status(400).json({ error: error?.message || 'Failed to update bill' });
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

function formatDateIN(dateValue) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
}

function formatINR(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return number.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function buildBillPdfBuffer(bill) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = doc.page.margins.left;
      const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;

      const colors = {
        blue: '#1e40af',
        orange: '#ea580c',
        lightBlue: '#f0f9ff',
        grayText: '#555555',
        lightGrayLine: '#dddddd',
        amberBg: '#fffbeb',
        amber: '#f59e0b',
        amberText: '#b45309'
      };

      const labelFontSize = 9;
      const valueFontSize = 10;

      const drawSectionTitle = (title) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(colors.blue)
          .text(title, margin, doc.y);

        const y = doc.y + 3;
        doc
          .moveTo(margin, y)
          .lineTo(margin + contentWidth, y)
          .lineWidth(2)
          .strokeColor(colors.lightGrayLine)
          .stroke();
        doc.moveDown(0.8);
      };

      const drawField = ({ x, y, label, value, width }) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(labelFontSize)
          .fillColor(colors.grayText)
          .text(label, x, y, { width });

        doc
          .font('Helvetica')
          .fontSize(valueFontSize)
          .fillColor('#000000')
          .text(value || '', x, y + 12, { width });
      };

      // Company header
      const headerTop = doc.y;
      const leftW = contentWidth * 0.25;
      const centerW = contentWidth * 0.5;
      const rightW = contentWidth * 0.25;

      const propText = 'Prop: P. Kiran Kumar';
      const companyTitleLine1 = 'PAVAN KRISHNA TRAVELS';
      const companyTitleLine2 = '(GOUD)';
      const companyAddress = 'Shop No. 3-3-158/1, Enugulagadda,\nChowrastha, HANAMKONDA';

      // Left
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#444444')
        .text(propText, margin, headerTop, { width: leftW });

      const leftBottom = headerTop + doc.heightOfString(propText, { width: leftW }) + 2;

      // Center
      const centerX = margin + leftW;

      // Bus icon (vector) to match the HTML header feel
      const busW = 26;
      const busH = 12;
      const busX = centerX + (centerW - busW) / 2;
      const busY = headerTop + 2;
      doc
        .roundedRect(busX, busY, busW, busH, 2)
        .fillColor(colors.orange)
        .fill();
      doc
        .rect(busX + 4, busY + 3, 5, 4)
        .fillColor('#ffffff')
        .fill();
      doc
        .rect(busX + 10, busY + 3, 5, 4)
        .fillColor('#ffffff')
        .fill();
      doc
        .rect(busX + 16, busY + 3, 5, 4)
        .fillColor('#ffffff')
        .fill();
      doc
        .circle(busX + 7, busY + busH + 2, 2)
        .fillColor('#333333')
        .fill();
      doc
        .circle(busX + busW - 7, busY + busH + 2, 2)
        .fillColor('#333333')
        .fill();

      // Auto-fit title to avoid wrapping/overlap
      let titleFontSize = 16;
      doc.font('Helvetica-Bold');
      while (titleFontSize > 11 && doc.widthOfString(companyTitleLine1, { size: titleFontSize }) > centerW) {
        titleFontSize -= 1;
      }

      const titleY = busY + busH + 6;
      doc
        .font('Helvetica-Bold')
        .fontSize(titleFontSize)
        .fillColor(colors.blue)
        .text(companyTitleLine1, centerX, titleY, {
          width: centerW,
          align: 'center'
        });

      const titleLine1Height = doc.heightOfString(companyTitleLine1, { width: centerW, align: 'center' });
      const titleLine2Y = titleY + titleLine1Height + 1;
      doc
        .font('Helvetica-Bold')
        .fontSize(Math.max(12, titleFontSize - 1))
        .fillColor(colors.blue)
        .text(companyTitleLine2, centerX, titleLine2Y, {
          width: centerW,
          align: 'center'
        });

      const titleLine2Height = doc.heightOfString(companyTitleLine2, { width: centerW, align: 'center' });
      const addressY = titleLine2Y + titleLine2Height + 3;

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#444444')
        .text(companyAddress, centerX, addressY, {
          width: centerW,
          align: 'center'
        });

      const addressHeight = doc.heightOfString(companyAddress, { width: centerW, align: 'center' });
      const centerBottom = addressY + addressHeight + 2;

      // Right
      const rightX = margin + leftW + centerW;
      const rightLines = ['Cell: 98494 58582', '98499 44429', '98496 58850'];
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#333333')
        .text(rightLines[0], rightX, headerTop, { width: rightW, align: 'right' })
        .text(rightLines[1], rightX, headerTop + 12, { width: rightW, align: 'right' })
        .text(rightLines[2], rightX, headerTop + 24, { width: rightW, align: 'right' });

      const rightBottom = headerTop + 24 + doc.heightOfString(rightLines[2], { width: rightW, align: 'right' }) + 2;

      // Double border line
      const headerBottom = Math.max(leftBottom, centerBottom, rightBottom) + 10;
      doc
        .moveTo(margin, headerBottom)
        .lineTo(margin + contentWidth, headerBottom)
        .lineWidth(1)
        .strokeColor('#333333')
        .stroke();
      doc
        .moveTo(margin, headerBottom + 3)
        .lineTo(margin + contentWidth, headerBottom + 3)
        .lineWidth(1)
        .strokeColor('#333333')
        .stroke();
      doc.y = headerBottom + 10;

      // Bill header (filled band)
      const bandY = doc.y;
      doc
        .rect(margin, bandY, contentWidth, 44)
        .fillColor('#dbeafe')
        .fill();
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(colors.blue)
        .text('TRAVEL BILL', margin, bandY + 8, { width: contentWidth, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(colors.grayText)
        .text(
          `Bill No: ${bill.billNo || ''} | Date: ${formatDateIN(bill.date)}`,
          margin,
          bandY + 26,
          { width: contentWidth, align: 'center' }
        );
      doc.y = bandY + 54;

      // Customer Details
      drawSectionTitle('Customer Details');
      const rowY1 = doc.y;
      drawField({ x: margin, y: rowY1, width: contentWidth / 2 - 8, label: 'Name:', value: bill.customerName });
      drawField({
        x: margin + contentWidth / 2 + 8,
        y: rowY1,
        width: contentWidth / 2 - 8,
        label: 'Contact:',
        value: bill.contactNo
      });
      doc.y = rowY1 + 34;
      const rowY2 = doc.y;
      drawField({ x: margin, y: rowY2, width: contentWidth, label: 'Address:', value: bill.address });
      doc.y = rowY2 + 40;

      // Vehicle & Travel Details
      drawSectionTitle('Vehicle & Travel Details');
      const rowY3 = doc.y;
      const third = contentWidth / 3;
      drawField({ x: margin, y: rowY3, width: third - 10, label: 'Vehicle No:', value: bill.vehicleNo });
      drawField({ x: margin + third, y: rowY3, width: third - 10, label: 'Seats:', value: String(bill.seats ?? '') });
      drawField({
        x: margin + third * 2,
        y: rowY3,
        width: third,
        label: 'Destination:',
        value: bill.destination
      });
      doc.y = rowY3 + 34;
      const rowY4 = doc.y;
      drawField({
        x: margin,
        y: rowY4,
        width: contentWidth / 2 - 8,
        label: 'From:',
        value: formatDateIN(bill.dateFrom)
      });
      drawField({
        x: margin + contentWidth / 2 + 8,
        y: rowY4,
        width: contentWidth / 2 - 8,
        label: 'To:',
        value: formatDateIN(bill.dateTo)
      });
      doc.y = rowY4 + 42;

      // Billing Summary box
      const summaryTop = doc.y;
      const summaryHeight = 155;
      doc
        .rect(margin, summaryTop, contentWidth, summaryHeight)
        .fillColor(colors.lightBlue)
        .fill();
      doc
        .rect(margin, summaryTop, contentWidth, summaryHeight)
        .lineWidth(2)
        .strokeColor(colors.blue)
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(colors.blue)
        .text('Billing Summary', margin + 10, summaryTop + 10);

      const summaryLabelX = margin + 10;
      const summaryValueX = margin + contentWidth - 10;
      let sy = summaryTop + 32;

      const summaryRow = (label, value, { bold = false, blue = false } = {}) => {
        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .fillColor(blue ? colors.blue : colors.grayText)
          .text(label, summaryLabelX, sy, { width: contentWidth - 20 });

        doc
          .font(bold ? 'Helvetica-Bold' : 'Helvetica-Bold')
          .fontSize(9)
          .fillColor('#000000')
          .text(value, summaryLabelX, sy, {
            width: contentWidth - 20,
            align: 'right'
          });
        sy += 16;
      };

      const totalAmount = Number(bill.totalAmount) || 0;
      const advance = Number(bill.advance) || 0;
      const computedBalance = totalAmount - advance;

      summaryRow('Rate per KM:', `Rs. ${formatINR(bill.ratePerKm)}`);
      summaryRow('Total Amount:', `Rs. ${formatINR(totalAmount)}`);
      summaryRow('Advance Paid:', `Rs. ${formatINR(advance)}`);
      summaryRow('Balance:', `Rs. ${formatINR(computedBalance)}`);
      summaryRow('Driver Batta:', `Rs. ${formatINR(bill.driverBatta)}`);
      summaryRow('Extra Charges:', `Rs. ${formatINR(bill.extraCharges || 0)}`);

      // Grand total divider
      doc
        .moveTo(margin + 10, sy + 2)
        .lineTo(margin + contentWidth - 10, sy + 2)
        .lineWidth(2)
        .strokeColor(colors.blue)
        .stroke();
      sy += 10;
      summaryRow('Grand Total:', `Rs. ${formatINR(bill.grandTotal)}`, { bold: true, blue: true });

      doc
        .font('Helvetica-Oblique')
        .fontSize(8)
        .fillColor('#666666')
        .text(bill.amountWords || '', margin + 10, summaryTop + summaryHeight - 22, {
          width: contentWidth - 20,
          align: 'center'
        });

      doc.y = summaryTop + summaryHeight + 12;

      // Terms box
      const termsTop = doc.y;
      const termsHeight = 60;
      doc
        .rect(margin, termsTop, contentWidth, termsHeight)
        .fillColor(colors.amberBg)
        .fill();
      doc
        .rect(margin, termsTop, 4, termsHeight)
        .fillColor(colors.amber)
        .fill();
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(colors.amberText)
        .text('Important Terms:', margin + 10, termsTop + 10);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#000000')
        .text('• Parking, Tollgates, Check Post, R.T.O, and State Taxes will be paid by the party', margin + 16, termsTop + 26, {
          width: contentWidth - 26
        })
        .text('• Hyderabad entrance tax paid by party only', margin + 16, termsTop + 40, {
          width: contentWidth - 26
        });
      doc.y = termsTop + termsHeight + 12;

      // Route details / remarks
      if (bill.routeDetails) {
        drawSectionTitle('Route Details / Remarks');
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#000000')
          .text(String(bill.routeDetails), margin, doc.y, { width: contentWidth });
        doc.moveDown(0.8);
      }

      // Footer
      const footerLineY = doc.y + 6;
      doc
        .moveTo(margin, footerLineY)
        .lineTo(margin + contentWidth, footerLineY)
        .lineWidth(2)
        .strokeColor(colors.lightGrayLine)
        .stroke();
      doc.y = footerLineY + 10;
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#666666')
        .text('Thank you for choosing PAVAN KRISHNA TRAVELS!', margin, doc.y, { width: contentWidth, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#666666')
        .text('For any queries, please contact us at the numbers mentioned above.', margin, doc.y + 14, {
          width: contentWidth,
          align: 'center'
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Generate PDF and send email for bill
app.post('/api/bills/:id/send-email', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    if (!bill.customerEmail) {
      return res.status(400).json({ error: 'Customer email is missing' });
    }

    const pdfBuffer = await buildBillPdfBuffer(bill);

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
      text: `Dear ${bill.customerName},\n\nThank you for choosing PAVAN KRISHNA TRAVELS.\n\nPlease find attached your bill for the journey to ${bill.destination}.\n\nBill Number: ${bill.billNo}\nGrand Total: Rs. ${formatINR(bill.grandTotal)}\n\nFor any queries, please contact us at:\n98494 58582 | 98499 44429 | 98496 58850\n\nBest Regards,\nPAVAN KRISHNA TRAVELS`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">PAVAN KRISHNA TRAVELS</h2>
          <p>Dear <strong>${bill.customerName}</strong>,</p>
          <p>Thank you for choosing PAVAN KRISHNA TRAVELS.</p>
          <p>Please find attached your bill for the journey to <strong>${bill.destination}</strong>.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Bill Number:</strong> ${bill.billNo}</p>
            <p style="margin: 5px 0;"><strong>Grand Total:</strong> Rs. ${formatINR(bill.grandTotal)}</p>
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
