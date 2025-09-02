# Bulk Photo Capture System Guide

## Overview

This sophisticated photo capture system is designed for efficiently photographing 239 high-value inventory items with a premium, mobile-first experience.

## Features

### 🚀 Three Capture Modes

#### 1. **Batch Photography Mode**
- **Room-by-room workflow** - Organize by location for efficient capturing
- **Guided interface** - Shows current item, progress, and estimated time
- **Auto-advance** - Moves to next item after photo capture
- **Multiple angles** - Main, detail, and label shots per item
- **Offline-first** - Works without internet, syncs when online

#### 2. **QR Label System**
- **Printable labels** - Generate QR codes for each item
- **Mobile scanning** - Link photos directly to specific items
- **Batch printing** - Print labels by room for organization
- **Error prevention** - No mismatched photos

#### 3. **Bulk Upload Mode**
- **Smart matching** - AI-powered filename parsing to suggest item matches
- **Drag & drop** - Simple desktop interface
- **Folder support** - Upload entire directories at once
- **Manual override** - Assign photos to items manually if needed

## Getting Started

### Prerequisites
- Modern web browser with camera support
- HTTPS connection (required for camera access)
- Recommended: Mobile device or tablet for best capture experience

### Quick Start

1. **Navigate to Photos page** - Click "Photos" in the main navigation
2. **Choose capture mode** based on your workflow:
   - Use **Batch Photography** for mobile room-by-room capture
   - Use **QR Labels** if you prefer physical labels on items
   - Use **Bulk Upload** for desktop batch processing

### Batch Photography Workflow

1. **Select Room** - Choose which room to photograph
2. **Review Settings**:
   - Image quality (Standard/High/Very High)
   - Auto-advance behavior
   - Multiple angles per item
3. **Start Session** - Camera opens in fullscreen mode
4. **Capture Process**:
   - Item info displayed on left (desktop) or overlay (mobile)
   - Take multiple angles: Main → Detail → Label
   - Auto-advance to next item or manual navigation
   - Progress tracked and saved continuously

### QR Label Workflow

1. **Generate Labels**:
   - Select room or individual items
   - Generate and print QR labels
   - Attach labels to physical items
2. **Scan & Capture**:
   - Start scanner mode
   - Scan QR code on item
   - Take photo(s) of the item
   - Photos automatically linked to correct item

### Bulk Upload Workflow

1. **Upload Photos**:
   - Drag & drop files or select folder
   - AI analyzes filenames for smart matching
2. **Review Matches**:
   - Confirm AI suggestions
   - Manually assign unmatched photos
   - Set photo angles (main/detail/label)
3. **Confirm & Upload** - Batch process all matches

## Technical Features

### 📱 Progressive Web App (PWA)
- **Install on device** - Add to home screen for app-like experience
- **Offline capability** - Works without internet connection
- **Background sync** - Uploads photos when connection restored
- **Push notifications** - Status updates on sync completion

### 🎯 Photo Optimization
- **Automatic compression** - Reduces file size while maintaining quality
- **Multiple resolutions** - Optimizes for web display and storage
- **Thumbnail generation** - Fast preview images
- **Metadata preservation** - Device type, compression ratio, dimensions

### 🔄 Offline & Sync
- **Local storage** - IndexedDB for offline photo storage
- **Smart sync** - Background upload queue with retry logic
- **Progress tracking** - Visual indicators for upload status
- **Conflict resolution** - Handles network interruptions gracefully

## Settings & Customization

### Photo Quality Settings
- **Compression Quality**: 60% (Standard) → 90% (Very High)
- **Max Resolution**: 1280px → 2560px
- **Photo Angles**: Toggle multiple angles per item
- **Auto-advance**: Automatic vs manual item progression

### Mobile Optimizations
- **Touch gestures** - Swipe between items, pinch to zoom
- **Camera controls** - Flash toggle, front/back camera switch
- **Haptic feedback** - Tactile confirmation on supported devices
- **Battery optimization** - Efficient camera usage and compression

## Performance Targets

- **1000 concurrent users** - Scalable architecture
- **<100ms data latency** - Real-time updates
- **60 FPS interface** - Smooth animations and transitions
- **<2 second load time** - Fast initial page load
- **Offline support** - Full functionality without internet

## Troubleshooting

### Camera Issues
- **Permissions denied**: Check browser settings, ensure HTTPS
- **Camera not working**: Try different browser, check device compatibility
- **Poor quality**: Adjust lighting, clean lens, check resolution settings

### Upload Problems
- **Photos not syncing**: Check internet connection, retry from queue
- **Slow uploads**: Switch to lower quality, compress images first
- **Missing photos**: Check offline queue, verify local storage

### Performance Issues
- **App running slowly**: Clear browser cache, restart browser
- **High memory usage**: Process photos in smaller batches
- **Battery drain**: Reduce screen brightness, enable auto-advance

## Browser Support

### Recommended Browsers
- **Chrome/Edge**: Full PWA support, best performance
- **Safari**: Good iOS support, limited PWA features
- **Firefox**: Good performance, some PWA limitations

### Required Features
- **Camera API**: `getUserMedia()` support
- **File API**: For photo processing and upload
- **IndexedDB**: For offline storage
- **Service Workers**: For PWA functionality

## Security & Privacy

- **Local processing**: Photos processed on device before upload
- **Encrypted storage**: Secure local storage implementation  
- **No tracking**: No analytics or user behavior tracking
- **Data control**: Users control when and what gets uploaded

## Performance Tips

1. **Good lighting** improves photo quality and reduces file sizes
2. **Stable connection** for best upload experience
3. **Clear cache** periodically if experiencing slowdowns
4. **Batch processing** - upload in groups rather than individually
5. **Use auto-advance** to maintain efficient workflow rhythm

---

For technical support or feature requests, contact the development team.
