const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    unique: true,
    enum: ['site_settings']
  },
  company: {
    name: { type: String, default: 'Pawan Krishna Tours & Travells' },
    logoUrl: { type: String, default: '' }
  },
  heroImages: [{
    type: String
  }],
  heroContent: {
    mainHeading: { type: String, default: 'Discover Your Next Adventure' },
    description: { type: String, default: 'Explore breathtaking destinations across India and around the world. Let us craft your perfect journey.' },
    primaryButtonText: { type: String, default: 'Explore All Trips' },
    secondaryButtonText: { type: String, default: 'Indian Trips' }
  },
  socialMedia: {
    facebook: { type: String, default: 'https://www.facebook.com/profile.php?id=61553794382346' },
    instagram: { type: String, default: 'https://www.instagram.com/haunting_voyagers/' },
    whatsapp: { type: String, default: '919502606607' }
  },
  footer: {
    email: { type: String, default: 'info@travelagency.com' },
    phone: { type: String, default: '+91 98765 43210' },
    copyright: { type: String, default: '© 2025 Travel Agency. All rights reserved.' },
    developerCredit: { type: String, default: '' },
    developerLink: { type: String, default: '' }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
