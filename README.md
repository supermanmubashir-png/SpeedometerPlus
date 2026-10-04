# Speedometer PWA

A production-grade, GPS-based Speedometer Progressive Web App (PWA) that runs entirely in the browser with **zero backend**.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![PWA](https://img.shields.io/badge/PWA-Yes-green)
![Offline](https://img.shields.io/badge/Offline-Yes-green)
![Backend](https://img.shields.io/badge/Backend-None-success)

## 🚀 Features

### Core Functionality
- ✅ **Real GPS Speed Tracking** - Uses actual GPS data via Geolocation API
- ✅ **Zero Backend** - Runs entirely client-side, no server required
- ✅ **Offline Capable** - Works fully offline after first load
- ✅ **Installable PWA** - Add to home screen on mobile/desktop
- ✅ **Portrait Only** - Enforced orientation for optimal mobile experience

### Speedometer Modes (6 Display Types)
1. **Analogue** - Classic car-style gauge with needle
2. **Digital** - Large numeric display with stats
3. **Minimalist** - Clean, minimal design
4. **HUD** - Head-up display style with mirror mode
5. **Graph** - Real-time speed graph
6. **Compass** - Speed + heading display

### Trip Tracking
- Start/Stop/Pause trip controls
- Real-time distance, duration, avg/max speed
- Auto-pause when stopped
- Moving vs idle time detection
- Trip history with search and filter
- Export trips as JSON/CSV
- Import trips from JSON

### Odometer
- Lifetime distance tracking
- Accumulates from all trips
- Reset with confirmation
- Display in km or miles

### Statistics & Analytics
- Total distance, time, trips
- Average and max speed
- Time filters (Today, 7d, 30d, All)
- Distance per day chart
- Speed distribution histogram
- Average speed trend
- Insights (fastest trip, longest trip, etc.)
- Export stats as CSV/JSON

### Speed Alarm System
- Configurable threshold (default 40 km/h)
- Audible alarm via Web Audio API
- Vibration feedback via Vibration API
- Visual overspeed warning
- Multiple alarm sound patterns
- Continuous alarm mode option

### Settings (50+ Options)
- GPS accuracy filters
- Speed smoothing
- Auto-pause threshold
- Gauge customization (max speed, theme, needle style)
- Font size adjustment
- Unit toggle (km/h ↔ mph)
- Alarm configuration
- Theme selection (Light/Dark/Auto)
- Accent color picker
- Reduced motion support

### Data Management
- All data stored locally in IndexedDB
- Export all data as JSON backup
- Import data from backup
- Clear all data with confirmation
- Database size indicator

### PWA Features
- Installable on any device
- Works offline after first load
- Cache-first strategy for assets
- Automatic update detection
- Screen wake lock support
- Manifest with shortcuts

### Privacy & Security
- No analytics or tracking
- No third-party services
- No data leaves your device
- All processing happens locally
- Secure context required (HTTPS)

## 📁 File Structure

```
speedometer-pwa/
├── index.html          # Main HTML file
├── manifest.json       # PWA manifest
├── sw.js              # Service Worker
├── css/
│   └── main.css       # All styles (One UI 8.5 inspired)
├── js/
│   ├── main.js        # App initialization and coordination
│   ├── db.js          # IndexedDB wrapper
│   ├── gps.js         # GPS handling
│   ├── ui.js          # UI rendering and animations
│   ├── trips.js       # Trip tracking logic
│   ├── stats.js       # Statistics computation
│   └── settings.js    # Settings management
├── icons/
│   ├── icon.svg       # Base SVG icon
│   └── icon-*.png     # PWA icons (various sizes)
└── README.md          # This file
```

## 🛠️ Running Locally

### Option 1: Using `npx serve` (Recommended)

```bash
# Install serve globally (if not already installed)
npm install -g serve

# Navigate to the project directory
cd speedometer-pwa

# Start the server
npx serve
```

The app will be available at `http://localhost:3000` (or similar).

### Option 2: Using Python

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

### Option 3: Using Node.js http-server

```bash
npm install -g http-server
http-server
```

### Option 4: VS Code Live Server

1. Install the "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

## 🌐 Deploying

This is a **static site** - deploy anywhere that serves static files:

### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

Or drag and drop the `speedometer-pwa` folder to [Netlify Drop](https://app.netlify.com/drop).

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### GitHub Pages

1. Push the `speedometer-pwa` folder to a GitHub repository
2. Go to Settings > Pages
3. Select the branch and `/` folder
4. Your site will be at `https://username.github.io/repo-name`

### Any Static Host

Upload the contents of `speedometer-pwa` to any web server. The app requires:
- HTTPS (for Geolocation API and PWA features)
- Ability to serve static files
- Proper MIME types for JS/CSS

## 📱 Installing as PWA

### On Mobile (Android/iOS)

1. Open the app in Chrome or Safari
2. Tap the menu (⋮ or ⚡)
3. Select "Add to Home Screen" or "Install App"
4. Confirm the installation

### On Desktop (Chrome/Edge)

1. Open the app
2. Look for the install icon in the address bar
3. Click "Install"
4. The app will open in a standalone window

## 🎯 Usage Guide

### Getting Best GPS Accuracy

1. **Go outdoors** with a clear view of the sky
2. **Wait 30-60 seconds** for GPS to warm up
3. **Keep device still** while GPS is acquiring signal
4. **Enable High Accuracy** mode in settings
5. **Check accuracy indicator** - aim for <30m

### Starting a Trip

1. Go to the Trip tab
2. Tap "Start"
3. Begin moving
4. Trip auto-pauses when you stop
5. Tap "Stop" when finished

### Changing Units

1. Go to Settings
2. Tap km/h or mph under Units
3. All displays update automatically

### Setting Speed Alarm

1. Go to Settings > Units & Alarms
2. Enable "Speed Alarm"
3. Set your threshold (e.g., 40 km/h)
4. Test with "Test Alarm" button

### Exporting Data

1. Go to Settings > Data Management
2. Tap "Export All Data" for full backup
3. Or export individual trips from Trip tab

## ⚠️ Known Limitations

### Browser Limitations

- **Background Tracking**: Browsers don't allow continuous GPS tracking when the app is in background. Keep the app open and screen on.
- **iOS Safari**: GPS accuracy may be lower than on Android Chrome.
- **Incognito Mode**: Data will be lost when closing the browser.

### GPS Limitations

- **Indoors**: GPS doesn't work well indoors. Use near windows or outdoors.
- **Urban Canyons**: Tall buildings can affect GPS accuracy.
- **Speed Accuracy**: GPS speed is most accurate when moving steadily.

### PWA Limitations

- **iOS PWA**: Some PWA features are limited on iOS compared to Android.
- **Storage**: IndexedDB storage limits vary by browser (typically 50-100MB).

## 🔧 Troubleshooting

### GPS Not Working

1. Check location permissions in browser settings
2. Ensure you're using HTTPS (or localhost)
3. Try refreshing GPS in settings
4. Move to an open area outdoors

### App Not Installing

1. Ensure you're using HTTPS
2. Check that manifest.json is loading
3. Clear browser cache and try again
4. Try a different browser

### Data Lost

1. Check if you're in incognito mode
2. Clear browser cache may have removed data
3. Restore from backup if you exported data

### Slow Performance

1. Reduce speed smoothing in settings
2. Clear old trips from trip history
3. Enable reduced motion in settings

## 📊 Technical Details

### Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables
- **Vanilla JavaScript** - No frameworks
- **IndexedDB** - Local database
- **Service Worker** - Offline caching
- **Web App Manifest** - PWA metadata
- **Geolocation API** - GPS tracking
- **Web Audio API** - Alarm sounds
- **Vibration API** - Haptic feedback
- **Page Visibility API** - Background detection
- **Screen Wake Lock API** - Keep screen on

### Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+
- Opera 67+

### Performance

- 60 FPS animations
- Efficient DOM updates
- Debounced storage writes
- Minimal reflows
- Optimized for mobile

## 📝 Data Storage

### IndexedDB Stores

- **trips** - Trip data (distance, duration, points)
- **settings** - User preferences
- **speedLog** - Speed history for graphs
- **odometer** - Lifetime distance

### Storage Limits

- Chrome: ~6% of disk space (typically 50-100MB)
- Firefox: ~50MB prompt, then unlimited
- Safari: ~1GB
- Edge: ~6% of disk space

## 🔒 Privacy

This app:
- ✅ Stores all data locally
- ✅ Never sends data to servers
- ✅ Has no analytics
- ✅ Uses no third-party services
- ✅ Requires no account
- ✅ Tracks no personal information

Your location data never leaves your device.

## 📄 License

This project is provided as-is for educational and personal use.

## 🙏 Credits

- Design inspired by One UI 8.5
- Icons from various open sources
- Built with vanilla web technologies

## 📞 Support

For issues or questions:
1. Check the Help & FAQ section in the app
2. Review this README
3. Check browser console for errors

## 🚀 Future Enhancements

While this app is feature-complete, potential enhancements could include:
- Map preview with offline tiles
- Voice announcements
- Multiple trip comparison
- Custom gauge designs
- More export formats
- Widget support (where available)

---

**Built with ❤️ using standard web technologies**

*No backend. No tracking. Just speed.*
