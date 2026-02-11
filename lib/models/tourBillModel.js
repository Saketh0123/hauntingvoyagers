const mongoose = require('mongoose');

const tourBillSchema = new mongoose.Schema({
  billNo: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  // Customer details
  customerName: { type: String, required: true },
  contactNo: { type: String, required: true },
  customerEmail: { type: String, required: true },
  address: { type: String, required: true },
  numberOfPersons: { type: Number, required: true },
  // Tour details
  tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tour' },
  tourName: { type: String, required: true },
  destination: { type: String, required: true },
  duration: { type: String, required: true },
  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },
  // Itinerary
  itinerary: [{
    day: { type: Number },
    title: { type: String },
    description: { type: String }
  }],
  // Pricing
  pricePerPerson: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  amountWords: { type: String, required: true },
  advance: { type: Number, required: true, default: 0 },
  balance: { type: Number, required: true },
  extraCharges: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  // Additional
  inclusions: [{ type: String }],
  exclusions: [{ type: String }],
  routeDetails: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.TourBill || mongoose.model('TourBill', tourBillSchema);
