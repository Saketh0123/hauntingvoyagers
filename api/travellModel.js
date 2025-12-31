const mongoose = require('mongoose');

const travellSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  image: { type: String, required: true },
  seats: { type: Number, required: true },
  pricePerKm: { type: Number, required: true },
  features: [{ type: String }],
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

travellSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
  }
  next();
});

module.exports = mongoose.model('Travell', travellSchema);
