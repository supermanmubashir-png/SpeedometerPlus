# Quick Start Guide - Speedometer PWA

## 🚀 Get Started in 30 Seconds

### 1. Start a Local Server

```bash
# Option A: Using npx (easiest)
cd speedometer-pwa
npx serve

# Option B: Using Python
cd speedometer-pwa
python -m http.server 8000
```

### 2. Open in Browser

Navigate to: `http://localhost:3000` (or `:8000` for Python)

### 3. Grant Location Permission

When prompted, allow location access for GPS functionality.

## 📱 Install as PWA

### Mobile (Android)
1. Open in Chrome
2. Tap menu (⋮)
3. Select "Add to Home Screen"
4. Tap "Add"

### Mobile (iOS)
1. Open in Safari
2. Tap share button
3. Select "Add to Home Screen"
4. Tap "Add"

### Desktop (Chrome/Edge)
1. Look for install icon in address bar
2. Click "Install"

## 🎯 Basic Usage

### Check Your Speed
- Default view shows real-time GPS speed
- Switch modes using the bottom selector
- Units toggle in Settings (km/h ↔ mph)

### Track a Trip
1. Go to **Trip** tab
2. Tap **Start**
3. Begin moving
4. Tap **Stop** when done
5. View in trip history

### Set Speed Alarm
1. Go to **Settings**
2. Enable **Speed Alarm**
3. Set threshold (e.g., 40 km/h)
4. Test with **Test Alarm** button

### View Statistics
1. Go to **Stats** tab
2. See lifetime totals
3. Use time filters (Today, 7d, 30d)
4. Export data if needed

## ⚙️ Essential Settings

### For Best GPS Accuracy
- Enable **High Accuracy Mode**
- Set **Min Accuracy Filter** to 30-50m
- Use outdoors with clear sky view

### For Better Battery
- Disable High Accuracy Mode
- Increase auto-pause threshold
- Enable reduced motion

### For Customization
- Change **Gauge Theme** color
- Adjust **Font Size**
- Pick **Accent Color**
- Choose **Needle Style**

## 🔧 Troubleshooting

### GPS Not Working?
- Check location permissions
- Ensure HTTPS or localhost
- Try **Refresh GPS** in settings
- Move outdoors

### App Not Installing?
- Clear browser cache
- Try different browser
- Ensure HTTPS connection

### Data Lost?
- Check incognito mode (data is temporary)
- Export backups regularly
- Clear cache may remove data

## 📊 Tips for Best Results

1. **Warm up GPS** - Wait 30-60 seconds before starting
2. **Clear sky view** - Use outdoors when possible
3. **Keep app open** - Background tracking limited by browsers
4. **Export regularly** - Backup your trip data
5. **Check accuracy** - Aim for <30m GPS accuracy

## 🎨 Display Modes

- **Analogue** - Classic car-style gauge
- **Digital** - Large numeric display
- **Minimal** - Clean, simple design
- **HUD** - Head-up display style
- **Graph** - Real-time speed chart
- **Compass** - Speed + heading

## 📱 Keyboard Shortcuts

- `Tab` - Navigate between controls
- `Enter` - Activate focused button
- `Escape` - Close modal

## 🌐 Deployment

### Netlify (Easiest)
```bash
# Drag and drop the speedometer-pwa folder to:
# https://app.netlify.com/drop
```

### Vercel
```bash
npm i -g vercel
vercel
```

### GitHub Pages
1. Push to GitHub repo
2. Settings > Pages
3. Select branch and deploy

## 📞 Need Help?

1. Check **Help & FAQ** in Settings
2. Review **README.md**
3. Check browser console for errors

---

**Enjoy your Speedometer PWA!** 🚀
