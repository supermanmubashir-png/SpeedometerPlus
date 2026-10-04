/**
 * Speedometer PWA - Trip Handler
 * Manages trip tracking, storage, and retrieval
 */

class TripHandler {
    constructor() {
        this.activeTrip = null;
        this.tripInterval = null;
        this.isPaused = false;
        this.lastPoint = null;
        this.movingThreshold = 1; // km/h
        this.autoPauseThreshold = 10; // seconds
        this.idleStartTime = null;

        this.listeners = new Map();
    }

    /**
     * Initialize trip handler
     */
    async init() {
        this.autoPauseThreshold = await window.SpeedometerDB.getSetting('autoPauseThreshold', 10);
        this.movingThreshold = await window.SpeedometerDB.getSetting('movingThreshold', 1);
        console.log('Trip handler initialized');
    }

    /**
     * Start a new trip
     */
    async startTrip() {
        if (this.activeTrip) {
            console.warn('Trip already active');
            return false;
        }

        this.activeTrip = {
            startTime: Date.now(),
            endTime: null,
            distanceKm: 0,
            distanceMi: 0,
            avgSpeedKmh: 0,
            maxSpeedKmh: 0,
            durationSec: 0,
            movingTimeSec: 0,
            idleTimeSec: 0,
            points: [],
            status: 'active',
            name: null
        };

        this.isPaused = false;
        this.lastPoint = null;
        this.idleStartTime = null;

        // Start trip tracking interval
        this.tripInterval = setInterval(() => this.updateTrip(), 1000);

        this.notify('tripStarted', this.activeTrip);
        console.log('Trip started');
        return true;
    }

    /**
     * Update trip with new GPS data
     */
    updateTrip(gpsData) {
        if (!this.activeTrip || this.isPaused) return;

        const speedKmh = gpsData ? gpsData.speed : 0;
        const lat = gpsData ? gpsData.latitude : null;
        const lng = gpsData ? gpsData.longitude : null;

        // Update max speed
        if (speedKmh > this.activeTrip.maxSpeedKmh) {
            this.activeTrip.maxSpeedKmh = speedKmh;
        }

        // Calculate distance
        if (lat !== null && lng !== null && this.lastPoint) {
            const distanceDelta = GPSHandler.calculateDistance(
                this.lastPoint.latitude,
                this.lastPoint.longitude,
                lat,
                lng
            );

            // Filter unrealistic distance jumps
            if (distanceDelta < 1) { // Less than 1km between points
                this.activeTrip.distanceKm += distanceDelta;
                this.activeTrip.distanceMi = this.activeTrip.distanceKm * 0.621371;
            }
        }

        // Track moving vs idle time
        const isMoving = speedKmh >= this.movingThreshold;

        if (isMoving) {
            this.activeTrip.movingTimeSec++;
            this.idleStartTime = null;
        } else {
            this.activeTrip.idleTimeSec++;

            // Auto-pause logic
            if (this.idleStartTime === null) {
                this.idleStartTime = Date.now();
            } else if (Date.now() - this.idleStartTime > this.autoPauseThreshold * 1000) {
                this.pauseTrip();
                this.notify('autoPaused', { reason: 'idle' });
            }
        }

        // Store point (sampled to reduce storage)
        if (this.activeTrip.points.length === 0 || 
            Date.now() - this.activeTrip.points[this.activeTrip.points.length - 1].timestamp > 2000) {
            this.activeTrip.points.push({
                timestamp: Date.now(),
                speed: speedKmh,
                latitude: lat,
                longitude: lng,
                distanceKm: this.activeTrip.distanceKm
            });
        }

        this.lastPoint = { latitude: lat, longitude: lng };

        // Calculate average speed
        if (this.activeTrip.movingTimeSec > 0) {
            this.activeTrip.avgSpeedKmh = (this.activeTrip.distanceKm / (this.activeTrip.movingTimeSec / 3600)) || 0;
        }

        // Update duration
        this.activeTrip.durationSec = Math.floor((Date.now() - this.activeTrip.startTime) / 1000);

        // Notify listeners
        this.notify('tripUpdated', this.activeTrip);
    }

    /**
     * Pause current trip
     */
    pauseTrip() {
        if (!this.activeTrip || this.isPaused) return;

        this.isPaused = true;
        this.activeTrip.status = 'paused';

        if (this.tripInterval) {
            clearInterval(this.tripInterval);
            this.tripInterval = null;
        }

        this.notify('tripPaused', this.activeTrip);
        console.log('Trip paused');
    }

    /**
     * Resume paused trip
     */
    resumeTrip() {
        if (!this.activeTrip || !this.isPaused) return;

        this.isPaused = false;
        this.activeTrip.status = 'active';
        this.idleStartTime = null;

        this.tripInterval = setInterval(() => this.updateTrip(), 1000);

        this.notify('tripResumed', this.activeTrip);
        console.log('Trip resumed');
    }

