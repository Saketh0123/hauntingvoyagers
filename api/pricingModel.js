const mongoose = require('mongoose');

const PricingCardSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  price: { type: String, required: true }, // e.g., "3,500" or "22"
  priceUnit: { type: String, default: '/day' }, // '/day' or '/km'
  features: { type: [String], default: [] },
  isPopular: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  bgGradient: { type: String, default: 'from-orange-50 to-pink-50' }
}, { timestamps: true });

module.exports = mongoose.model('PricingCard', PricingCardSchema);
