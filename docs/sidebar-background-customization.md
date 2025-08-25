# Sidebar Background Customization

The sidebar now supports three types of background customization:

## Background Types

### 1. Gradient Background
- Uses the existing gradient color system
- Configurable start and end colors for both light and dark themes
- Applied using CSS linear gradients

### 2. Solid Color Background
- Uses a single color for the background
- Uses the "Background Start" color from the color settings
- Provides a clean, minimal appearance

### 3. Image Background
- Upload custom images as sidebar backgrounds
- Supports various image fit options
- Configurable image positioning

## Image Configuration Options

### Image Fit Options
- **Cover**: Scales the image to cover the entire sidebar while maintaining aspect ratio
- **Contain**: Scales the image to fit within the sidebar while maintaining aspect ratio
- **Fill**: Stretches the image to fill the entire sidebar (may distort)
- **None**: Uses the image at its original size
- **Scale Down**: Scales down if the image is larger than the sidebar, otherwise uses original size

### Image Position Options
- **Center**: Centers the image in the sidebar
- **Top**: Aligns the image to the top
- **Bottom**: Aligns the image to the bottom
- **Left**: Aligns the image to the left
- **Right**: Aligns the image to the right
- **Top Left**: Aligns the image to the top-left corner
- **Top Right**: Aligns the image to the top-right corner
- **Bottom Left**: Aligns the image to the bottom-left corner
- **Bottom Right**: Aligns the image to the bottom-right corner

## Configuration

### Access
1. Navigate to **Settings** → **System Preferences**
2. Click on the **Sidebar** tab
3. Use the **Sidebar Background** section to configure

### Settings Storage
- Background type and image settings are stored in the database
- Image files are uploaded to MinIO storage
- Settings are applied immediately and persist across sessions

### Technical Implementation
- Background settings are stored in localStorage for immediate access
- System settings are updated for real-time application
- CSS background properties are dynamically applied based on the selected type
- Fallback to gradient background if image is not available

## File Requirements
- **Format**: PNG, JPG, or SVG
- **Size**: Maximum 5MB
- **Recommended dimensions**: 256x1024 pixels for optimal sidebar display

## Browser Compatibility
- All modern browsers support the background customization features
- CSS background properties are used for maximum compatibility
- Graceful fallback to gradient background if image loading fails
