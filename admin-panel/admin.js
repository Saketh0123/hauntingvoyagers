// Use centralized API base injected by api-base.js, fallback to localhost
const API_URL = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : 'http://localhost:3000/api';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const CLOUDINARY_CLOUD_NAME = 'dfw1w02tb';
const CLOUDINARY_UPLOAD_PRESET = 'travel_unsigned';
let allTours = [];
let heroImageUrl = '';
let galleryImagesUrls = [];
// Used when editing existing tours that already have gallery images
let galleryImagesBase64 = [];

// Image handling functions
function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions while maintaining aspect ratio
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 with compression
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}

// Tour form hero image upload (Cloudinary). Renamed to avoid clashing
async function handleTourHeroImageUpload() {
    const fileInput = document.getElementById('tourHeroImageFile');
    const preview = document.getElementById('tourHeroImagePreview');
    const previewImg = preview.querySelector('img');
    
    if (fileInput.files && fileInput.files[0]) {
        try {
            previewImg.src = '';
            preview.classList.remove('hidden');
            const loadingMsg = document.createElement('p');
            loadingMsg.textContent = 'Uploading to Cloudinary...';
            loadingMsg.className = 'text-sm text-gray-600 mt-2';
            preview.appendChild(loadingMsg);
            
            const url = await uploadToCloudinary(fileInput.files[0]);
            heroImageUrl = url;
            previewImg.src = url;
            loadingMsg.remove();
            
            // Clear URL input when file is uploaded
            document.getElementById('heroImageUrl').value = '';
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error uploading image to Cloudinary. Please try again.');
            preview.classList.add('hidden');
        }
    }
}

// Upload with progress support
function uploadToCloudinaryWithProgress(file, progressCallback) {
    return new Promise((resolve, reject) => {
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const json = JSON.parse(xhr.responseText);
                    resolve(json.secure_url);
                } catch (e) { reject(e); }
            } else {
                reject(new Error('Upload failed'));
            }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && typeof progressCallback === 'function') {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressCallback(percent);
            }
        };
        const form = new FormData();
        form.append('file', file);
        form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        xhr.send(form);
    });
}

async function handleGalleryImagesUpload() {
    const fileInput = document.getElementById('galleryImagesFile');
    const preview = document.getElementById('galleryPreview');
    if (!fileInput.files || fileInput.files.length === 0) return;
    // Keep existing images, append new ones
    const startIndex = galleryImagesUrls.length;
    const files = Array.from(fileInput.files);
    // Progress container
    files.forEach((file, index) => {
        const actualIndex = startIndex + index;
        const wrapper = document.createElement('div');
        wrapper.className = 'relative flex flex-col gap-1';
        wrapper.innerHTML = `
            <div class="w-full h-24 flex items-center justify-center text-xs bg-gray-100 rounded border border-dashed border-gray-300" id="gallery-placeholder-${actualIndex}">${file.name}</div>
            <div class="h-2 bg-gray-200 rounded overflow-hidden">
                <div id="upload-bar-${actualIndex}" class="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 w-0 transition-all"></div>
            </div>
        `;
        preview.appendChild(wrapper);
    });
    // Sequential uploads to show progress clearly
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const actualIndex = startIndex + i;
        try {
            const url = await uploadToCloudinaryWithProgress(f, (p) => {
                const bar = document.getElementById(`upload-bar-${actualIndex}`);
                if (bar) bar.style.width = p + '%';
            });
            galleryImagesUrls.push(url);
            const placeholder = document.getElementById(`gallery-placeholder-${actualIndex}`);
            if (placeholder) {
                placeholder.outerHTML = `
                    <div class="relative">
                        <img src="${url}" alt="Gallery ${actualIndex + 1}" class="w-full h-24 object-cover rounded">
                        <button type="button" onclick="removeGalleryImage(${actualIndex})" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">×</button>
                    </div>`;
            }
            const bar = document.getElementById(`upload-bar-${actualIndex}`);
            if (bar) bar.classList.add('bg-green-500');
        } catch (err) {
            console.error('Error uploading file', f.name, err);
            const bar = document.getElementById(`upload-bar-${actualIndex}`);
            if (bar) {
                bar.style.width = '100%';
                bar.className = 'h-full bg-red-500';
            }
        }
    }
    // Clear file input
    fileInput.value = '';
}

function removeGalleryImage(index) {
    galleryImagesUrls.splice(index, 1);
    const preview = document.getElementById('galleryPreview');
    preview.children[index]?.remove();
}

// Handler for additional gallery file button
async function handleAdditionalGalleryUpload() {
    const fileInput = document.getElementById('additionalGalleryFile');
    if (!fileInput.files || fileInput.files.length === 0) return;
    
    // Reuse the main gallery upload handler
    const mainInput = document.getElementById('galleryImagesFile');
    const dt = new DataTransfer();
    Array.from(fileInput.files).forEach(f => dt.items.add(f));
    mainInput.files = dt.files;
    await handleGalleryImagesUpload();
    fileInput.value = '';
}

function addGalleryUrl() {
    const container = document.getElementById('galleryImagesInputs');
    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'gallery-url-input w-full px-4 py-2 border rounded-lg';
    input.placeholder = 'https://example.com/image.jpg';
    container.appendChild(input);
}

function collectGalleryImages() {
    const gallery = [];
    
    // Add uploaded images (Cloudinary URLs)
    gallery.push(...galleryImagesUrls);
    
    // Add URL images
    const urlInputs = document.querySelectorAll('.gallery-url-input');
    urlInputs.forEach(input => {
        if (input.value.trim()) {
            gallery.push(input.value.trim());
        }
    });
    
    return gallery;
}

// Setup image upload listeners
document.addEventListener('DOMContentLoaded', function() {
    const tourHeroFileInput = document.getElementById('tourHeroImageFile');
    const galleryFileInput = document.getElementById('galleryImagesFile');
    const additionalGalleryFile = document.getElementById('additionalGalleryFile');
    if (tourHeroFileInput) {
        tourHeroFileInput.addEventListener('change', handleTourHeroImageUpload);
    }
    if (galleryFileInput) {
        galleryFileInput.addEventListener('change', handleGalleryImagesUpload);
    }
    if (additionalGalleryFile) {
        additionalGalleryFile.addEventListener('change', handleAdditionalGalleryUpload);
    }
    
    // Add date validation listener for dynamically created date inputs
    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('start-date') || e.target.type === 'date') {
            const today = new Date().toISOString().split('T')[0];
            if (e.target.value && e.target.value < today) {
                alert('Cannot select past dates. Please choose today or a future date.');
                e.target.value = '';
            }
        }
    });
});

// Login
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminDashboard').classList.remove('hidden');
        loadTours();
    } else {
        const error = document.getElementById('loginError');
        error.textContent = 'Invalid username or password';
        error.classList.remove('hidden');
    }
});

