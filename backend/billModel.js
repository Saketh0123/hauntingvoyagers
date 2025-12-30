const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    billNo: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    seats: { type: Number, required: true },
    vehicleNo: { type: String, required: true },
    customerName: { type: String, required: true },
    contactNo: { type: String, required: true },
    customerEmail: { type: String, required: true },
    address: { type: String, required: true },
    destination: { type: String, required: true },
    dateFrom: { type: Date, required: true },
    dateTo: { type: Date, required: true },
    ratePerKm: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    amountWords: { type: String, required: true },
    advance: { type: Number, required: true, default: 0 },
    balance: { type: Number, required: true },
    driverBatta: { type: Number, required: true, default: 0 },
    extraCharges: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    routeDetails: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bill', billSchema);
