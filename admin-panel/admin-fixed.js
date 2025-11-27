const API_URL = 'http://localhost:3000/api';
const ADMIN_PASSWORD = 'admin123';
let allTours = [];

// Login
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        loadTours();
    } else {
        const error = document.getElementById('loginError');
        error.textContent = 'Invalid password';
        error.classList.remove('hidden');
    }
});

function logout() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
}

// Mobile Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

// View Navigation
function showView(viewName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Hide all views
    document.querySelectorAll('.view-content').forEach(view => {
        view.classList.add('hidden');
    });
    
    // Show selected view
    const viewTitles = {
        'tours': 'Tours Management',
        'dates': 'Available Dates Management',
        'pricing': 'Tour Pricing Overview',
        'duration': 'Tour Durations'
    };
    
    document.getElementById('viewTitle').textContent = viewTitles[viewName];
    
    if (viewName === 'tours') {
        document.getElementById('toursView').classList.remove('hidden');
        loadTours();
    } else if (viewName === 'dates') {
        document.getElementById('datesView').classList.remove('hidden');
        loadDatesManagement();
    } else if (viewName === 'pricing') {
        document.getElementById('pricingView').classList.remove('hidden');
        loadPricingView();
    } else if (viewName === 'duration') {
        document.getElementById('durationView').classList.remove('hidden');
        loadDurationView();
    }
    
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

// Modal functions
function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add New Tour';
    document.getElementById('tourId').value = '';
    document.getElementById('existingSlug').value = '';
    document.getElementById('tourForm').reset();
    document.getElementById('tourModal').classList.add('active');
}

function closeModal() {
    document.getElementById('tourModal').classList.remove('active');
    resetForm();
}

function openEditModal(tour) {
    document.getElementById('modalTitle').textContent = 'Edit Tour';
    document.getElementById('tourModal').classList.add('active');
    populateForm(tour);
}

// Load tours
async function loadTours() {
    try {
        const response = await fetch(`${API_URL}/tours?status=all`);
        allTours = await response.json();
        renderToursTable(allTours);
    } catch (error) {
        console.error('Error loading tours:', error);
        document.getElementById('toursTableBody').innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-500">Error loading tours</td></tr>';
    }
}

