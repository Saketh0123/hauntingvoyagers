# Cloudinary Integration Setup Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cloudinary Setup for Travel Agency  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if npm is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js/npm not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js/npm found (npm v$npmVersion)" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing Cloudinary dependencies..." -ForegroundColor Yellow
npm install cloudinary multer

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check if .env exists
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✓ .env file exists" -ForegroundColor Green
    
    # Check for Cloudinary variables
    $envContent = Get-Content ".env" -Raw
    if ($envContent -notmatch "CLOUDINARY_CLOUD_NAME") {
        Write-Host "⚠ Adding Cloudinary variables to .env..." -ForegroundColor Yellow
        Add-Content ".env" "`n# Cloudinary Configuration"
        Add-Content ".env" "CLOUDINARY_CLOUD_NAME=dfw1w02tb"
        Add-Content ".env" "CLOUDINARY_API_KEY=your_api_key_here"
        Add-Content ".env" "CLOUDINARY_API_SECRET=your_api_secret_here"
        Write-Host "✓ Cloudinary variables added to .env" -ForegroundColor Green
        Write-Host "⚠ Please update CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env" -ForegroundColor Yellow
    } else {
        Write-Host "✓ Cloudinary variables already configured" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ .env file not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✓ .env created from .env.example" -ForegroundColor Green
        Write-Host "⚠ Please update all variables in .env file" -ForegroundColor Yellow
    } else {
        Write-Host "✗ .env.example not found" -ForegroundColor Red
    }
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           Setup Complete!              " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update .env with your Cloudinary credentials" -ForegroundColor White
Write-Host "2. Create upload preset 'travel_unsigned' in Cloudinary" -ForegroundColor White
Write-Host "3. Run: npm start" -ForegroundColor White
Write-Host ""
Write-Host "For detailed setup guide, see: CLOUDINARY_SETUP.md" -ForegroundColor Cyan
Write-Host ""
