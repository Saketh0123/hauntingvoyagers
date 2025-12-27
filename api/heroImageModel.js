const mongoose = require('mongoose');

const heroImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('HeroImage', heroImageSchema);