function renderToursTable(tours) {
    const tbody = document.getElementById('toursTableBody');
    
    if (tours.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No tours found</td></tr>';
        return;
    }
    
    tbody.innerHTML = tours.map(tour => {
        const categoryBadge = tour.category === 'indian' 
            ? '<span class="badge badge-indian">Indian</span>' 
            : '<span class="badge badge-international">International</span>';
        
        const availableDates = tour.availableDates && tour.availableDates.length > 0
            ? `${tour.availableDates.length} slot(s)`
            : 'No dates';
        
        return `
            <tr>
                <td><strong>${tour.title}</strong></td>
                <td>${tour.location || '-'}</td>
                <td>${categoryBadge}</td>
                <td>${tour.duration || '-'}</td>
                <td>₹${(tour.price || 0).toLocaleString()}</td>
                <td>${availableDates}</td>
                <td>
                    <button onclick='editTour("${tour._id}")' class="btn-edit">Edit</button>
                    <button onclick='deleteTour("${tour._id}", "${tour.title}")' class="btn-delete ml-2">Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function editTour(id) {
    try {
        const tour = allTours.find(t => t._id === id);
        if (tour) {
            openEditModal(tour);
        }
    } catch (error) {
        console.error('Error loading tour:', error);
        alert('Error loading tour data');
    }
}

async function deleteTour(id, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/tours/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Tour deleted successfully');
            loadTours();
        } else {
            alert('Error deleting tour');
        }
    } catch (error) {
        console.error('Error deleting tour:', error);
        alert('Error deleting tour');
    }
}

// Form population
function populateForm(tour) {
    document.getElementById('tourId').value = tour._id;
    document.getElementById('existingSlug').value = tour.slug; // Store existing slug
    document.getElementById('title').value = tour.title;
    document.getElementById('category').value = tour.category;
    document.getElementById('location').value = tour.location || '';
    document.getElementById('country').value = tour.country || '';
    document.getElementById('duration').value = tour.duration || '';
    document.getElementById('difficulty').value = tour.difficulty || 'Easy';
    document.getElementById('price').value = tour.price || '';
    document.getElementById('groupSize').value = tour.groupSize || '2-8 people';
    document.getElementById('description').value = tour.description || '';
    document.getElementById('heroImageUrl').value = tour.images?.hero || '';
    document.getElementById('featured').checked = tour.featured || false;
    document.getElementById('active').checked = tour.status === 'active';
    
    // Populate highlights
    const highlightsContainer = document.getElementById('highlightsInputs');
    highlightsContainer.innerHTML = '';
    if (tour.highlights && tour.highlights.length > 0) {
        tour.highlights.forEach(highlight => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'highlight-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500';
            input.value = highlight;
            highlightsContainer.appendChild(input);
        });
    } else {
        addHighlight();
    }
    
    // Populate itinerary
    const itineraryContainer = document.getElementById('itineraryInputs');
    itineraryContainer.innerHTML = '';
    if (tour.itinerary && tour.itinerary.length > 0) {
        tour.itinerary.forEach((day, index) => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'itinerary-day border rounded-lg p-3';
            dayDiv.innerHTML = `
                <div class="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Day" class="day-number px-3 py-2 border rounded" value="${index + 1}">
                    <input type="text" placeholder="Title" class="day-title px-3 py-2 border rounded" value="${day.title || ''}">
                </div>
                <textarea placeholder="Description" class="day-description mt-2 w-full px-3 py-2 border rounded" rows="2">${day.description || ''}</textarea>
                <button type="button" onclick="removeItineraryDay(this)" class="mt-1 px-2 py-1 bg-red-500 text-white rounded text-xs">Remove</button>
            `;
            itineraryContainer.appendChild(dayDiv);
        });
    } else {
        addItineraryDay();
    }
    
    // Populate inclusions
    const inclusionsContainer = document.getElementById('inclusionsInputs');
    inclusionsContainer.innerHTML = '';
    if (tour.inclusions && tour.inclusions.length > 0) {
        tour.inclusions.forEach(inclusion => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'inclusion-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500';
            input.value = inclusion;
            inclusionsContainer.appendChild(input);
        });
    } else {
        addInclusion();
    }
    
    // Populate exclusions
    const exclusionsContainer = document.getElementById('exclusionsInputs');
    exclusionsContainer.innerHTML = '';
    if (tour.exclusions && tour.exclusions.length > 0) {
        tour.exclusions.forEach(exclusion => {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'exclusion-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500';
            input.value = exclusion;
            exclusionsContainer.appendChild(input);
        });
    } else {
        addExclusion();
    }
    
    // Populate dates
    const datesContainer = document.getElementById('datesInputs');
    datesContainer.innerHTML = '';
    if (tour.availableDates && tour.availableDates.length > 0) {
        tour.availableDates.forEach(dateSlot => {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'date-slot border rounded-lg p-3';
            slotDiv.innerHTML = `
                <div class="grid grid-cols-2 gap-3">
                    <input type="date" class="start-date px-3 py-2 border rounded" value="${dateSlot.startDate ? dateSlot.startDate.split('T')[0] : ''}">
                    <input type="date" class="end-date px-3 py-2 border rounded" value="${dateSlot.endDate ? dateSlot.endDate.split('T')[0] : ''}">
                </div>
                <button type="button" onclick="removeDateSlot(this)" class="mt-2 px-2 py-1 bg-red-500 text-white rounded text-xs">Remove</button>
            `;
            datesContainer.appendChild(slotDiv);
        });
    } else {
        addDateSlot();
    }
}

// Form submission
document.getElementById('tourForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const tourId = document.getElementById('tourId').value;
    const existingSlug = document.getElementById('existingSlug').value;
    const title = document.getElementById('title').value;
    
    // For new tours, generate slug. For existing, keep the same slug
    const slug = existingSlug || (title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now());
    
    const tourData = {
        title: title,
        slug: slug,
        category: document.getElementById('category').value,
        location: document.getElementById('location').value,
        country: document.getElementById('country').value,
        duration: document.getElementById('duration').value,
        price: parseFloat(document.getElementById('price').value),
        currency: '₹',
        difficulty: document.getElementById('difficulty').value.toLowerCase(),
        groupSize: document.getElementById('groupSize').value,
        description: document.getElementById('description').value,
        highlights: collectHighlights(),
        itinerary: collectItinerary(),
        inclusions: collectInclusions(),
        exclusions: collectExclusions(),
        images: {
            hero: document.getElementById('heroImageUrl').value || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
            gallery: []
        },
        availableDates: collectDates(),
        featured: document.getElementById('featured').checked,
        status: document.getElementById('active').checked ? 'active' : 'draft'
    };
    
    try {
        const url = tourId ? `${API_URL}/tours/${tourId}` : `${API_URL}/tours`;
        const method = tourId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tourData)
        });
        
        if (response.ok) {
            alert('Tour saved successfully!');
            closeModal();
            loadTours();
        } else {
            const error = await response.json();
            alert('Error saving tour: ' + (error.error || error.message || 'Unknown error'));
            console.error('Server error:', error);
        }
    } catch (error) {
        console.error('Error saving tour:', error);
        alert('Error saving tour: ' + error.message);
    }
});

// Helper functions
function collectHighlights() {
    const inputs = document.querySelectorAll('.highlight-input');
    return Array.from(inputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');
}

function collectItinerary() {
    const days = document.querySelectorAll('.itinerary-day');
    return Array.from(days).map((day, index) => ({
        day: parseInt(day.querySelector('.day-number').value) || index + 1,
        title: day.querySelector('.day-title').value,
        description: day.querySelector('.day-description').value
    })).filter(day => day.title || day.description);
}

function collectInclusions() {
    const inputs = document.querySelectorAll('.inclusion-input');
    return Array.from(inputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');
}

function collectExclusions() {
    const inputs = document.querySelectorAll('.exclusion-input');
    return Array.from(inputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');
}

function collectDates() {
    const slots = document.querySelectorAll('.date-slot');
    return Array.from(slots).map(slot => ({
        startDate: slot.querySelector('.start-date').value,
        endDate: slot.querySelector('.end-date').value,
        spotsAvailable: 20
    })).filter(slot => slot.startDate && slot.endDate);
}

// Dynamic field functions
function addHighlight() {
    const container = document.getElementById('highlightsInputs');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter highlight';
    input.className = 'highlight-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500';
    container.appendChild(input);
}

function addItineraryDay() {
    const container = document.getElementById('itineraryInputs');
    const currentDays = container.querySelectorAll('.itinerary-day').length;
    const dayDiv = document.createElement('div');
    dayDiv.className = 'itinerary-day border rounded-lg p-3';
    dayDiv.innerHTML = `
        <div class="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Day" class="day-number px-3 py-2 border rounded" value="${currentDays + 1}">
            <input type="text" placeholder="Title" class="day-title px-3 py-2 border rounded">
        </div>
        <textarea placeholder="Description" class="day-description mt-2 w-full px-3 py-2 border rounded" rows="2"></textarea>
        <button type="button" onclick="removeItineraryDay(this)" class="mt-1 px-2 py-1 bg-red-500 text-white rounded text-xs">Remove</button>
    `;
    container.appendChild(dayDiv);
}

function removeItineraryDay(btn) {
    btn.closest('.itinerary-day').remove();
}

function addInclusion() {
    const container = document.getElementById('inclusionsInputs');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter inclusion';
    input.className = 'inclusion-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500';
    container.appendChild(input);
}

function addExclusion() {
    const container = document.getElementById('exclusionsInputs');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter exclusion';
    input.className = 'exclusion-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500';
    container.appendChild(input);
}

function addDateSlot() {
    const container = document.getElementById('datesInputs');
    const slotDiv = document.createElement('div');
    slotDiv.className = 'date-slot border rounded-lg p-3';
    slotDiv.innerHTML = `
        <div class="grid grid-cols-2 gap-3">
            <input type="date" class="start-date px-3 py-2 border rounded" placeholder="Start Date">
            <input type="date" class="end-date px-3 py-2 border rounded" placeholder="End Date">
        </div>
        <button type="button" onclick="removeDateSlot(this)" class="mt-2 px-2 py-1 bg-red-500 text-white rounded text-xs">Remove</button>
    `;
    container.appendChild(slotDiv);
}

function removeDateSlot(btn) {
    btn.closest('.date-slot').remove();
}

function resetForm() {
    document.getElementById('tourForm').reset();
    document.getElementById('tourId').value = '';
    document.getElementById('existingSlug').value = '';
    
    // Reset dynamic fields to one empty field each
    document.getElementById('highlightsInputs').innerHTML = '<input type="text" placeholder="Enter highlight" class="highlight-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">';
    
    document.getElementById('itineraryInputs').innerHTML = `
        <div class="itinerary-day border rounded-lg p-3">
            <div class="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Day" class="day-number px-3 py-2 border rounded" value="1">
                <input type="text" placeholder="Title" class="day-title px-3 py-2 border rounded">
            </div>
            <textarea placeholder="Description" class="day-description mt-2 w-full px-3 py-2 border rounded" rows="2"></textarea>
            <button type="button" onclick="removeItineraryDay(this)" class="mt-1 px-2 py-1 bg-red-500 text-white rounded text-xs">Remove</button>
        </div>
    `;
    
    document.getElementById('inclusionsInputs').innerHTML = '<input type="text" placeholder="Enter inclusion" class="inclusion-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">';
    
    document.getElementById('exclusionsInputs').innerHTML = '<input type="text" placeholder="Enter exclusion" class="exclusion-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">';
    
    document.getElementById('datesInputs').innerHTML = `
        <div class="date-slot border rounded-lg p-3">
            <div class="grid grid-cols-2 gap-3">
                <input type="date" class="start-date px-3 py-2 border rounded" placeholder="Start Date">
                <input type="date" class="end-date px-3 py-2 border rounded" placeholder="End Date">
            </div>
            <button type="button" onclick="removeDateSlot(this)" class="mt-2 px-2 py-1 bg-red-500 text-white rounded text-xs">Remove</button>
        </div>
    `;
}

// Dates Management View
async function loadDatesManagement() {
    const container = document.getElementById('datesManagementContent');
    if (allTours.length === 0) await loadTours();
    
    if (allTours.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No tours found. Add tours first.</p>';
        return;
    }
    
    container.innerHTML = allTours.map(tour => `
        <div class="border rounded-lg p-4 mb-4">
            <h4 class="font-bold text-lg mb-3">${tour.title}</h4>
            <div class="space-y-2 mb-3" id="dates-${tour._id}">
                ${renderTourDates(tour)}
            </div>
            <button onclick="addNewDateToTour('${tour._id}')" class="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                + Add Date
            </button>
        </div>
    `).join('');
}

function renderTourDates(tour) {
    if (!tour.availableDates || tour.availableDates.length === 0) {
        return '<p class="text-sm text-gray-500">No dates available</p>';
    }
    
    return tour.availableDates.map((date, index) => {
        const startDate = date.startDate ? new Date(date.startDate).toLocaleDateString() : 'N/A';
        const endDate = date.endDate ? new Date(date.endDate).toLocaleDateString() : 'N/A';
        return `
            <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span class="text-sm">${startDate} - ${endDate} (${date.spotsAvailable} spots)</span>
                <button onclick="removeDateFromTour('${tour._id}', ${index})" class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                    Delete
                </button>
            </div>
        `;
    }).join('');
}

async function addNewDateToTour(tourId) {
    const startDate = prompt('Enter start date (YYYY-MM-DD):');
    const endDate = prompt('Enter end date (YYYY-MM-DD):');
    
    if (!startDate || !endDate) return;
    
    const tour = allTours.find(t => t._id === tourId);
    if (!tour) return;
    
    tour.availableDates = tour.availableDates || [];
    tour.availableDates.push({
        startDate: startDate,
        endDate: endDate,
        spotsAvailable: 20
    });
    
    await saveTourDates(tour);
}

async function removeDateFromTour(tourId, dateIndex) {
    if (!confirm('Remove this date?')) return;
    
    const tour = allTours.find(t => t._id === tourId);
    if (!tour) return;
    
    tour.availableDates.splice(dateIndex, 1);
    await saveTourDates(tour);
}

async function saveTourDates(tour) {
    try {
        const response = await fetch(`${API_URL}/tours/${tour._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tour)
        });
        
        if (response.ok) {
            alert('Dates updated successfully!');
            await loadTours();
            loadDatesManagement();
        } else {
            const error = await response.json();
            alert('Error updating dates: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving dates:', error);
        alert('Error saving dates');
    }
}

