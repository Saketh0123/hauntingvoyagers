// Configuration
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';
const ADMIN_PASSWORD = 'admin123'; // Change this in production

// State
let currentTours = [];
let editingTourId = null;

// Login handling
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        loadTours();
    } else {
        const errorEl = document.getElementById('loginError');
        errorEl.textContent = 'Incorrect password';
        errorEl.classList.remove('hidden');
    }
});

function logout() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
}

// Tab switching
function showTab(tabName, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'bg-gray-200');
        btn.classList.add('bg-gray-200');
    });
    
    if (tabName === 'tours') {
        document.getElementById('toursTab').classList.remove('hidden');
        if (event && event.target) {
            event.target.classList.add('active');
            event.target.classList.remove('bg-gray-200');
        }
        loadTours();
    } else if (tabName === 'add') {
        document.getElementById('addTab').classList.remove('hidden');
        if (event && event.target) {
            event.target.classList.add('active');
            event.target.classList.remove('bg-gray-200');
        }
        resetForm();
    }
}

// Load all tours
async function loadTours() {
    try {
        const response = await fetch(`${API_BASE_URL}/tours?status=all`);
        const tours = await response.json();
        currentTours = tours;
        displayTours(tours);
    } catch (error) {
        console.error('Error loading tours:', error);
        document.getElementById('toursList').innerHTML = '<p class="text-red-500">Error loading tours. Make sure the API server is running.</p>';
    }
}