function logout() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('adminUsername').value = '';
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
        'home': 'Home Settings',
        'tours': 'Tours Management',
        'travells': 'Vehicle Rentals Management',
        'bookings': 'Booking Requests',
        'dates': 'Available Dates Management',
        'pricing': 'Tour Pricing Overview',
        'duration': 'Tour Durations'
    };
    
    document.getElementById('viewTitle').textContent = viewTitles[viewName];
    
    // Show/hide Add Tour button based on view
    const addTourBtn = document.getElementById('addTourBtn');
    const addVehicleBtn = document.getElementById('addVehicleBtn');
    if (addTourBtn) addTourBtn.style.display = viewName === 'tours' ? 'block' : 'none';
    if (addVehicleBtn) addVehicleBtn.onclick = openTravellModal;
    
    if (viewName === 'home') {
        document.getElementById('homeView').classList.remove('hidden');
        loadHomeSettings();
    } else if (viewName === 'tours') {
        document.getElementById('toursView').classList.remove('hidden');
        loadTours();
    } else if (viewName === 'travells') {
        document.getElementById('travellsView').classList.remove('hidden');
        loadTravells();
        loadHeroImages();
        loadPricingCards();
    } else if (viewName === 'bookings') {
        document.getElementById('bookingsView').classList.remove('hidden');
        loadBookings();
    } else if (viewName === 'dates') {
        document.getElementById('datesView').classList.remove('hidden');
        loadDatesView();
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

// ==================== TRAVELLS MANAGEMENT ====================

let currentTravell = null;
let vehicleImageUrl = '';

function openTravellModal() {
    currentTravell = null;
    vehicleImageUrl = '';
    document.getElementById('travellModalTitle').textContent = 'Add New Vehicle';
    document.getElementById('travellForm').reset();
    document.getElementById('travellId').value = '';
    document.getElementById('featuresInputs').innerHTML = '';
    document.getElementById('vehicleImagePreview').innerHTML = '';
    document.getElementById('vehicleActive').checked = true;
    addFeature();
    document.getElementById('travellModal').classList.add('active');
}

function closeTravellModal() {
    document.getElementById('travellModal').classList.remove('active');
}

function addFeature() {
    const container = document.getElementById('featuresInputs');
    const featureDiv = document.createElement('div');
    featureDiv.className = 'flex gap-2';
    featureDiv.innerHTML = `
        <input type="text" class="feature-input flex-1 px-4 py-2 border rounded-lg" placeholder="e.g., AC with push-back seats">
        <button type="button" onclick="this.parentElement.remove()" class="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600">Remove</button>
    `;
    container.appendChild(featureDiv);
}

async function handleVehicleImageUpload() {
    const fileInput = document.getElementById('vehicleImageFile');
    const preview = document.getElementById('vehicleImagePreview');
    const statusEl = document.getElementById('vehicleUploadStatus');
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        fileInput.disabled = true;
        
        // Show placeholder with progress bar
        preview.innerHTML = `
            <div class="relative inline-block">
                <div class="w-32 h-32 flex items-center justify-center text-xs bg-gray-100 rounded border border-dashed border-gray-300">
                    <span>Uploading...</span>
                </div>
                <div class="mt-1 h-2 bg-gray-200 rounded overflow-hidden">
                    <div id="vehicleUploadBar" class="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 w-0 transition-all"></div>
                </div>
            </div>
        `;
        
        try {
            const url = await uploadToCloudinaryWithProgress(file, (percent) => {
                const bar = document.getElementById('vehicleUploadBar');
                if (bar) bar.style.width = percent + '%';
            });
            vehicleImageUrl = url;
            preview.innerHTML = `
                <div class="relative inline-block">
                    <img src="${url}" alt="Preview" class="h-32 rounded">
                    <button type="button" onclick="removeVehicleImage()" class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">×</button>
                </div>
            `;
            document.getElementById('vehicleImageUrl').value = '';
            if (statusEl) { statusEl.textContent = 'Uploaded ✓'; statusEl.className = 'text-xs text-green-600'; }
            fileInput.disabled = false;
        } catch (error) {
            console.error('Vehicle image upload error:', error);
            preview.innerHTML = `<p class="text-xs text-red-600">Upload failed</p>`;
            if (statusEl) {
                statusEl.innerHTML = `
                    <span class="text-red-600">Upload failed</span>
                    <button type="button" id="retryVehicleUploadBtn" class="ml-2 px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600">Retry</button>
                `;
                const retryBtn = document.getElementById('retryVehicleUploadBtn');
                if (retryBtn) retryBtn.onclick = () => handleVehicleImageUpload();
            }
            fileInput.disabled = false;
        }
    }
}

function handleVehicleImageUrl() {
    const urlInput = document.getElementById('vehicleImageUrl');
    const preview = document.getElementById('vehicleImagePreview');
    const statusEl = document.getElementById('vehicleUploadStatus');
    const url = urlInput.value.trim();
    if (url) {
        // Show loading state
        if (statusEl) { statusEl.textContent = 'Loading preview...'; statusEl.className = 'text-xs text-gray-600'; }
        preview.innerHTML = `
            <div class="relative inline-block">
                <div class="w-32 h-32 flex items-center justify-center text-xs bg-gray-100 rounded border border-dashed border-gray-300">
                    <span>Loading...</span>
                </div>
            </div>
        `;
        
        // Test image load
        const img = new Image();
        img.onload = () => {
            vehicleImageUrl = url;
            preview.innerHTML = `
                <div class="relative inline-block">
                    <img src="${url}" alt="Preview" class="h-32 rounded">
                    <button type="button" onclick="removeVehicleImage()" class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">×</button>
                </div>
            `;
            document.getElementById('vehicleImageFile').value = '';
            if (statusEl) { statusEl.textContent = 'Preview loaded ✓'; statusEl.className = 'text-xs text-green-600'; }
        };
        img.onerror = () => {
            preview.innerHTML = `<p class="text-xs text-red-600">Invalid image URL</p>`;
            if (statusEl) { statusEl.textContent = 'Invalid URL'; statusEl.className = 'text-xs text-red-600'; }
        };
        img.src = url;
    }
}

function removeVehicleImage() {
    vehicleImageUrl = '';
    document.getElementById('vehicleImagePreview').innerHTML = '';
    document.getElementById('vehicleImageFile').value = '';
    document.getElementById('vehicleImageUrl').value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const vehicleImageFile = document.getElementById('vehicleImageFile');
    const vehicleImageUrlEl = document.getElementById('vehicleImageUrl');
    if (vehicleImageFile) vehicleImageFile.addEventListener('change', handleVehicleImageUpload);
    if (vehicleImageUrlEl) vehicleImageUrlEl.addEventListener('blur', handleVehicleImageUrl);
    const addVehicleBtn = document.getElementById('addVehicleBtn');
    if (addVehicleBtn) addVehicleBtn.addEventListener('click', openTravellModal);
    const addHeroImageBtn = document.getElementById('addHeroImageBtn');
    if (addHeroImageBtn) addHeroImageBtn.addEventListener('click', openHeroImageModal);
});

