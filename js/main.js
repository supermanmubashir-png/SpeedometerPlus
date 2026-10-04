/**
 * Speedometer PWA - Main Application
 * Initializes and coordinates all modules
 */

// Global app state
const app = {
    gpsHandler: null,
    uiHandler: null,
    tripHandler: null,
    statsHandler: null,
    settingsHandler: null,
    alarmOscillator: null,
    alarmInterval: null,
    isAlarmActive: false,
    wakeLock: null
};

/**
 * Initialize the application
 */
async function initApp() {
    console.log('Speedometer PWA initializing...');

    try {
        // Initialize database
        await window.SpeedometerDB.initDB();
        console.log('Database initialized');

        // Initialize handlers
        app.settingsHandler = new SettingsHandler();
        await app.settingsHandler.init();

        app.uiHandler = new UIHandler();
        await app.uiHandler.init();
        window.uiHandler = app.uiHandler;

        app.tripHandler = new TripHandler();
        await app.tripHandler.init();

        app.statsHandler = new StatsHandler();
        await app.statsHandler.init();

        app.gpsHandler = new GPSHandler();

        // Setup UI
        setupNavigation();
        setupTripControls();
        setupQuickActions();
        setupSettingsActions();
        setupModals();

        // Start GPS
        await app.gpsHandler.start();

        // Setup GPS listeners
        app.gpsHandler.on('update', handleGPSUpdate);
        app.gpsHandler.on('status', handleGPSStatus);
        app.gpsHandler.on('error', handleGPSError);

        // Setup trip listeners
        app.tripHandler.on('tripStarted', handleTripStarted);
        app.tripHandler.on('tripUpdated', handleTripUpdated);
        app.tripHandler.on('tripPaused', handleTripPaused);
        app.tripHandler.on('tripResumed', handleTripResumed);
        app.tripHandler.on('tripStopped', handleTripStopped);

        // Setup visibility change
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Setup orientation
        checkOrientation();
        window.addEventListener('resize', checkOrientation);

        // Request wake lock
        requestWakeLock();

        // Update odometer display
        updateOdometerDisplay();

        // Load trip list
        loadTripList();

        // Load stats
        loadStats();

        // Check for PWA install
        setupPWAInstall();

        console.log('Speedometer PWA initialized successfully!');

        // Show welcome toast
        showToast('Speedometer ready!');

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showToast('Failed to initialize app');
    }
}

/**
 * Handle GPS update
 */
function handleGPSUpdate(gpsData) {
    // Update UI
    app.uiHandler.updateSpeed(gpsData);

    // Update trip
    if (app.tripHandler.isTripActive()) {
        app.tripHandler.updateTrip(gpsData);
    }

    // Check alarm
    checkAlarm(gpsData.speed);
}

/**
 * Handle GPS status change
 */
function handleGPSStatus(status) {
    console.log('GPS status:', status);
}

/**
 * Handle GPS error
 */
function handleGPSError(error) {
    console.error('GPS error:', error);
    showToast(error.message || 'GPS error');
}

/**
 * Check speed alarm
 */
function checkAlarm(speedKmh) {
    if (!app.settingsHandler) return;

    const shouldAlarm = app.settingsHandler.shouldAlarm(speedKmh);

    if (shouldAlarm && !app.isAlarmActive) {
        triggerAlarm();
    } else if (!shouldAlarm && app.isAlarmActive) {
        stopAlarm();
    }
}

/**
 * Trigger overspeed alarm
 */
function triggerAlarm() {
    app.isAlarmActive = true;

    // Show visual warning
    app.uiHandler.showOverspeedWarning(true);

    // Sound alarm
    const soundType = app.settingsHandler.get('alarmSound');
    playAlarmSound(soundType);

    // Vibrate
    if (app.settingsHandler.get('vibrationEnabled')) {
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
    }

    // Continuous alarm
    if (soundType === 'continuous') {
        app.alarmInterval = setInterval(() => {
            playAlarmSound('single');
            if (app.settingsHandler.get('vibrationEnabled')) {
                navigator.vibrate(200);
            }
        }, 1000);
    }
}

/**
 * Stop alarm
 */
function stopAlarm() {
    app.isAlarmActive = false;
    app.uiHandler.showOverspeedWarning(false);
    stopAlarmSound();

    if (app.alarmInterval) {
        clearInterval(app.alarmInterval);
        app.alarmInterval = null;
    }
}