// Display tours in list
function displayTours(tours) {
    const listEl = document.getElementById('toursList');
    
    if (tours.length === 0) {
        listEl.innerHTML = '<p class="text-gray-500">No tours yet. Add your first tour!</p>';
        return;
    }
    
    listEl.innerHTML = tours.map(tour => `
        <div class="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition">
            <div class="flex-1">
                <div class="flex items-center gap-3">
                    <h3 class="font-bold text-lg">${tour.title}</h3>
                    <span class="px-2 py-1 rounded text-xs font-semibold ${tour.category === 'indian' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}">
                        ${tour.category === 'indian' ? 'Indian' : 'International'}
                    </span>
                    <span class="px-2 py-1 rounded text-xs ${tour.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${tour.status}
                    </span>
                    ${tour.featured ? '<span class="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Featured</span>' : ''}
                </div>
                <p class="text-sm text-gray-600 mt-1">${tour.location}, ${tour.country} • ${tour.duration} • ₹${tour.price.toLocaleString()}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="editTour('${tour._id}')" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                    Edit
                </button>
                <button onclick="deleteTour('${tour._id}', '${tour.title}')" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Edit tour
function editTour(tourId) {
    const tour = currentTours.find(t => t._id === tourId);
    if (!tour) return;
    
    editingTourId = tourId;
    
    // Fill basic fields
    document.getElementById('tourId').value = tour._id;
    document.getElementById('title').value = tour.title;
    document.getElementById('slug').value = tour.slug;
    document.getElementById('category').value = tour.category;
    document.getElementById('location').value = tour.location;
    document.getElementById('country').value = tour.country;
    document.getElementById('duration').value = tour.duration;
    document.getElementById('difficulty').value = tour.difficulty;
    document.getElementById('price').value = tour.price;
    document.getElementById('groupSize').value = tour.groupSize;
    document.getElementById('description').value = tour.description;
    document.getElementById('featured').checked = tour.featured;
    document.getElementById('active').checked = tour.status === 'active';
    
    // Fill hero image
    if (tour.images?.hero) {
        document.getElementById('heroImageUrl').value = tour.images.hero;
    }
    
    // Fill gallery images
    const galleryContainer = document.getElementById('galleryInputs');
    galleryContainer.innerHTML = '';
    if (tour.images?.gallery && tour.images.gallery.length > 0) {
        tour.images.gallery.forEach(url => {
            addGalleryInput(url);
        });
    } else {
        addGalleryInput();
    }
    
    // Fill highlights
    const highlightsContainer = document.getElementById('highlightsInputs');
    highlightsContainer.innerHTML = '';
    if (tour.highlights && tour.highlights.length > 0) {
        tour.highlights.forEach(highlight => {
            addHighlight(highlight);
        });
    } else {
        addHighlight();
    }
    
    // Fill itinerary
    const itineraryContainer = document.getElementById('itineraryInputs');
    itineraryContainer.innerHTML = '';
    if (tour.itinerary && tour.itinerary.length > 0) {
        tour.itinerary.forEach(day => {
            addItineraryDay(day);
        });
    } else {
        addItineraryDay();
    }
    
    // Fill inclusions
    const inclusionsContainer = document.getElementById('inclusionsInputs');
    inclusionsContainer.innerHTML = '';
    if (tour.inclusions && tour.inclusions.length > 0) {
        tour.inclusions.forEach(item => {
            addInclusion(item);
        });
    } else {
        addInclusion();
    }
    
    // Fill exclusions
    const exclusionsContainer = document.getElementById('exclusionsInputs');
    exclusionsContainer.innerHTML = '';
    if (tour.exclusions && tour.exclusions.length > 0) {
        tour.exclusions.forEach(item => {
            addExclusion(item);
        });
    } else {
        addExclusion();
    }
    
    // Fill available dates
    const datesContainer = document.getElementById('datesInputs');
    datesContainer.innerHTML = '';
    if (tour.availableDates && tour.availableDates.length > 0) {
        tour.availableDates.forEach(date => {
            addDateSlot(date);
        });
    } else {
        addDateSlot();
    }
    
    // Switch to add tab
    showTab('add', null);
    window.scrollTo(0, 0);
}

// Delete tour
async function deleteTour(tourId, tourTitle) {
    if (!confirm(`Are you sure you want to delete "${tourTitle}"?`)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/tours/${tourId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Tour deleted successfully!');
            loadTours();
        } else {
            alert('Error deleting tour');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting tour');
    }
}

// Form submission
document.getElementById('tourForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Auto-generate slug from title
    const title = document.getElementById('title').value;
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now(); // Add timestamp to ensure uniqueness
    
    // Collect form data
    const tourData = {
        title: title,
        slug: slug,
        category: document.getElementById('category').value,
        location: document.getElementById('location').value,
        country: document.getElementById('country').value,
        duration: document.getElementById('duration').value,
        difficulty: document.getElementById('difficulty').value,
        price: parseFloat(document.getElementById('price').value),
        groupSize: document.getElementById('groupSize').value,
        description: document.getElementById('description').value,
        featured: document.getElementById('featured').checked,
        status: document.getElementById('active').checked ? 'active' : 'draft',
        images: {
            hero: document.getElementById('heroImageUrl').value || '',
            gallery: await collectGalleryImages()
        },
        highlights: collectInputValues('.highlight-input'),
        itinerary: collectItinerary(),
        inclusions: collectInputValues('.inclusion-input'),
        exclusions: collectInputValues('.exclusion-input'),
        availableDates: collectDates()
    };
    
    try {
        const tourId = document.getElementById('tourId').value;
        const url = tourId ? `${API_BASE_URL}/tours/${tourId}` : `${API_BASE_URL}/tours`;
        const method = tourId ? 'PUT' : 'POST';
        
        console.log('Sending tour data:', tourData);
        console.log('API URL:', url);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tourData)
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const savedTour = await response.json();
            console.log('Tour saved:', savedTour);
            alert(tourId ? 'Tour updated successfully!' : 'Tour created successfully!');
            resetForm();
            showTab('tours', null);
            loadTours();
        } else {
            const error = await response.json();
            console.error('Server error:', error);
            alert('Error saving tour: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving tour. Make sure the API server is running. Check console for details.');
    }
});

// Helper functions for dynamic inputs
function addGalleryInput(url = '') {
    const container = document.getElementById('galleryInputs');
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-start';
    div.innerHTML = `
        <input type="url" placeholder="Gallery image URL" value="${url}" class="gallery-url flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500">
        <input type="file" accept="image/*" class="gallery-file flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500">
        <button type="button" onclick="removeGalleryInput(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Remove</button>
    `;
    container.appendChild(div);
}

function removeGalleryInput(btn) {
    btn.parentElement.remove();
}

function addHighlight(value = '') {
    const container = document.getElementById('highlightsInputs');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter highlight';
    input.value = value;
    input.className = 'highlight-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500';
    container.appendChild(input);
}

function addItineraryDay(day = null) {
    const container = document.getElementById('itineraryInputs');
    const div = document.createElement('div');
    div.className = 'itinerary-day border rounded-lg p-4';
    const dayNumber = day?.day || container.children.length + 1;
    div.innerHTML = `
        <div class="grid md:grid-cols-2 gap-3">
            <input type="number" placeholder="Day number" value="${dayNumber}" class="day-number px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500">
            <input type="text" placeholder="Day title" value="${day?.title || ''}" class="day-title px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500">
        </div>
        <textarea placeholder="Day description" class="day-description mt-2 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" rows="2">${day?.description || ''}</textarea>
        <button type="button" onclick="removeItineraryDay(this)" class="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">Remove Day</button>
    `;
    container.appendChild(div);
}

function removeItineraryDay(btn) {
    btn.parentElement.remove();
}

function addInclusion(value = '') {
    const container = document.getElementById('inclusionsInputs');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter inclusion';
    input.value = value;
    input.className = 'inclusion-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500';
    container.appendChild(input);
}

function addExclusion(value = '') {
    const container = document.getElementById('exclusionsInputs');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter exclusion';
    input.value = value;
    input.className = 'exclusion-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500';
    container.appendChild(input);
}

function addDateSlot(date = null) {
    const container = document.getElementById('datesInputs');
    const div = document.createElement('div');
    div.className = 'date-slot border rounded-lg p-4';
    
    const startDate = date?.startDate ? new Date(date.startDate).toISOString().split('T')[0] : '';
    const endDate = date?.endDate ? new Date(date.endDate).toISOString().split('T')[0] : '';
    
    div.innerHTML = `
        <div class="grid md:grid-cols-2 gap-3">
            <input type="date" value="${startDate}" class="start-date px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="Start Date">
            <input type="date" value="${endDate}" class="end-date px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500" placeholder="End Date">
        </div>
        <button type="button" onclick="removeDateSlot(this)" class="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">Remove</button>
    `;
    container.appendChild(div);
}

function removeDateSlot(btn) {
    btn.parentElement.remove();
}

// Data collection helpers
function collectInputValues(selector) {
    return Array.from(document.querySelectorAll(selector))
        .map(input => input.value.trim())
        .filter(val => val !== '');
}

function collectItinerary() {
    const days = document.querySelectorAll('.itinerary-day');
    return Array.from(days).map(day => ({
        day: parseInt(day.querySelector('.day-number').value),
        title: day.querySelector('.day-title').value.trim(),
        description: day.querySelector('.day-description').value.trim()
    })).filter(day => day.title || day.description);
}

function collectDates() {
    const slots = document.querySelectorAll('.date-slot');
    return Array.from(slots).map(slot => ({
        startDate: slot.querySelector('.start-date').value,
        endDate: slot.querySelector('.end-date').value,
        spotsAvailable: 20 // Default spots available
    })).filter(date => date.startDate && date.endDate);
}

async function collectGalleryImages() {
    const containers = document.querySelectorAll('#galleryInputs > div');
    const images = [];
    
    for (const container of containers) {
        const urlInput = container.querySelector('.gallery-url');
        if (urlInput && urlInput.value.trim()) {
            images.push(urlInput.value.trim());
        }
    }
    
    return images;
}

// Image upload (placeholder - implement with your preferred service)
async function uploadImage(fileInput) {
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        return '';
    }
    
    // TODO: Implement actual image upload to Cloudinary/ImgBB/etc
    // For now, just return empty string - user should use URL inputs instead
    console.warn('Image upload not yet implemented. Please use image URLs.');
    return '';
}

// Reset form
function resetForm() {
    document.getElementById('tourForm').reset();
    document.getElementById('tourId').value = '';
    editingTourId = null;
    
    // Reset dynamic fields to have one empty input each
    document.getElementById('galleryInputs').innerHTML = '';
    addGalleryInput();
    
    document.getElementById('highlightsInputs').innerHTML = '';
    addHighlight();
    
    document.getElementById('itineraryInputs').innerHTML = '';
    addItineraryDay();
    
    document.getElementById('inclusionsInputs').innerHTML = '';
    addInclusion();
    
    document.getElementById('exclusionsInputs').innerHTML = '';
    addExclusion();
    
    document.getElementById('datesInputs').innerHTML = '';
    addDateSlot();
}