async function loadTravells() {
    try {
        const response = await fetch(`${API_URL}/travells`);
        const travells = await response.json();
        const tbody = document.getElementById('travellsTableBody');
        if (!travells || travells.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No vehicles found</td></tr>';
            return;
        }
        tbody.innerHTML = travells.map(travell => `
            <tr>
                <td>${travell.name}</td>
                <td><img src="${travell.image}" alt="${travell.name}" class="h-12 w-20 object-cover rounded" /></td>
                <td>${travell.seats}</td>
                <td>₹${travell.pricePerKm}/km</td>
                <td><div class="text-sm">${(travell.features||[]).slice(0,2).map(f=>`<div>• ${f}</div>`).join('')}${(travell.features||[]).length>2?`<div class="text-gray-500">+${travell.features.length-2} more</div>`:''}</div></td>
                <td><span class="px-2 py-1 rounded text-xs ${travell.isActive? 'bg-green-100 text-green-800':'bg-gray-100 text-gray-800'}">${travell.isActive? 'Active':'Inactive'}</span></td>
                <td>
                    <button onclick="editTravell('${travell._id}')" class="btn-edit">Edit</button>
                    <button onclick="deleteTravell('${travell._id}')" class="btn-delete ml-2">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading travells:', error);
        document.getElementById('travellsTableBody').innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-500">Error loading vehicles</td></tr>';
    }
}

async function editTravell(id) {
    try {
        const response = await fetch(`${API_URL}/travells/${id}`);
        const currentTravell = await response.json();
        document.getElementById('travellModalTitle').textContent = 'Edit Vehicle';
        document.getElementById('travellId').value = currentTravell._id;
        document.getElementById('vehicleName').value = currentTravell.name;
        document.getElementById('vehicleSeats').value = currentTravell.seats;
        document.getElementById('vehiclePrice').value = currentTravell.pricePerKm;
        document.getElementById('vehicleOrder').value = currentTravell.displayOrder || 0;
        document.getElementById('vehicleActive').checked = currentTravell.isActive;
        vehicleImageUrl = currentTravell.image;
        document.getElementById('vehicleImagePreview').innerHTML = `
            <div class="relative inline-block">
                <img src="${currentTravell.image}" alt="Preview" class="h-32 rounded">
                <button type="button" onclick="removeVehicleImage()" class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">×</button>
            </div>`;
        const featuresContainer = document.getElementById('featuresInputs');
        featuresContainer.innerHTML = '';
        (currentTravell.features||[]).forEach(f => {
            const div = document.createElement('div');
            div.className = 'flex gap-2';
            div.innerHTML = `
                <input type="text" class="feature-input flex-1 px-4 py-2 border rounded-lg" value="${f}">
                <button type="button" onclick="this.parentElement.remove()" class="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600">Remove</button>`;
            featuresContainer.appendChild(div);
        });
        document.getElementById('travellModal').classList.add('active');
    } catch (error) {
        console.error('Error loading vehicle:', error);
        alert('Error loading vehicle details');
    }
}

async function deleteTravell(id) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
        const response = await fetch(`${API_URL}/travells/${id}`, { method: 'DELETE' });
        if (response.ok) { alert('Vehicle deleted successfully'); loadTravells(); }
        else { alert('Error deleting vehicle'); }
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        alert('Error deleting vehicle');
    }
}

document.getElementById('travellForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('vehicleName').value.trim();
    const seats = parseInt(document.getElementById('vehicleSeats').value);
    const pricePerKm = parseInt(document.getElementById('vehiclePrice').value);
    const displayOrder = parseInt(document.getElementById('vehicleOrder').value) || 0;
    const isActive = document.getElementById('vehicleActive').checked;
    if (!vehicleImageUrl) { alert('Please upload or provide a vehicle image'); return; }
    const features = Array.from(document.querySelectorAll('.feature-input')).map(i=>i.value.trim()).filter(Boolean);
    const data = { name, image: vehicleImageUrl, seats, pricePerKm, features, displayOrder, isActive };
    try {
        const id = document.getElementById('travellId').value;
        const url = id ? `${API_URL}/travells/${id}` : `${API_URL}/travells`;
        const method = id ? 'PUT' : 'POST';
        const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (response.ok) { alert('Vehicle saved successfully!'); closeTravellModal(); loadTravells(); }
        else { const err = await response.json(); alert('Error saving vehicle: ' + (err.error||'Unknown error')); }
    } catch (error) {
        console.error('Error saving vehicle:', error); alert('Error saving vehicle');
    }
});

// ==================== HERO IMAGES (RENTALS) ====================
let heroImageUploadUrl = '';

function openHeroImageModal() {
    heroImageUploadUrl = '';
    document.getElementById('heroImageForm').reset();
    const preview = document.getElementById('rentalsHeroImagePreview');
    if (preview) preview.innerHTML = '';
    document.getElementById('heroImageModal').classList.add('active');
}
function closeHeroImageModal() { document.getElementById('heroImageModal').classList.remove('active'); }

async function handleRentalsHeroImageUpload() {
    const fileInput = document.getElementById('rentalsHeroImageFile');
    const preview = document.getElementById('rentalsHeroImagePreview');
    const statusEl = document.getElementById('rentalsHeroUploadStatus');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        fileInput.disabled = true;
        
        // Show placeholder with progress bar
        if (preview) {
            preview.innerHTML = `
                <div class="relative inline-block">
                    <div class="w-32 h-32 flex items-center justify-center text-xs bg-gray-100 rounded border border-dashed border-gray-300">
                        <span>Uploading...</span>
                    </div>
                    <div class="mt-1 h-2 bg-gray-200 rounded overflow-hidden">
                        <div id="heroUploadBar" class="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 w-0 transition-all"></div>
                    </div>
                </div>
            `;
        }
        
        try {
            const url = await uploadToCloudinaryWithProgress(file, (percent) => {
                const bar = document.getElementById('heroUploadBar');
                if (bar) bar.style.width = percent + '%';
            });
            heroImageUploadUrl = url;
            if (preview) {
                preview.innerHTML = `
                <div class="relative inline-block">
                    <img src="${url}" alt="Preview" class="h-32 rounded">
                    <button type="button" onclick="removeRentalsHeroImageUpload()" class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">×</button>
                </div>`;
            }
            const urlInput = document.getElementById('rentalsHeroImageUrl');
            if (urlInput) urlInput.value = '';
            if (statusEl) { statusEl.textContent = 'Uploaded ✓'; statusEl.className = 'text-xs text-green-600'; }
            fileInput.disabled = false;
        } catch (error) {
            console.error('Hero image upload error:', error);
            if (preview) preview.innerHTML = `<p class="text-xs text-red-600">Upload failed</p>`;
            if (statusEl) {
                statusEl.innerHTML = `
                    <span class="text-red-600">Upload failed</span>
                    <button type="button" id="retryHeroUploadBtn" class="ml-2 px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600">Retry</button>
                `;
                const retryBtn = document.getElementById('retryHeroUploadBtn');
                if (retryBtn) retryBtn.onclick = () => handleRentalsHeroImageUpload();
            }
            fileInput.disabled = false;
        }
    }
}

function handleRentalsHeroImageUrlInput() {
    const urlInput = document.getElementById('rentalsHeroImageUrl');
    const preview = document.getElementById('rentalsHeroImagePreview');
    const statusEl = document.getElementById('rentalsHeroUploadStatus');
    const url = urlInput ? urlInput.value.trim() : '';
    if (url) {
        // Show loading state
        if (statusEl) { statusEl.textContent = 'Loading preview...'; statusEl.className = 'text-xs text-gray-600'; }
        if (preview) {
            preview.innerHTML = `
                <div class="relative inline-block">
                    <div class="w-32 h-32 flex items-center justify-center text-xs bg-gray-100 rounded border border-dashed border-gray-300">
                        <span>Loading...</span>
                    </div>
                </div>
            `;
        }
        
        // Test image load
        const img = new Image();
        img.onload = () => {
            heroImageUploadUrl = url;
            if (preview) {
                preview.innerHTML = `
                <div class="relative inline-block">
                    <img src="${url}" alt="Preview" class="h-32 rounded">
                    <button type="button" onclick="removeRentalsHeroImageUpload()" class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">×</button>
                </div>`;
            }
            const fileInput = document.getElementById('rentalsHeroImageFile');
            if (fileInput) fileInput.value = '';
            if (statusEl) { statusEl.textContent = 'Preview loaded ✓'; statusEl.className = 'text-xs text-green-600'; }
        };
        img.onerror = () => {
            if (preview) preview.innerHTML = `<p class="text-xs text-red-600">Invalid image URL</p>`;
            if (statusEl) { statusEl.textContent = 'Invalid URL'; statusEl.className = 'text-xs text-red-600'; }
        };
        img.src = url;
    }
}
function removeRentalsHeroImageUpload() {
    heroImageUploadUrl = '';
    const preview = document.getElementById('rentalsHeroImagePreview');
    if (preview) preview.innerHTML = '';
    const fileInput = document.getElementById('rentalsHeroImageFile');
    const urlInput = document.getElementById('rentalsHeroImageUrl');
    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    const rentalsHeroImageFile = document.getElementById('rentalsHeroImageFile');
    const rentalsHeroImageUrl = document.getElementById('rentalsHeroImageUrl');
    if (rentalsHeroImageFile) rentalsHeroImageFile.addEventListener('change', handleRentalsHeroImageUpload);
    if (rentalsHeroImageUrl) rentalsHeroImageUrl.addEventListener('blur', handleRentalsHeroImageUrlInput);
});

async function loadHeroImages() {
    try {
        const response = await fetch(`${API_URL}/hero-images`);
        const images = await response.json();
        const grid = document.getElementById('heroImagesGrid');
        if (!images || images.length === 0) {
            grid.innerHTML = '<p class="text-gray-500">No hero images added yet.</p>';
            return;
        }
        grid.innerHTML = images.map(image => `
            <div class="relative bg-white rounded-lg shadow overflow-hidden">
                <img src="${image.url}" alt="Hero Image" class="w-full h-48 object-cover">
                <div class="p-3">
                    <div class="text-sm text-gray-600">Order: ${image.displayOrder}</div>
                    <div class="mt-2 flex gap-2">
                        <button onclick="deleteHeroImage('${image._id}')" class="flex-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">Delete</button>
                    </div>
                </div>
            </div>`).join('');
    } catch (error) {
        console.error('Error loading hero images:', error);
        document.getElementById('heroImagesGrid').innerHTML = '<p class="text-red-500">Error loading hero images</p>';
    }
}

document.getElementById('heroImageForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!heroImageUploadUrl) { alert('Please upload or enter an image URL'); return; }
    const orderEl = document.getElementById('rentalsHeroImageOrder');
    const displayOrder = parseInt(orderEl ? orderEl.value : '0') || 0;
    const data = { url: heroImageUploadUrl, publicId: heroImageUploadUrl.split('/').pop().split('.')[0], displayOrder, isActive: true };
    try {
        const response = await fetch(`${API_URL}/hero-images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (response.ok) { alert('Hero image added successfully!'); closeHeroImageModal(); loadHeroImages(); }
        else { const err = await response.json(); alert('Error saving hero image: ' + (err.error||'Unknown error')); }
    } catch (error) {
        console.error('Error saving hero image:', error); alert('Error saving hero image');
    }
});