    /**
     * Stop current trip and save
     */
    async stopTrip() {
        if (!this.activeTrip) return;

        if (this.tripInterval) {
            clearInterval(this.tripInterval);
            this.tripInterval = null;
        }

        this.activeTrip.endTime = Date.now();
        this.activeTrip.status = 'completed';

        // Update odometer
        const currentOdometer = await window.SpeedometerDB.getOdometer();
        await window.SpeedometerDB.saveOdometer(currentOdometer + this.activeTrip.distanceKm);

        // Save trip
        const tripId = await window.SpeedometerDB.saveTrip(this.activeTrip);
        this.activeTrip.id = tripId;

        const completedTrip = { ...this.activeTrip };
        this.activeTrip = null;
        this.lastPoint = null;

        this.notify('tripStopped', completedTrip);
        console.log('Trip stopped and saved:', tripId);
        return completedTrip;
    }

    /**
     * Get all trips
     */
    async getAllTrips() {
        return window.SpeedometerDB.getAllTrips();
    }

    /**
     * Get trip by ID
     */
    async getTrip(id) {
        return window.SpeedometerDB.getTrip(id);
    }

    /**
     * Delete trip
     */
    async deleteTrip(id) {
        // Get trip to subtract from odometer
        const trip = await window.SpeedometerDB.getTrip(id);
        if (trip) {
            const currentOdometer = await window.SpeedometerDB.getOdometer();
            await window.SpeedometerDB.saveOdometer(Math.max(0, currentOdometer - trip.distanceKm));
        }

        await window.SpeedometerDB.deleteTrip(id);
        this.notify('tripDeleted', id);
    }

    /**
     * Update trip name
     */
    async updateTripName(id, name) {
        const trip = await window.SpeedometerDB.getTrip(id);
        if (trip) {
            trip.name = name;
            await window.SpeedometerDB.updateTrip(trip);
            this.notify('tripUpdated', trip);
        }
    }

    /**
     * Export trip as JSON
     */
    async exportTrip(id) {
        const trip = await window.SpeedometerDB.getTrip(id);
        if (!trip) return null;

        return JSON.stringify(trip, null, 2);
    }

    /**
     * Export trip as CSV
     */
    async exportTripCSV(id) {
        const trip = await window.SpeedometerDB.getTrip(id);
        if (!trip) return null;

        const headers = ['Timestamp', 'Speed (km/h)', 'Speed (mph)', 'Distance (km)', 'Latitude', 'Longitude'];
        const rows = trip.points.map(point => [
            new Date(point.timestamp).toISOString(),
            point.speed.toFixed(2),
            (point.speed * 0.621371).toFixed(2),
            point.distanceKm.toFixed(4),
            point.latitude || '',
            point.longitude || ''
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * Import trip from JSON
     */
    async importTrip(jsonData, mode = 'new') {
        try {
            const trip = JSON.parse(jsonData);

            // Validate trip structure
            if (!trip.startTime || !trip.points) {
                throw new Error('Invalid trip data');
            }

            // Remove ID to create new entry
            delete trip.id;

            if (mode === 'merge') {
                // Merge with existing trips (simplified - just add)
                const existingTrips = await this.getAllTrips();
                // Check for duplicates by start time
                const isDuplicate = existingTrips.some(t => 
                    Math.abs(t.startTime - trip.startTime) < 60000
                );
                if (isDuplicate) {
                    return null;
                }
            }

            const tripId = await window.SpeedometerDB.saveTrip(trip);

            // Update odometer
            const currentOdometer = await window.SpeedometerDB.getOdometer();
            await window.SpeedometerDB.saveOdometer(currentOdometer + trip.distanceKm);

            this.notify('tripImported', tripId);
            return tripId;
        } catch (error) {
            console.error('Failed to import trip:', error);
            return null;
        }
    }

    /**
     * Get active trip
     */
    getActiveTrip() {
        return this.activeTrip;
    }

    /**
     * Check if trip is active
     */
    isTripActive() {
        return this.activeTrip !== null && !this.isPaused;
    }

    /**
     * Check if trip is paused
     */
    isTripPaused() {
        return this.isPaused;
    }

    /**
     * Register event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * Notify listeners
     */
    notify(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Trip listener error:', error);
                }
            });
        }
    }

    /**
     * Format duration
     */
    static formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    /**
     * Format date
     */
    static formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Calculate trip statistics
     */
    static calculateStats(trips) {
        if (!trips || trips.length === 0) {
            return {
                totalDistance: 0,
                totalTime: 0,
                totalTrips: 0,
                avgSpeed: 0,
                maxSpeed: 0
            };
        }

        const totalDistance = trips.reduce((sum, trip) => sum + trip.distanceKm, 0);
        const totalTime = trips.reduce((sum, trip) => sum + trip.movingTimeSec, 0);
        const allSpeeds = trips.flatMap(trip => trip.points.map(p => p.speed));
        const maxSpeed = Math.max(...allSpeeds, 0);
        const avgSpeed = totalDistance / (totalTime / 3600) || 0;

        return {
            totalDistance,
            totalTime,
            totalTrips: trips.length,
            avgSpeed,
            maxSpeed
        };
    }
}

// Export Trip Handler
window.TripHandler = TripHandler;
