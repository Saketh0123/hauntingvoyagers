const mongoose = require('mongoose');

function generateBookingId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `BK${timestamp}${random}`;
}

const BookingSchema = new mongoose.Schema({
    bookingId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    travelDate: { type: String, required: true },
    vehicleType: { type: String, required: true },
    additionalRequirements: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' }
}, { timestamps: true });

const BookingModel = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);

async function getAllBookings() { return await BookingModel.find({}).sort({ createdAt: -1 }).lean(); }
async function createBooking(bookingData) { const doc = new BookingModel({ bookingId: generateBookingId(), name: bookingData.name, phone: bookingData.phone, travelDate: bookingData.travelDate, vehicleType: bookingData.vehicleType, additionalRequirements: bookingData.additionalRequirements || '', status: 'pending' }); await doc.save(); return doc.toObject(); }
async function getBookingById(id) { let booking = null; if (mongoose.isValidObjectId(id)) { booking = await BookingModel.findById(id).lean(); if (booking) return booking; } booking = await BookingModel.findOne({ bookingId: id }).lean(); return booking; }
async function updateBooking(id, updateData) { const query = mongoose.isValidObjectId(id) ? { _id: id } : { bookingId: id }; const booking = await BookingModel.findOneAndUpdate(query, { $set: updateData }, { new: true }).lean(); return booking; }
async function deleteBooking(id) { const query = mongoose.isValidObjectId(id) ? { _id: id } : { bookingId: id }; const result = await BookingModel.findOneAndDelete(query); return !!result; }

module.exports = { getAllBookings, createBooking, getBookingById, updateBooking, deleteBooking, generateBookingId };