async function deleteHeroImage(id) {
    if (!confirm('Are you sure you want to delete this hero image?')) return;
    try {
        const response = await fetch(`${API_URL}/hero-images/${id}`, { method: 'DELETE' });
        if (response.ok) { alert('Hero image deleted successfully!'); loadHeroImages(); }
        else { alert('Delete failed'); }
    } catch (error) {
        console.error('Error deleting hero image:', error); alert('Error deleting hero image');
    }
}

// ==================== PRICING CARDS MANAGEMENT ====================

function openPricingModal() {
    document.getElementById('pricingModalTitle').textContent = 'Add Pricing Card';
    document.getElementById('pricingForm').reset();
    document.getElementById('pricingId').value = '';
    const features = document.getElementById('pricingFeaturesInputs');
    if (features) { features.innerHTML = ''; addPricingFeature(); }
    document.getElementById('pricingModal').classList.add('active');
}

function closePricingModal() {
    document.getElementById('pricingModal').classList.remove('active');
}

function addPricingFeature() {
    const container = document.getElementById('pricingFeaturesInputs');
    const div = document.createElement('div');
    div.className = 'flex gap-2';
    div.innerHTML = `
        <input type="text" class="pricing-feature-input flex-1 px-4 py-2 border rounded-lg" placeholder="e.g., 8 hours / 80km">
        <button type="button" onclick="this.parentElement.remove()" class="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600">Remove</button>`;
    container.appendChild(div);
}

async function loadPricingCards() {
    try {
        const res = await fetch(`${API_URL}/pricing?status=all`);
        let cards = await res.json();
        if (!Array.isArray(cards)) cards = [];

        // Prefill defaults if empty
        if (cards.length === 0) {
            await prefillPricingDefaults();
            const refetch = await fetch(`${API_URL}/pricing?status=all`);
            cards = await refetch.json();
        }

        const tbody = document.getElementById('pricingCardsTableBody');
        if (!tbody) return;
        if (cards.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No pricing cards</td></tr>';
            return;
        }
        tbody.innerHTML = cards.sort((a,b)=>a.displayOrder-b.displayOrder).map(card => `
            <tr>
                <td>${card.title}</td>
                <td>${card.subtitle}</td>
                <td>₹${card.price} ${card.priceUnit}</td>
                <td><div class="text-sm">${(card.features||[]).slice(0,2).map(f=>`<div>• ${f}</div>`).join('')}${(card.features||[]).length>2?`<div class='text-gray-500'>+${card.features.length-2} more</div>`:''}</div></td>
                <td>${card.isPopular?'<span class="badge badge-success">Yes</span>':'<span class="badge">No</span>'}</td>
                <td><span class="px-2 py-1 rounded text-xs ${card.isActive? 'bg-green-100 text-green-800':'bg-gray-100 text-gray-800'}">${card.isActive? 'Active':'Inactive'}</span></td>
                <td>
                    <button onclick="editPricingCard('${card._id}')" class="btn-edit">Edit</button>
                    <button onclick="deletePricingCard('${card._id}')" class="btn-delete ml-2">Delete</button>
                </td>
            </tr>`).join('');
    } catch (err) {
        console.error('loadPricingCards error:', err);
        const tbody = document.getElementById('pricingCardsTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-500">Error loading pricing</td></tr>';
    }
}

async function prefillPricingDefaults() {
    const defaults = [
        { title:'Local Travel', subtitle:'Within city limits (up to 80km)', price:'3,500', priceUnit:'/day', features:['8 hours / 80km','Driver allowance included','Fuel included','Toll charges extra'], isPopular:false, displayOrder:1, isActive:true, bgGradient:'from-orange-50 to-pink-50' },
        { title:'Outstation', subtitle:'Beyond city limits', price:'22', priceUnit:'/km', features:['Unlimited hours','Driver allowance included','Fuel included','Minimum 250km/day'], isPopular:true, displayOrder:2, isActive:true, bgGradient:'from-purple-50 to-blue-50' },
        { title:'Multi-Day', subtitle:'Extended tours', price:'5,500', priceUnit:'/day', features:['250km per day','Driver accommodation','Fuel included','Flexible itinerary'], isPopular:false, displayOrder:3, isActive:true, bgGradient:'from-green-50 to-teal-50' }
    ];
    try {
        for (const card of defaults) {
            await fetch(`${API_URL}/pricing`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(card) });
        }
    } catch (e) { console.error('prefillPricingDefaults error:', e); }
}