/**
 * Play alarm sound using Web Audio API
 */
function playAlarmSound(type) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 880; // A5
        oscillator.type = 'sine';

        gainNode.gain.value = 0.3;

        oscillator.start();

        if (type === 'single') {
            oscillator.stop(ctx.currentTime + 0.3);
        } else if (type === 'double') {
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 0.2);
            oscillator.stop(ctx.currentTime + 0.5);
        }

        app.alarmOscillator = oscillator;
    } catch (error) {
        console.error('Failed to play alarm:', error);
    }
}

/**
 * Stop alarm sound
 */
function stopAlarmSound() {
    if (app.alarmOscillator) {
        try {
            app.alarmOscillator.stop();
        } catch (e) {}
        app.alarmOscillator = null;
    }
}

/**
 * Setup navigation
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;

            // Update nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tab}-tab`) {
                    content.classList.add('active');
                }
            });

            // Refresh data when switching tabs
            if (tab === 'stats') {
                loadStats();
            } else if (tab === 'trip') {
                loadTripList();
                updateOdometerDisplay();
            }
        });
    });
}

/**
 * Setup trip controls
 */
function setupTripControls() {
    const startBtn = document.getElementById('start-trip-btn');
    const pauseBtn = document.getElementById('pause-trip-btn');
    const resumeBtn = document.getElementById('resume-trip-btn');
    const stopBtn = document.getElementById('stop-trip-btn');

    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            const started = await app.tripHandler.startTrip();
            if (started) {
                showToast('Trip started');
            }
        });
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            app.tripHandler.pauseTrip();
            showToast('Trip paused');
        });
    }

    if (resumeBtn) {
        resumeBtn.addEventListener('click', () => {
            app.tripHandler.resumeTrip();
            showToast('Trip resumed');
        });
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', async () => {
            const trip = await app.tripHandler.stopTrip();
            if (trip) {
                showToast(`Trip saved: ${formatDistance(trip.distanceKm)}`);
                loadTripList();
                updateOdometerDisplay();
            }
        });
    }
}

/**
 * Setup quick actions
 */
function setupQuickActions() {
    const quickStartBtn = document.getElementById('quick-start-trip');
    const copySpeedBtn = document.getElementById('copy-speed-btn');

    if (quickStartBtn) {
        quickStartBtn.addEventListener('click', async () => {
            if (!app.tripHandler.isTripActive()) {
                const started = await app.tripHandler.startTrip();
                if (started) {
                    showToast('Trip started');
                }
            } else {
                const trip = await app.tripHandler.stopTrip();
                if (trip) {
                    showToast(`Trip saved: ${formatDistance(trip.distanceKm)}`);
                    loadTripList();
                    updateOdometerDisplay();
                }
            }
        });
    }

    if (copySpeedBtn) {
        copySpeedBtn.addEventListener('click', () => {
            const speed = app.gpsHandler.getSpeed();
            const unit = app.settingsHandler.get('unit');
            const value = unit === 'kmh' ? Math.round(speed) : Math.round(speed * 0.621371);
            const unitLabel = unit === 'kmh' ? 'km/h' : 'mph';

            navigator.clipboard.writeText(`${value} ${unitLabel}`).then(() => {
                showToast('Speed copied!');
            }).catch(() => {
                showToast('Failed to copy');
            });
        });
    }
}

/**
 * Setup settings actions
 */