// Pricing View
async function loadPricingView() {
    const container = document.getElementById('pricingContent');
    if (allTours.length === 0) await loadTours();
    
    if (allTours.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No tours found.</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Tour Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Group Size</th>
                    </tr>
                </thead>
                <tbody>
                    ${allTours.map(tour => `
                        <tr>
                            <td><strong>${tour.title}</strong></td>
                            <td><span class="badge badge-${tour.category}">${tour.category === 'indian' ? 'Indian' : 'International'}</span></td>
                            <td><strong>₹${(tour.price || 0).toLocaleString()}</strong></td>
                            <td>${tour.groupSize || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Duration View
async function loadDurationView() {
    const container = document.getElementById('durationContent');
    if (allTours.length === 0) await loadTours();
    
    if (allTours.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No tours found.</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Tour Name</th>
                        <th>Duration</th>
                        <th>Location</th>
                        <th>Difficulty</th>
                    </tr>
                </thead>
                <tbody>
                    ${allTours.map(tour => `
                        <tr>
                            <td><strong>${tour.title}</strong></td>
                            <td>${tour.duration || 'N/A'}</td>
                            <td>${tour.location}, ${tour.country}</td>
                            <td><span class="text-sm">${tour.difficulty || 'Easy'}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('tourModal');
    if (event.target === modal) {
        closeModal();
    }
}