async function editPricingCard(id) {
    try {
        const res = await fetch(`${API_URL}/pricing/${id}`);
        const card = await res.json();
        document.getElementById('pricingModalTitle').textContent = 'Edit Pricing Card';
        document.getElementById('pricingId').value = card._id;
        document.getElementById('pricingTitle').value = card.title;
        document.getElementById('pricingSubtitle').value = card.subtitle;
        document.getElementById('pricingPrice').value = card.price;
        document.getElementById('pricingPriceUnit').value = card.priceUnit;
        document.getElementById('pricingGradient').value = card.bgGradient || 'from-orange-50 to-pink-50';
        document.getElementById('pricingOrder').value = card.displayOrder || 0;
        document.getElementById('pricingPopular').checked = !!card.isPopular;
        document.getElementById('pricingActive').checked = !!card.isActive;
        const features = document.getElementById('pricingFeaturesInputs');
        features.innerHTML = '';
        (card.features||[]).forEach(f=>{
            const div = document.createElement('div');
            div.className = 'flex gap-2';
            div.innerHTML = `
                <input type=\"text\" class=\"pricing-feature-input flex-1 px-4 py-2 border rounded-lg\" value=\"${f.replace(/"/g,'&quot;')}\"> 
                <button type=\"button\" onclick=\"this.parentElement.remove()\" class=\"px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600\">Remove</button>`;
            features.appendChild(div);
        });
        document.getElementById('pricingModal').classList.add('active');
    } catch (e) { console.error('editPricingCard error:', e); alert('Error loading card'); }
}

async function deletePricingCard(id) {
    if (!confirm('Delete this pricing card?')) return;
    try {
        const res = await fetch(`${API_URL}/pricing/${id}`, { method:'DELETE' });
        if (res.ok) { alert('Deleted'); loadPricingCards(); } else { alert('Delete failed'); }
    } catch (e) { console.error('deletePricingCard error:', e); alert('Error'); }
}

document.getElementById('pricingForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const data = {
        title: document.getElementById('pricingTitle').value.trim(),
        subtitle: document.getElementById('pricingSubtitle').value.trim(),
        price: document.getElementById('pricingPrice').value.trim(),
        priceUnit: document.getElementById('pricingPriceUnit').value.trim(),
        bgGradient: document.getElementById('pricingGradient').value,
        displayOrder: parseInt(document.getElementById('pricingOrder').value)||0,
        isPopular: document.getElementById('pricingPopular').checked,
        isActive: document.getElementById('pricingActive').checked,
        features: Array.from(document.querySelectorAll('.pricing-feature-input')).map(i=>i.value.trim()).filter(Boolean)
    };
    if (!data.title || !data.subtitle || !data.price || !data.priceUnit) { alert('Fill all required fields'); return; }
    try {
        const id = document.getElementById('pricingId').value;
        const res = await fetch(id?`${API_URL}/pricing/${id}`:`${API_URL}/pricing`, { method: id?'PUT':'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
        if (res.ok) { alert('Saved'); closePricingModal(); loadPricingCards(); } else { const err = await res.json(); alert('Save failed: '+(err.error||'Unknown')); }
    } catch (e) { console.error('save pricing error:', e); alert('Error'); }
});

// ==================== BOOKINGS MANAGEMENT ====================

