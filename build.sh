#!/bin/bash

# Zotero2Readwise Build Script
# This script builds the Zotero plugin XPI file

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PLUGIN_NAME="zotero2readwise"
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version".*"\([^"]*\)".*/\1/')
BUILD_DIR="build"
DIST_DIR="dist"
XPI_FILE="${PLUGIN_NAME}.xpi"

echo -e "${BLUE}=== Zotero2Readwise Build Script ===${NC}"
echo -e "${BLUE}Plugin: ${PLUGIN_NAME}${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    print_error "manifest.json not found. Please run this script from the plugin root directory."
    exit 1
fi

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf "$BUILD_DIR"
rm -rf "$DIST_DIR"
rm -f "$XPI_FILE"

# Create build directory
print_status "Creating build directory..."
mkdir -p "$BUILD_DIR"
mkdir -p "$DIST_DIR"

# Copy files to build directory
print_status "Copying files to build directory..."

# Core files
cp manifest.json "$BUILD_DIR/"
cp bootstrap.js "$BUILD_DIR/"
cp chrome.manifest "$BUILD_DIR/"

# Chrome directory (UI files)
if [ -d "chrome" ]; then
    cp -r chrome "$BUILD_DIR/"
    print_status "Copied chrome directory"
else
    print_warning "chrome directory not found"
fi

# Defaults directory (preferences)
if [ -d "defaults" ]; then
    cp -r defaults "$BUILD_DIR/"
    print_status "Copied defaults directory"
else
    print_warning "defaults directory not found"
fi

# Validate required files
print_status "Validating required files..."
required_files=(
    "$BUILD_DIR/manifest.json"
    "$BUILD_DIR/bootstrap.js"
    "$BUILD_DIR/chrome.manifest"
    "$BUILD_DIR/chrome/content/preferences.xhtml"
    "$BUILD_DIR/chrome/content/preferences.js"
    "$BUILD_DIR/chrome/skin/zotero2readwise-prefs.css"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "✓ Found: $(basename "$file")"
    else
        print_error "✗ Missing: $file"
        exit 1
    fi
done

# Check file sizes
print_status "Checking file sizes..."
find "$BUILD_DIR" -type f -exec ls -lh {} \; | while read -r line; do
    size=$(echo "$line" | awk '{print $5}')
    file=$(echo "$line" | awk '{print $9}')
    echo "  $(basename "$file"): $size"
done

# Create XPI file
print_status "Creating XPI file..."
cd "$BUILD_DIR"
zip -r "../$DIST_DIR/$XPI_FILE" . -x "*.DS_Store" "*Thumbs.db" "*.git*"
cd ..

# Verify XPI file
if [ -f "$DIST_DIR/$XPI_FILE" ]; then
    xpi_size=$(ls -lh "$DIST_DIR/$XPI_FILE" | awk '{print $5}')
    print_status "✓ XPI file created: $DIST_DIR/$XPI_FILE ($xpi_size)"
else
    print_error "✗ Failed to create XPI file"
    exit 1
fi

# List contents of XPI
print_status "XPI contents:"
unzip -l "$DIST_DIR/$XPI_FILE" | grep -v "Archive:" | grep -v "Length" | grep -v "^-" | grep -v "files$" | while read -r line; do
    if [ -n "$line" ]; then
        filename=$(echo "$line" | awk '{print $4}')
        if [ -n "$filename" ] && [ "$filename" != "Name" ]; then
            echo "  $filename"
        fi
    fi
done

# Copy to main directory for convenience
cp "$DIST_DIR/$XPI_FILE" "./"
print_status "✓ XPI file also copied to current directory"

# Final validation
print_status "Running final validation..."
if unzip -t "$XPI_FILE" > /dev/null 2>&1; then
    print_status "✓ XPI file is valid"
else
    print_error "✗ XPI file is corrupted"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Build Complete ===${NC}"
echo -e "${GREEN}XPI file: $XPI_FILE${NC}"
echo -e "${GREEN}Size: $(ls -lh "$XPI_FILE" | awk '{print $5}')${NC}"
echo ""
echo -e "${BLUE}Installation instructions:${NC}"
echo "1. Open Zotero"
echo "2. Go to Tools > Add-ons"
echo "3. Click the gear icon > Install Add-on From File"
echo "4. Select the $XPI_FILE file"
echo "5. Restart Zotero"
echo ""
echo -e "${BLUE}Testing:${NC}"
echo "- Run the test script: node test_preferences.js"
echo "- Check Zotero preferences for the new Zotero2Readwise section"
echo ""
echo -e "${GREEN}Build successful! 🎉${NC}"