function setupSettingsActions() {
    // Test alarm
    const testAlarmBtn = document.getElementById('test-alarm-btn');
    if (testAlarmBtn) {
        testAlarmBtn.addEventListener('click', () => {
            playAlarmSound('double');
            if ('vibrate' in navigator) {
                navigator.vibrate([200, 100, 200]);
            }
            showToast('Alarm test');
        });
    }

    // Refresh GPS
    const refreshGpsBtn = document.getElementById('refresh-gps-btn');
    if (refreshGpsBtn) {
        refreshGpsBtn.addEventListener('click', async () => {
            showToast('Refreshing GPS...');
            await app.gpsHandler.refresh();
        });
    }

    // Export all data
    const exportDataBtn = document.getElementById('export-all-data');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', async () => {
            const data = await window.SpeedometerDB.exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            downloadBlob(blob, 'speedometer-backup.json');
            showToast('Data exported');
        });
    }

    // Import data
    const importDataBtn = document.getElementById('import-data-btn');
    const importFileInput = document.getElementById('import-file-input');

    if (importDataBtn && importFileInput) {
        importDataBtn.addEventListener('click', () => {
            importFileInput.click();
        });

        importFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    await window.SpeedometerDB.importAllData(data);
                    showToast('Data imported successfully');
                    loadTripList();
                    updateOdometerDisplay();
                } catch (error) {
                    showToast('Failed to import data');
                }
            };
            reader.readAsText(file);
            importFileInput.value = '';
        });
    }

    // Clear all data
    const clearDataBtn = document.getElementById('clear-all-data');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => {
            showModal('Clear All Data', 'This will permanently delete all trips, settings, and statistics. This action cannot be undone.', [
                { text: 'Cancel', type: 'secondary' },
                { 
                    text: 'Clear All', 
                    type: 'danger',
                    action: async () => {
                        await window.SpeedometerDB.clearAllData();
                        showToast('All data cleared');
                        loadTripList();
                        updateOdometerDisplay();
                    }
                }
            ]);
        });
    }

    // Export stats
    const exportCsvBtn = document.getElementById('export-stats-csv');
    const exportJsonBtn = document.getElementById('export-stats-json');

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', async () => {
            const csv = await app.statsHandler.exportStatsCSV();
            const blob = new Blob([csv], { type: 'text/csv' });
            downloadBlob(blob, 'speedometer-stats.csv');
            showToast('Stats exported');
        });
    }

    if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', async () => {
            const json = await app.statsHandler.exportStatsJSON();
            const blob = new Blob([json], { type: 'application/json' });
            downloadBlob(blob, 'speedometer-stats.json');
            showToast('Stats exported');
        });
    }

    // Privacy policy
    const privacyBtn = document.getElementById('privacy-policy-btn');
    if (privacyBtn) {
        privacyBtn.addEventListener('click', () => {
            showModal('Privacy Policy', `
                <p><strong>Speedometer PWA Privacy Policy</strong></p>
                <p>This app respects your privacy:</p>
                <ul>
                    <li>All data is stored locally on your device</li>
                    <li>No data is sent to any server</li>
                    <li>No analytics or tracking</li>
                    <li>No third-party services</li>
                    <li>GPS data is used only for speed calculation</li>
                </ul>
                <p>Your location data never leaves your device.</p>
            `, [{ text: 'Close', type: 'primary' }]);
        });
    }

    // Help/FAQ
    const helpBtn = document.getElementById('help-faq-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            showModal('Help & FAQ', `
                <p><strong>Getting Best GPS Accuracy</strong></p>
                <ul>
                    <li>Use outdoors with clear sky view</li>
                    <li>Wait 30-60 seconds for GPS to warm up</li>
                    <li>Keep device still while starting</li>
                    <li>Enable high accuracy mode</li>
                </ul>
                <p><strong>Why speed differs from car</strong></p>
                <ul>
                    <li>Car speedometers often overestimate by 5-10%</li>
                    <li>GPS measures ground speed, not wheel speed</li>
                    <li>GPS is generally more accurate</li>
                </ul>
                <p><strong>Trip Tracking</strong></p>
                <ul>
                    <li>Start trip before moving</li>
                    <li>Auto-pause when stopped</li>
                    <li>All data saved locally</li>
                </ul>
            `, [{ text: 'Close', type: 'primary' }]);
        });
    }
}

/**
 * Setup modals
 */
function setupModals() {
    // Trip filter/search can be added here
}

/**
 * Handle trip started
 */
function handleTripStarted(trip) {
    document.getElementById('start-trip-btn').classList.add('hidden');
    document.getElementById('pause-trip-btn').classList.remove('hidden');
    document.getElementById('stop-trip-btn').classList.remove('hidden');
    document.getElementById('active-trip-info').classList.remove('hidden');

    updateTripDisplay(trip);
}

/**
 * Handle trip updated
 */
function handleTripUpdated(trip) {
    updateTripDisplay(trip);
}

/**
 * Handle trip paused
 */
function handleTripPaused() {
    document.getElementById('pause-trip-btn').classList.add('hidden');
    document.getElementById('resume-trip-btn').classList.remove('hidden');
    showToast('Trip paused');
}

/**
 * Handle trip resumed
 */
function handleTripResumed() {
    document.getElementById('resume-trip-btn').classList.add('hidden');
    document.getElementById('pause-trip-btn').classList.remove('hidden');
    showToast('Trip resumed');
}

/**
 * Handle trip stopped
 */
function handleTripStopped(trip) {
    document.getElementById('start-trip-btn').classList.remove('hidden');
    document.getElementById('pause-trip-btn').classList.add('hidden');
    document.getElementById('resume-trip-btn').classList.add('hidden');
    document.getElementById('stop-trip-btn').classList.add('hidden');
    document.getElementById('active-trip-info').classList.add('hidden');
}

/**
 * Update trip display
 */
function updateTripDisplay(trip) {
    const unit = app.settingsHandler.get('unit');
    const distance = unit === 'kmh' ? trip.distanceKm : trip.distanceMi;
    const unitLabel = unit === 'kmh' ? 'km' : 'mi';
    const speedUnit = unit === 'kmh' ? 'km/h' : 'mph';

    const distanceEl = document.getElementById('trip-distance');
    const distanceUnitEl = document.getElementById('trip-distance-unit');
    const durationEl = document.getElementById('trip-duration');
    const avgSpeedEl = document.getElementById('trip-avg-speed');
    const maxSpeedEl = document.getElementById('trip-max-speed');

    if (distanceEl) distanceEl.textContent = distance.toFixed(2);
    if (distanceUnitEl) distanceUnitEl.textContent = unitLabel;
    if (durationEl) durationEl.textContent = TripHandler.formatDuration(trip.durationSec);
    if (avgSpeedEl) avgSpeedEl.textContent = Math.round(trip.avgSpeedKmh * (unit === 'kmh' ? 1 : 0.621371));
    if (maxSpeedEl) maxSpeedEl.textContent = Math.round(trip.maxSpeedKmh * (unit === 'kmh' ? 1 : 0.621371));

    // Update main UI trip stats
    app.uiHandler.updateTripStats(trip);
}

/**
 * Load trip list
 */
async function loadTripList() {
    const trips = await app.tripHandler.getAllTrips();
    const listEl = document.getElementById('trip-list');
    const emptyEl = document.getElementById('trip-list-empty');

    if (!listEl) return;

    listEl.innerHTML = '';

    if (!trips || trips.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');

    // Sort by date descending
    trips.sort((a, b) => b.startTime - a.startTime);

    trips.forEach(trip => {
        const item = createTripListItem(trip);
        listEl.appendChild(item);
    });
}

/**
 * Create trip list item
 */
function createTripListItem(trip) {
    const unit = app.settingsHandler.get('unit');
    const distance = unit === 'kmh' ? trip.distanceKm : trip.distanceMi;
    const unitLabel = unit === 'kmh' ? 'km' : 'mi';
    const speedUnit = unit === 'kmh' ? 'km/h' : 'mph';

    const item = document.createElement('div');
    item.className = 'trip-item';

    const date = new Date(trip.startTime).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    item.innerHTML = `
        <div class="trip-item-info">
            <div class="trip-item-date">${trip.name || date}</div>
            <div class="trip-item-stats">
                <span class="trip-item-stat">${distance.toFixed(2)} ${unitLabel}</span>
                <span class="trip-item-stat">${TripHandler.formatDuration(trip.durationSec)}</span>
                <span class="trip-item-stat">Ø ${Math.round(trip.avgSpeedKmh * (unit === 'kmh' ? 1 : 0.621371))} ${speedUnit}</span>
            </div>
        </div>
        <div class="trip-item-actions">
            <button class="trip-item-action" data-action="view" title="View">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </button>
            <button class="trip-item-action" data-action="export" title="Export">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            </button>
            <button class="trip-item-action" data-action="delete" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `;

    // View action
    item.querySelector('[data-action="view"]').addEventListener('click', (e) => {
        e.stopPropagation();
        showTripDetail(trip);
    });

    // Export action
    item.querySelector('[data-action="export"]').addEventListener('click', async (e) => {
        e.stopPropagation();
        const json = await app.tripHandler.exportTrip(trip.id);
        const blob = new Blob([json], { type: 'application/json' });
        downloadBlob(blob, `trip-${trip.id}.json`);
        showToast('Trip exported');
    });

    // Delete action
    item.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        showModal('Delete Trip', 'Are you sure you want to delete this trip?', [
            { text: 'Cancel', type: 'secondary' },
            { 
                text: 'Delete', 
                type: 'danger',
                action: async () => {
                    await app.tripHandler.deleteTrip(trip.id);
                    showToast('Trip deleted');
                    loadTripList();
                    updateOdometerDisplay();
                }
            }
        ]);
    });

    return item;
}

/**
 * Show trip detail
 */
async function showTripDetail(trip) {
    const unit = app.settingsHandler.get('unit');
    const distance = unit === 'kmh' ? trip.distanceKm : trip.distanceMi;
    const unitLabel = unit === 'kmh' ? 'km' : 'mi';
    const speedUnit = unit === 'kmh' ? 'km/h' : 'mph';

    const content = `
        <div class="trip-detail">
            <div class="trip-detail-header">
                <h3 class="trip-detail-title">${trip.name || TripHandler.formatDate(trip.startTime)}</h3>
                <button class="trip-detail-close" onclick="closeModal()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="trip-detail-stats">
                <div class="trip-detail-stat">
                    <span class="trip-detail-stat-label">Distance</span>
                    <span class="trip-detail-stat-value">${distance.toFixed(2)} ${unitLabel}</span>
                </div>
                <div class="trip-detail-stat">
                    <span class="trip-detail-stat-label">Duration</span>
                    <span class="trip-detail-stat-value">${TripHandler.formatDuration(trip.durationSec)}</span>
                </div>
                <div class="trip-detail-stat">
                    <span class="trip-detail-stat-label">Avg Speed</span>
                    <span class="trip-detail-stat-value">${Math.round(trip.avgSpeedKmh * (unit === 'kmh' ? 1 : 0.621371))} ${speedUnit}</span>
                </div>
                <div class="trip-detail-stat">
                    <span class="trip-detail-stat-label">Max Speed</span>
                    <span class="trip-detail-stat-value">${Math.round(trip.maxSpeedKmh * (unit === 'kmh' ? 1 : 0.621371))} ${speedUnit}</span>
                </div>
            </div>
            <div class="trip-detail-actions">
                <button class="trip-detail-action" onclick="exportTrip(${trip.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export JSON
                </button>
                <button class="trip-detail-action" onclick="exportTripCSV(${trip.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export CSV
                </button>
            </div>
        </div>
    `;

    showModalContent(content);
}

/**
 * Export trip (global function for modal)
 */
async function exportTrip(id) {
    const json = await app.tripHandler.exportTrip(id);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `trip-${id}.json`);
    showToast('Trip exported');
}

/**
 * Export trip CSV (global function for modal)
 */
async function exportTripCSV(id) {
    const csv = await app.tripHandler.exportTripCSV(id);
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `trip-${id}.csv`);
    showToast('Trip exported as CSV');
}

/**
 * Load stats
 */
async function loadStats() {
    const period = app.statsHandler.currentPeriod;
    const stats = await app.statsHandler.getStats(period);
    const unit = app.settingsHandler.get('unit');
    const speedUnit = unit === 'kmh' ? 'km/h' : 'mph';

    // Update overview
    const distanceEl = document.getElementById('stats-total-distance');
    const distanceUnitEl = document.getElementById('stats-distance-unit');
    const timeEl = document.getElementById('stats-total-time');
    const tripsEl = document.getElementById('stats-total-trips');
    const avgSpeedEl = document.getElementById('stats-avg-speed');
    const maxSpeedEl = document.getElementById('stats-max-speed');

    const distance = unit === 'kmh' ? stats.totalDistance : stats.totalDistance * 0.621371;

    if (distanceEl) distanceEl.textContent = distance.toFixed(2);
    if (distanceUnitEl) distanceUnitEl.textContent = unit === 'kmh' ? 'km' : 'mi';
    if (timeEl) timeEl.textContent = app.statsHandler.formatDuration(stats.totalTime);
    if (tripsEl) tripsEl.textContent = stats.totalTrips;
    if (avgSpeedEl) avgSpeedEl.textContent = Math.round(stats.avgSpeed * (unit === 'kmh' ? 1 : 0.621371));
    if (maxSpeedEl) maxSpeedEl.textContent = Math.round(stats.maxSpeed * (unit === 'kmh' ? 1 : 0.621371));

    // Draw charts
    app.statsHandler.drawDistanceChart(stats.distancePerDay, 'distance-chart');
    app.statsHandler.drawSpeedChart(stats.speedDistribution, 'speed-chart');

    // Update insights
    const fastestEl = document.getElementById('insight-fastest');
    const longestEl = document.getElementById('insight-longest');
    const activeEl = document.getElementById('insight-active');
    const tripsWeekEl = document.getElementById('insight-trips-week');

    if (fastestEl) {
        fastestEl.textContent = stats.insights.fastestTrip 
            ? `${Math.round(stats.insights.fastestTrip.maxSpeed * (unit === 'kmh' ? 1 : 0.621371))} ${speedUnit}`
            : '--';
    }
    if (longestEl) {
        longestEl.textContent = stats.insights.longestTrip
            ? `${(unit === 'kmh' ? stats.insights.longestTrip.distance : stats.insights.longestTrip.distance * 0.621371).toFixed(1)} ${unit === 'kmh' ? 'km' : 'mi'}`
            : '--';
    }
    if (activeEl) {
        activeEl.textContent = stats.insights.mostActiveDay?.date || '--';
    }
    if (tripsWeekEl) {
        tripsWeekEl.textContent = stats.insights.tripsPerWeek?.toFixed(1) || '--';
    }
}

/**
 * Update odometer display
 */
async function updateOdometerDisplay() {
    const odometer = await window.SpeedometerDB.getOdometer();
    const unit = app.settingsHandler.get('unit');
    const distance = unit === 'kmh' ? odometer : odometer * 0.621371;
    const unitLabel = unit === 'kmh' ? 'km' : 'mi';

    const distanceEl = document.getElementById('lifetime-distance');
    const unitEl = document.getElementById('lifetime-unit');

    if (distanceEl) distanceEl.textContent = distance.toFixed(2);
    if (unitEl) unitEl.textContent = unitLabel;
}

/**
 * Handle visibility change
 */
function handleVisibilityChange() {
    if (document.hidden) {
        // App in background
        console.log('App in background');
    } else {
        // App visible - refresh GPS
        if (app.gpsHandler) {
            app.gpsHandler.refresh();
        }
    }
}

/**
 * Check orientation
 */
function checkOrientation() {
    const warningEl = document.getElementById('orientation-warning');
    const isLandscape = window.innerWidth > window.innerHeight;

    if (warningEl) {
        warningEl.classList.toggle('hidden', !isLandscape);
    }
}

/**
 * Request wake lock
 */
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            app.wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake lock active');
        } catch (err) {
            console.log('Wake lock failed:', err);
        }
    }
}

/**
 * Show toast notification
 */
function showToast(message, duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hidden');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show modal
 */
function showModal(title, content, actions) {
    const container = document.getElementById('modal-container');
    if (!container) return;

    const actionsHtml = actions.map((action, index) => `
        <button class="modal-btn modal-btn-${action.type}" data-index="${index}">
            ${action.text}
        </button>
    `).join('');

    container.innerHTML = `
        <div class="modal">
            <h3 class="modal-title">${title}</h3>
            <div class="modal-content">${content}</div>
            <div class="modal-actions">${actionsHtml}</div>
        </div>
    `;

    container.classList.remove('hidden');

    // Setup action handlers
    container.querySelectorAll('.modal-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            const action = actions[index];
            if (action.action) {
                action.action();
            }
            closeModal();
        });
    });
}

/**
 * Show modal with raw content
 */
function showModalContent(content) {
    const container = document.getElementById('modal-container');
    if (!container) return;

    container.innerHTML = content;
    container.classList.remove('hidden');
}

/**
 * Close modal (global function)
 */
function closeModal() {
    const container = document.getElementById('modal-container');
    if (container) {
        container.classList.add('hidden');
    }
}

// Make closeModal global
window.closeModal = closeModal;

/**
 * Download blob
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Format distance
 */
function formatDistance(km) {
    const unit = app.settingsHandler?.get('unit') || 'kmh';
    const distance = unit === 'kmh' ? km : km * 0.621371;
    const unitLabel = unit === 'kmh' ? 'km' : 'mi';
    return `${distance.toFixed(2)} ${unitLabel}`;
}

/**
 * Setup PWA install prompt
 */
function setupPWAInstall() {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('PWA install prompt available');
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA installed');
        deferredPrompt = null;
    });
}

/**
 * Time filter for stats
 */
document.addEventListener('DOMContentLoaded', () => {
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', async () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const period = chip.dataset.period;
            app.statsHandler.currentPeriod = period;
            await loadStats();
        });
    });
});

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Make functions global for HTML onclick handlers
window.exportTrip = exportTrip;
window.exportTripCSV = exportTripCSV;
