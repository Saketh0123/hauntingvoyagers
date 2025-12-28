const fs = require('fs');
const path = require('path');

const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');

// Initialize bookings file if it doesn't exist
function initBookingsFile() {
    if (!fs.existsSync(BOOKINGS_FILE)) {
        fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([]));
    }
}

// Generate unique booking ID
function generateBookingId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `BK${timestamp}${random}`;
}

// Read all bookings
function getAllBookings() {
    initBookingsFile();
    const data = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
    return JSON.parse(data);
}

// Save bookings
function saveBookings(bookings) {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
}

// Create new booking
function createBooking(bookingData) {
    const bookings = getAllBookings();
    const newBooking = {
        _id: generateBookingId(),
        bookingId: generateBookingId(),
        name: bookingData.name,
        phone: bookingData.phone,
        travelDate: bookingData.travelDate,
        vehicleType: bookingData.vehicleType,
        additionalRequirements: bookingData.additionalRequirements || '',
        status: 'pending', // pending, confirmed, cancelled
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    bookings.push(newBooking);
    saveBookings(bookings);
    return newBooking;
}

// Get booking by ID
function getBookingById(id) {
    const bookings = getAllBookings();
    return bookings.find(b => b._id === id || b.bookingId === id);
}

// Update booking
function updateBooking(id, updateData) {
    const bookings = getAllBookings();
    const index = bookings.findIndex(b => b._id === id || b.bookingId === id);
    if (index === -1) return null;
    
    bookings[index] = {
        ...bookings[index],
        ...updateData,
        updatedAt: new Date().toISOString()
    };
    saveBookings(bookings);
    return bookings[index];
}

// Delete booking
function deleteBooking(id) {
    const bookings = getAllBookings();
    const filtered = bookings.filter(b => b._id !== id && b.bookingId !== id);
    if (filtered.length === bookings.length) return false;
    saveBookings(filtered);
    return true;
}

module.exports = {
    getAllBookings,
    createBooking,
    getBookingById,
    updateBooking,
    deleteBooking,
    generateBookingId
};