async function loadBookings() {
    try {
        const response = await fetch(`${API_URL}/bookings`);
        const bookings = await response.json();
        
        // Sort by creation date (newest first)
        bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Cache for filtering
        allBookingsCache = bookings;
        
        renderBookingsTable(bookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        document.getElementById('bookingsTableBody').innerHTML = 
            '<tr><td colspan="8" class="text-center py-8 text-red-500">Error loading bookings</td></tr>';
    }
}

function renderBookingsTable(bookings) {
    const tbody = document.getElementById('bookingsTableBody');
    
    if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">No bookings found</td></tr>';
        return;
    }
    
    tbody.innerHTML = bookings.map(booking => {
        const statusClass = {
            'pending': 'badge badge-pending',
            'confirmed': 'badge badge-success',
            'cancelled': 'badge badge-danger'
        }[booking.status] || 'badge';
        
        const statusBadge = `<span class="${statusClass}">${booking.status.toUpperCase()}</span>`;
        
        const travelDate = new Date(booking.travelDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        const requirements = booking.additionalRequirements 
            ? (booking.additionalRequirements.length > 30 
                ? booking.additionalRequirements.substring(0, 30) + '...' 
                : booking.additionalRequirements)
            : '-';
        
        return `
            <tr>
                <td><strong>${booking.bookingId}</strong></td>
                <td>${booking.name}</td>
                <td>${booking.phone}</td>
                <td>${travelDate}</td>
                <td>${booking.vehicleType}</td>
                <td title="${booking.additionalRequirements || ''}">${requirements}</td>
                <td>${statusBadge}</td>
                <td>
                    ${booking.status === 'pending' ? `
                        <button class="btn-edit" onclick="confirmBooking('${booking.bookingId}', '${booking.phone}', '${booking.name}', '${booking.vehicleType}', '${booking.travelDate}')">
                            Confirm
                        </button>
                    ` : ''}
                    <button class="btn-delete" onclick="deleteBooking('${booking.bookingId}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function confirmBooking(bookingId, customerPhone, customerName, vehicleType, travelDate) {
    try {
        // Update booking status to confirmed
        const updateResponse = await fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'confirmed' })
        });
        
        if (!updateResponse.ok) {
            throw new Error('Failed to update booking status');
        }
        
        // Get company info from settings
        const settingsResponse = await fetch(`${API_URL}/settings`);
        const settings = await settingsResponse.json();
        const companyName = (settings.company && settings.company.name) ? settings.company.name : 'Travel Agency';

        // Attempt to fetch vehicle rate/seats
        let vehicleInfo = null;
        try {
            const travResp = await fetch(`${API_URL}/travells?status=all`);
            const travells = await travResp.json();
            vehicleInfo = travells.find(v => (v.name || '').toLowerCase() === (vehicleType || '').toLowerCase());
        } catch (e) {
            console.warn('Could not load vehicles for invoice details:', e);
        }

        // Clean phone number (remove non-digits)
        const cleanPhone = customerPhone.replace(/\D/g, '');
        
        if (!cleanPhone) {
            alert('Invalid phone number');
            return;
        }

        // Format date
        const dateStr = new Date(travelDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        // Build invoice-like message
        const rateLine = vehicleInfo && vehicleInfo.pricePerKm ? `Rate: ₹${vehicleInfo.pricePerKm}/km\n` : '';
        const seatsLine = vehicleInfo && vehicleInfo.seats ? ` (${vehicleInfo.seats} seats)` : '';
        const message = `*${companyName} — Invoice*\n\n` +
            `Booking ID: ${bookingId}\n` +
            `Customer: ${customerName}\n` +
            `Travel Date: ${dateStr}\n` +
            `Vehicle: ${vehicleType}${seatsLine}\n` +
            rateLine +
            `Charges include driver allowance. Tolls, parking, and state taxes extra.\n` +
            `Final amount will be based on actual kilometers.\n\n` +
            `Reply CONFIRM to proceed. Thank you!`;
        
        // Open WhatsApp to send confirmation message
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
        
        // Reload bookings to show updated status
        loadBookings();
        
        alert('Booking confirmed! WhatsApp opened to send confirmation message to customer.');
    } catch (error) {
        console.error('Error confirming booking:', error);
        alert('Error confirming booking. Please try again.');
    }
}

async function deleteBooking(bookingId) {
    if (!confirm(`Are you sure you want to delete booking ${bookingId}?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Booking deleted successfully!');
            loadBookings();
        } else {
            alert('Failed to delete booking');
        }
    } catch (error) {
        console.error('Error deleting booking:', error);
        alert('Error deleting booking');
    }
}

// Filter bookings by booking ID
let allBookingsCache = [];

function filterBookings() {
    const searchInput = document.getElementById('bookingSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.trim().toUpperCase();
    
    if (searchTerm === '') {
        // Show all bookings
        renderBookingsTable(allBookingsCache);
    } else {
        // Filter bookings by ID
        const filtered = allBookingsCache.filter(booking => 
            booking.bookingId.toUpperCase().includes(searchTerm)
        );
        renderBookingsTable(filtered);
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
        
        // Sort tours: Indian category first, then International (case-insensitive)
        allTours.sort((a, b) => {
            const aCat = (a.category || '').toLowerCase();
            const bCat = (b.category || '').toLowerCase();
            if (aCat === 'indian' && bCat !== 'indian') return -1;
            if (aCat !== 'indian' && bCat === 'indian') return 1;
            return 0;
        });
        
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
    document.getElementById('price').value = tour.price || '';
    document.getElementById('groupSize').value = tour.groupSize || '2-8 people';
    document.getElementById('description').value = tour.description || '';
    document.getElementById('heroImageUrl').value = tour.images?.hero || '';
    document.getElementById('featured').checked = tour.featured || false;
    document.getElementById('active').checked = tour.status === 'active';
    
    // Show hero image preview if exists
    heroImageUrl = tour.images?.hero || '';
    if (tour.images?.hero) {
        const preview = document.getElementById('tourHeroImagePreview');
        const previewImg = preview.querySelector('img');
        previewImg.src = tour.images.hero;
        preview.classList.remove('hidden');
    }
    
    // Populate gallery images
    const galleryInputsContainer = document.getElementById('galleryImagesInputs');
    const galleryPreview = document.getElementById('galleryPreview');
    galleryInputsContainer.innerHTML = '';
    galleryPreview.innerHTML = '';
    galleryImagesUrls = [];
    galleryImagesBase64 = [];
    
    if (tour.images?.gallery && tour.images.gallery.length > 0) {
        tour.images.gallery.forEach((img, index) => {
            // Store existing URLs
            galleryImagesUrls.push(img);
            galleryImagesBase64.push(img);
            
            // Show preview
            const imgDiv = document.createElement('div');
            imgDiv.className = 'relative';
            imgDiv.innerHTML = `
                <img src="${img}" alt="Gallery ${index + 1}" class="w-full h-24 object-cover rounded">
                <button type="button" onclick="removeExistingGalleryImage(${index})" class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">×</button>
            `;
            galleryPreview.appendChild(imgDiv);
        });
    }
    
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
    const today = new Date().toISOString().split('T')[0];
    if (tour.availableDates && tour.availableDates.length > 0) {
        tour.availableDates.forEach(dateSlot => {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'date-slot border rounded-lg p-3 bg-gray-50';
            slotDiv.innerHTML = `
                <div class="flex items-center gap-3">
                    <label class="text-sm font-medium text-gray-700 w-20">Date:</label>
                    <input type="date" class="start-date flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" value="${dateSlot.startDate ? dateSlot.startDate.split('T')[0] : ''}" min="${today}" required>
                    <button type="button" onclick="removeDateSlot(this)" class="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition">Remove</button>
                </div>
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
    
    // Get hero image (prioritize uploaded file, fallback to URL)
    const heroImage = heroImageUrl || document.getElementById('heroImageUrl').value || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800';
    
    // Get gallery images
    const galleryImages = collectGalleryImages();
    
    const tourData = {
        title: title,
        slug: slug,
        category: document.getElementById('category').value,
        location: document.getElementById('location').value,
        country: document.getElementById('country').value,
        duration: document.getElementById('duration').value,
        price: parseFloat(document.getElementById('price').value),
        currency: '₹',
        groupSize: document.getElementById('groupSize').value,
        description: document.getElementById('description').value,
        highlights: collectHighlights(),
        itinerary: collectItinerary(),
        inclusions: collectInclusions(),
        exclusions: collectExclusions(),
        images: {
            hero: heroImage,
            gallery: galleryImages
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
    const today = new Date().toISOString().split('T')[0];
    return Array.from(slots).map(slot => {
        const startDate = slot.querySelector('.start-date').value;
        // Use same date for both start and end to maintain compatibility
        return {
            startDate: startDate,
            endDate: startDate,
            spotsAvailable: 20
        };
    }).filter(slot => slot.startDate && slot.startDate >= today); // Only include filled dates that are today or future
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
    slotDiv.className = 'date-slot border rounded-lg p-3 bg-gray-50';
    const today = new Date().toISOString().split('T')[0];
    slotDiv.innerHTML = `
        <div class="flex items-center gap-3">
            <input type="date" class="start-date flex-1 px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" min="${today}" required>
            <button type="button" onclick="removeDateSlot(this)" class="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition">Remove</button>
        </div>
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
    heroImageUrl = '';
    galleryImagesUrls = [];
    galleryImagesBase64 = [];
    const heroPrev = document.getElementById('tourHeroImagePreview');
    if (heroPrev) heroPrev.classList.add('hidden');
    document.getElementById('galleryPreview').innerHTML = '';
    document.getElementById('galleryImagesInputs').innerHTML = '';
    document.getElementById('highlightsInputs').innerHTML = '<input type="text" placeholder="Enter highlight" class="highlight-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">';
    document.getElementById('itineraryInputs').innerHTML = `
        <div class="itinerary-day border rounded-lg p-3">
            <div class="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Day" class="day-number px-3 py-2 border rounded" value="1">
                <input type="text" placeholder="Title" class="day-title px-3 py-2 border rounded">
            </div>
            <textarea placeholder="Description" class="day-description mt-2 w-full px-3 py-2 border rounded" rows="2"></textarea>
            <button type="button" onclick="removeItineraryDay(this)" class="mt-1 px-2 py-1 bg-red-500 text-white rounded text-xs">Remove</button>
        </div>`;
    document.getElementById('inclusionsInputs').innerHTML = '<input type="text" placeholder="Enter inclusion" class="inclusion-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">';
    document.getElementById('exclusionsInputs').innerHTML = '<input type="text" placeholder="Enter exclusion" class="exclusion-input w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500">';
    document.getElementById('datesInputs').innerHTML = `
        <div class="date-slot border rounded-lg p-3">
            <div class="grid grid-cols-2 gap-3">
                <input type="date" class="start-date px-3 py-2 border rounded" placeholder="Start Date">
                <input type="date" class="end-date px-3 py-2 border rounded" placeholder="End Date">
            </div>
            <button type="button" onclick="removeDateSlot(this)" class="mt-2 px-2 py-1 bg-red-500 text-white rounded text-xs">Remove</button>
        </div>`;
}

function removeExistingGalleryImage(index) {
    galleryImagesBase64.splice(index, 1);
    galleryImagesUrls.splice(index, 1);
    const preview = document.getElementById('galleryPreview');
    if (preview.children[index]) {
        preview.children[index].remove();
    }
}

// Dates Management View
// Remove tour hero image preview
function removeTourHeroImage() {
    const preview = document.getElementById('tourHeroImagePreview');
    const previewImg = preview.querySelector('img');
    const fileInput = document.getElementById('tourHeroImageFile');
    const urlInput = document.getElementById('heroImageUrl');
    
    previewImg.src = '';
    preview.classList.add('hidden');
    fileInput.value = '';
    urlInput.value = '';
    heroImageUrl = null;
}

// Load dates view - placeholder function to prevent errors
function loadDatesView() {
    // This function is called when switching to dates view
    // The actual dates are loaded by loadDatesManagement()
}

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
    
    // Filter out past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDates = tour.availableDates.filter(date => {
        const dateObj = date.startDate ? new Date(date.startDate) : null;
        return dateObj && dateObj >= today;
    });
    
    if (futureDates.length === 0) {
        return '<p class="text-sm text-gray-500">No upcoming dates available</p>';
    }
    
    return futureDates.map((date, index) => {
        const dateObj = date.startDate ? new Date(date.startDate) : null;
        const formattedDate = dateObj ? 
            `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}` : 
            'N/A';
        return `
            <div class="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span class="text-sm">${formattedDate}</span>
                <button onclick="removeDateFromTour('${tour._id}', ${index})" class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">
                    Delete
                </button>
            </div>
        `;
    }).join('');
}

async function addNewDateToTour(tourId) {
    // Create a modal/dialog with date picker
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000; padding: 10px; border: 2px solid #7c3aed; border-radius: 8px; font-size: 16px;';
    
    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999;';
    
    document.body.appendChild(backdrop);
    document.body.appendChild(dateInput);
    dateInput.focus();
    dateInput.showPicker();
    
    const cleanup = () => {
        document.body.removeChild(dateInput);
        document.body.removeChild(backdrop);
    };
    
    dateInput.addEventListener('change', async () => {
        const selectedDate = dateInput.value;
        if (selectedDate) {
            const tour = allTours.find(t => t._id === tourId);
            if (tour) {
                tour.availableDates = tour.availableDates || [];
                tour.availableDates.push({
                    startDate: selectedDate,
                    endDate: selectedDate,
                    spotsAvailable: 20
                });
                await saveTourDates(tour);
            }
        }
        cleanup();
    });
    
    backdrop.addEventListener('click', cleanup);
    dateInput.addEventListener('blur', () => {
        setTimeout(cleanup, 200);
    });
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
        <div class="bg-white rounded-lg p-4 shadow mb-4">
            <h3 class="text-lg font-bold mb-2">Edit Tour Prices</h3>
            <p class="text-sm text-gray-600">Click on any price to edit it inline</p>
        </div>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Tour Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Group Size</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${allTours.map(tour => `
                        <tr>
                            <td><strong>${tour.title}</strong></td>
                            <td><span class="badge badge-${tour.category}">${tour.category === 'indian' ? 'Indian' : 'International'}</span></td>
                            <td>
                                <input type="number" 
                                    id="price-${tour._id}" 
                                    value="${tour.price || 0}" 
                                    class="px-3 py-1 border rounded w-32 font-bold"
                                    onchange="updateTourField('${tour._id}', 'price', this.value)">
                            </td>
                            <td>
                                <input type="text" 
                                    id="groupSize-${tour._id}" 
                                    value="${tour.groupSize || '2-8 people'}" 
                                    class="px-3 py-1 border rounded w-32"
                                    onchange="updateTourField('${tour._id}', 'groupSize', this.value)">
                            </td>
                            <td>
                                <button onclick="saveTourField('${tour._id}')" class="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                                    Save
                                </button>
                            </td>
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
        <div class="bg-white rounded-lg p-4 shadow mb-4">
            <h3 class="text-lg font-bold mb-2">Edit Tour Durations & Details</h3>
            <p class="text-sm text-gray-600">Click on any field to edit it inline</p>
        </div>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Tour Name</th>
                        <th>Duration</th>
                        <th>Location</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${allTours.map(tour => `
                        <tr>
                            <td><strong>${tour.title}</strong></td>
                            <td>
                                <input type="text" 
                                    id="duration-${tour._id}" 
                                    value="${tour.duration || ''}" 
                                    placeholder="e.g., 5 Days" 
                                    class="px-3 py-1 border rounded w-32"
                                    onchange="updateTourField('${tour._id}', 'duration', this.value)">
                            </td>
                            <td>${tour.location}, ${tour.country}</td>
                            <td>
                                <button onclick="saveTourField('${tour._id}')" class="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                                    Save
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Inline field update tracker
let fieldUpdates = {};

// Update tour field in memory
function updateTourField(tourId, fieldName, value) {
    if (!fieldUpdates[tourId]) {
        fieldUpdates[tourId] = {};
    }
    fieldUpdates[tourId][fieldName] = fieldName === 'price' ? parseFloat(value) : value;
}

// Save tour field changes
async function saveTourField(tourId) {
    if (!fieldUpdates[tourId] || Object.keys(fieldUpdates[tourId]).length === 0) {
        alert('No changes to save');
        return;
    }
    
    try {
        const tour = allTours.find(t => t._id === tourId);
        if (!tour) return;
        
        const updatedTour = { ...tour, ...fieldUpdates[tourId] };
        
        const response = await fetch(`${API_URL}/tours/${tourId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedTour)
        });
        
        if (response.ok) {
            alert('Changes saved successfully!');
            fieldUpdates[tourId] = {};
            await loadTours();
            // Refresh current view
            const activeNav = document.querySelector('.nav-item.active');
            if (activeNav) {
                const viewMap = {
                    'Tours': 'tours',
                    'Available Dates': 'dates',
                    'Pricing': 'pricing',
                    'Duration': 'duration'
                };
                const viewName = activeNav.textContent.trim();
                if (viewMap[viewName]) {
                    if (viewName === 'Pricing') loadPricingView();
                    else if (viewName === 'Duration') loadDurationView();
                }
            }
        } else {
            const error = await response.json();
            alert('Error saving: ' + (error.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving field:', error);
        alert('Error saving changes');
    }
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('tourModal');
    if (event.target === modal) {
        closeModal();
    }
}

// ==================== HOME SETTINGS FUNCTIONS ====================

let homeSettings = {
    company: { name: 'Pawan Krishna Tours & Travells', logoUrl: '' },
    heroImages: [],
    socialMedia: {
        facebook: 'https://www.facebook.com/profile.php?id=61553794382346',
        instagram: 'https://www.instagram.com/haunting_voyagers/',
        whatsapp: '919502606607'
    },
    footer: {
        email: 'info@travelagency.com',
        phone: '+91 98765 43210',
        copyright: '© 2025 Travel Agency. All rights reserved.',
        developerCredit: '',
        developerLink: ''
    }
};

// Load home settings from MongoDB
async function loadHomeSettings() {
    try {
        const response = await fetch(`${API_URL}/settings`);
        if (response.ok) {
            homeSettings = await response.json();
        }
        
        // Populate company info
        document.getElementById('companyName').value = homeSettings.company?.name || '';
        document.getElementById('logoUrl').value = homeSettings.company?.logoUrl || '';
        
        // Populate hero images
        displayHeroImages();
        
        // Populate hero content
        document.getElementById('heroMainHeading').value = homeSettings.heroContent?.mainHeading || 'Discover Your Next Adventure';
        document.getElementById('heroDescription').value = homeSettings.heroContent?.description || 'Explore breathtaking destinations across India and around the world. Let us craft your perfect journey.';
        document.getElementById('heroPrimaryButton').value = homeSettings.heroContent?.primaryButtonText || 'Explore All Trips';
        document.getElementById('heroSecondaryButton').value = homeSettings.heroContent?.secondaryButtonText || 'Indian Trips';
        
        // Populate social media
        document.getElementById('facebookUrl').value = homeSettings.socialMedia?.facebook || '';
        document.getElementById('instagramUrl').value = homeSettings.socialMedia?.instagram || '';
        document.getElementById('whatsappNumber').value = homeSettings.socialMedia?.whatsapp || '';
        
        // Populate footer
        document.getElementById('footerEmail').value = homeSettings.footer?.email || '';
        document.getElementById('footerPhone').value = homeSettings.footer?.phone || '';
        document.getElementById('copyrightText').value = homeSettings.footer?.copyright || '';
        document.getElementById('developerCredit').value = homeSettings.footer?.developerCredit || '';
        document.getElementById('developerLink').value = homeSettings.footer?.developerLink || '';
    } catch (error) {
        console.error('Error loading home settings:', error);
        alert('Error loading settings. Please make sure the server is running.');
    }
}

// Handle logo file upload
async function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }
    
    try {
        // Show loading state
        const preview = document.getElementById('logoPreview');
        const previewImg = document.getElementById('logoPreviewImg');
        preview.classList.remove('hidden');
        previewImg.src = '';
        previewImg.alt = 'Uploading...';
        
        // Upload to Cloudinary
        const url = await uploadToCloudinary(file);
        document.getElementById('logoUrl').value = url;
        
        // Show preview
        previewImg.src = url;
        previewImg.alt = 'Logo preview';
    } catch (error) {
        console.error('Error uploading logo:', error);
        alert('Error uploading logo to Cloudinary. Please try again.');
        const preview = document.getElementById('logoPreview');
        preview.classList.add('hidden');
    }
}

// Handle hero image file upload
async function handleHeroImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }
    
    try {
        // Show loading state
        const preview = document.getElementById('heroImagePreview');
        const previewImg = document.getElementById('heroImagePreviewImg');
        preview.classList.remove('hidden');
        previewImg.src = '';
        previewImg.alt = 'Uploading...';
        
        // Upload to Cloudinary
        const url = await uploadToCloudinary(file);
        document.getElementById('newHeroImageUrl').value = url;
        
        // Show preview
        previewImg.src = url;
        previewImg.alt = 'Hero image preview';
    } catch (error) {
        console.error('Error uploading hero image:', error);
        alert('Error uploading hero image to Cloudinary. Please try again.');
        const preview = document.getElementById('heroImagePreview');
        preview.classList.add('hidden');
    }
}

// Save company information
async function saveCompanyInfo() {
    try {
        homeSettings.company = {
            name: document.getElementById('companyName').value,
            logoUrl: document.getElementById('logoUrl').value
        };
        
        const response = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(homeSettings)
        });
        
        if (response.ok) {
            alert('Company information saved successfully!');
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error('Error saving company info:', error);
        alert('Error saving company information. Please make sure the server is running.');
    }
}

// Display hero images
function displayHeroImages() {
    const container = document.getElementById('heroImagesContainer');
    container.innerHTML = '';
    
    if (!homeSettings.heroImages || homeSettings.heroImages.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No hero images added yet.</p>';
        return;
    }
    
    homeSettings.heroImages.forEach((imageUrl, index) => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-3 p-3 bg-gray-50 rounded-lg';
        const displayUrl = imageUrl.length > 50 ? (imageUrl.startsWith('data:') ? 'Uploaded Image' : imageUrl.substring(0, 50) + '...') : imageUrl;
        div.innerHTML = `
            <img src="${imageUrl}" alt="Hero ${index + 1}" class="w-20 h-12 object-cover rounded">
            <span class="flex-1 text-sm truncate">${displayUrl}</span>
            <button onclick="removeHeroImage(${index})" class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">Remove</button>
        `;
        container.appendChild(div);
    });
}

// Add hero image
async function addHeroImage() {
    const url = document.getElementById('newHeroImageUrl').value.trim();
    if (!url) {
        alert('Please enter an image URL');
        return;
    }
    
    try {
        // Reload settings first to ensure we have the latest data
        const getResponse = await fetch(`${API_URL}/settings`);
        if (getResponse.ok) {
            homeSettings = await getResponse.json();
        }
        
        if (!homeSettings.heroImages) {
            homeSettings.heroImages = [];
        }
        homeSettings.heroImages.push(url);
        
        const response = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(homeSettings)
        });
        
        if (response.ok) {
            document.getElementById('newHeroImageUrl').value = '';
            // Clear preview
            const preview = document.getElementById('heroImagePreview');
            if (preview) preview.classList.add('hidden');
            document.getElementById('heroImageFile').value = '';
            
            await loadHomeSettings(); // Reload to sync
            alert('Hero image added successfully!');
        } else {
            const errorText = await response.text();
            throw new Error(`Failed to save: ${errorText}`);
        }
    } catch (error) {
        console.error('Error adding hero image:', error);
        alert('Error adding hero image: ' + error.message);
    }
}

// Remove hero image
async function removeHeroImage(index) {
    if (confirm('Are you sure you want to remove this hero image?')) {
        try {
            // Reload settings first to ensure we have the latest data
            const getResponse = await fetch(`${API_URL}/settings`);
            if (getResponse.ok) {
                homeSettings = await getResponse.json();
            }
            
            homeSettings.heroImages.splice(index, 1);
            
            const response = await fetch(`${API_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(homeSettings)
            });
            
            if (response.ok) {
                await loadHomeSettings(); // Reload to sync
                alert('Hero image removed successfully!');
            } else {
                const errorText = await response.text();
                throw new Error(`Failed to save: ${errorText}`);
            }
        } catch (error) {
            console.error('Error removing hero image:', error);
            alert('Error removing hero image. Please make sure the server is running.');
        }
    }
}

// Save social media links
async function saveSocialMedia() {
    try {
        homeSettings.socialMedia = {
            facebook: document.getElementById('facebookUrl').value,
            instagram: document.getElementById('instagramUrl').value,
            whatsapp: document.getElementById('whatsappNumber').value
        };
        
        const response = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(homeSettings)
        });
        
        if (response.ok) {
            alert('Social media links saved successfully!');
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error('Error saving social media:', error);
        alert('Error saving social media links. Please make sure the server is running.');
    }
}

// Save footer information
async function saveFooterInfo() {
    try {
        const developerCredit = document.getElementById('developerCredit').value.trim();
        const developerLink = document.getElementById('developerLink').value.trim();

        homeSettings.footer = {
            email: document.getElementById('footerEmail').value,
            phone: document.getElementById('footerPhone').value,
            copyright: document.getElementById('copyrightText').value,
            developerCredit,
            developerLink
        };
        
        const response = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(homeSettings)
        });
        
        if (response.ok) {
            alert('Footer information saved successfully!');
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error('Error saving footer:', error);
        alert('Error saving footer information. Please make sure the server is running.');
    }
}

// Save hero content
async function saveHeroContent() {
    try {
        homeSettings.heroContent = {
            mainHeading: document.getElementById('heroMainHeading').value,
            description: document.getElementById('heroDescription').value,
            primaryButtonText: document.getElementById('heroPrimaryButton').value,
            secondaryButtonText: document.getElementById('heroSecondaryButton').value
        };
        
        const response = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(homeSettings)
        });
        
        if (response.ok) {
            alert('Hero content saved successfully!');
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        console.error('Error saving hero content:', error);
        alert('Error saving hero content. Please make sure the server is running.');
    }
}

