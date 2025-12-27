const mongoose = require('mongoose');

function generateBookingId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `BK${timestamp}${random}`;
}

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  travelDate: { type: Date, required: true },
  vehicleType: { type: String, required: true },
  additionalRequirements: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' }
}, { timestamps: true });

bookingSchema.pre('save', function(next) {
  if (!this.bookingId) {
    this.bookingId = generateBookingId();
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.generateBookingId = generateBookingId;
