/**
 * Speedometer PWA - GPS Handler
 * Manages real-time GPS tracking with high accuracy
 */

class GPSHandler {
    constructor() {
        this.watchId = null;
        this.isTracking = false;
        this.lastPosition = null;
        this.listeners = new Map();
        this.speedBuffer = [];
        this.speedBufferSize = 5;

        // GPS Configuration
        this.options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        // GPS State
        this.state = {
            status: 'idle', // idle, searching, active, error
            accuracy: null,
            latitude: null,
            longitude: null,
            altitude: null,
            heading: null,
            speed: null,
            timestamp: null,
            updateCount: 0
        };

        // Filters
        this.minAccuracy = 50; // meters
        this.speedSmoothing = 5;
        this.outlierThreshold = 100; // km/h - reject unrealistic jumps
    }

    /**
     * Initialize GPS tracking
     */
    async start(options = {}) {
        // Merge options
        this.options = { ...this.options, ...options };

        // Apply settings from database
        const highAccuracy = await window.SpeedometerDB.getSetting('highAccuracy', true);
        this.options.enableHighAccuracy = highAccuracy;

        this.minAccuracy = await window.SpeedometerDB.getSetting('minAccuracyFilter', 50);
        this.speedSmoothing = await window.SpeedometerDB.getSetting('speedSmoothing', 5);

        if (!('geolocation' in navigator)) {
            this.setState('error');
            this.notify('error', { message: 'Geolocation not supported' });
            return false;
        }

        this.isTracking = true;
        this.setState('searching');

        this.watchId = navigator.geolocation.watchPosition(
            this.onPositionUpdate.bind(this),
            this.onPositionError.bind(this),
            this.options
        );

        console.log('GPS tracking started');
        return true;
    }

    /**
     * Stop GPS tracking
     */
    stop() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.isTracking = false;
        this.setState('idle');
        console.log('GPS tracking stopped');
    }

    /**
     * Refresh GPS connection
     */
    async refresh() {
        this.stop();
        await new Promise(resolve => setTimeout(resolve, 500));
        return this.start();
    }

    /**
     * Handle position updates
     */
    onPositionUpdate(position) {
        const { coords, timestamp } = position;
        const { accuracy, latitude, longitude, altitude, heading, speed } = coords;

        // Filter by accuracy
        if (accuracy > this.minAccuracy) {
            console.log('GPS point rejected - accuracy too low:', accuracy);
            return;
        }

        // Calculate speed in km/h (GPS gives m/s)
        let speedKmh = speed !== null ? speed * 3.6 : 0;

        // Apply speed smoothing
        this.speedBuffer.push(speedKmh);
        if (this.speedBuffer.length > this.speedSmoothing) {
            this.speedBuffer.shift();
        }
        const smoothedSpeed = this.speedBuffer.reduce((a, b) => a + b, 0) / this.speedBuffer.length;

        // Outlier rejection
        if (this.lastPosition && Math.abs(smoothedSpeed - this.lastPosition.speedKmh) > this.outlierThreshold) {
            console.log('GPS speed outlier rejected');
            return;
        }

        // Update state
        this.state = {
            status: 'active',
            accuracy: Math.round(accuracy),
            latitude,
            longitude,
            altitude: altitude || null,
            heading: heading || null,
            speed: smoothedSpeed,
            speedMph: smoothedSpeed * 0.621371,
            timestamp,
            updateCount: this.state.updateCount + 1
        };

        this.lastPosition = {
            speedKmh: smoothedSpeed,
            latitude,
            longitude,
            timestamp
        };

        // Notify listeners
        this.notify('update', this.state);
    }

    /**
     * Handle position errors
     */
    onPositionError(error) {
        console.error('GPS error:', error);

        let message = 'Unknown GPS error';
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Location permission denied';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Location unavailable';
                break;
            case error.TIMEOUT:
                message = 'GPS timeout - retrying...';
                // Auto-retry after timeout
                setTimeout(() => {
                    if (this.isTracking) {
                        this.refresh();
                    }
                }, 2000);
                break;
        }

        this.setState('error');
        this.notify('error', { code: error.code, message });
    }

    /**
     * Set GPS state
     */
    setState(status) {
        this.state.status = status;
        this.notify('status', status);
    }

    /**
     * Get current GPS state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get current speed in km/h
     */
    getSpeed() {
        return this.state.speed || 0;
    }

    /**
     * Get current speed in mph
     */
    getSpeedMph() {
        return (this.state.speed || 0) * 0.621371;
    }

    /**
     * Get heading/bearing
     */
    getHeading() {
        return this.state.heading;
    }

    /**
     * Get GPS accuracy
     */
    getAccuracy() {
        return this.state.accuracy;
    }

    /**
     * Check if GPS is active
     */
    isActive() {
        return this.state.status === 'active';
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
                    console.error('GPS listener error:', error);
                }
            });
        }
    }

    /**
     * Calculate distance between two points (Haversine formula)
     */
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     */
    static toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Check if speed indicates movement
     */
    static isMoving(speedKmh, threshold = 1) {
        return speedKmh >= threshold;
    }

    /**
     * Format GPS accuracy status
     */
    static formatAccuracy(accuracy) {
        if (accuracy === null || accuracy === undefined) return '--';
        if (accuracy < 10) return 'Excellent';
        if (accuracy < 30) return 'Good';
        if (accuracy < 50) return 'Fair';
        return 'Poor';
    }
}

// Export singleton instance
window.GPSHandler = GPSHandler;
