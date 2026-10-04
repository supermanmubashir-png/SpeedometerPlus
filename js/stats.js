/**
 * Speedometer PWA - Stats Handler
 * Computes analytics and statistics from trip data
 */

class StatsHandler {
    constructor() {
        this.currentPeriod = 'all';
        this.chartInstances = {};
    }

    /**
     * Initialize stats handler
     */
    async init() {
        console.log('Stats handler initialized');
    }

    /**
     * Get stats for current period
     */
    async getStats(period = 'all') {
        this.currentPeriod = period;
        const trips = await this.getTripsForPeriod(period);
        return this.computeStats(trips);
    }

    /**
     * Get trips filtered by period
     */
    async getTripsForPeriod(period) {
        const allTrips = await window.SpeedometerDB.getAllTrips();

        if (period === 'all') {
            return allTrips;
        }

        const now = Date.now();
        let startDate;

        switch (period) {
            case 'today':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                startDate = today.getTime();
                break;
            case '7d':
                startDate = now - (7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = now - (30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = 0;
        }

        return allTrips.filter(trip => trip.startTime >= startDate);
    }

    /**
     * Compute statistics from trips
     */
    computeStats(trips) {
        if (!trips || trips.length === 0) {
            return {
                totalDistance: 0,
                totalTime: 0,
                totalTrips: 0,
                avgSpeed: 0,
                maxSpeed: 0,
                distancePerDay: [],
                speedDistribution: [],
                avgSpeedTrend: [],
                insights: {}
            };
        }

        // Basic stats
        const totalDistance = trips.reduce((sum, trip) => sum + trip.distanceKm, 0);
        const totalTime = trips.reduce((sum, trip) => sum + trip.movingTimeSec, 0);
        const allSpeeds = trips.flatMap(trip => trip.points.map(p => p.speed));
        const maxSpeed = Math.max(...allSpeeds, 0);
        const avgSpeed = totalDistance / (totalTime / 3600) || 0;

        // Distance per day
        const distancePerDay = this.calculateDistancePerDay(trips);

        // Speed distribution
        const speedDistribution = this.calculateSpeedDistribution(allSpeeds);

        // Average speed trend
        const avgSpeedTrend = this.calculateAvgSpeedTrend(trips);

        // Insights
        const insights = this.calculateInsights(trips);

        return {
            totalDistance,
            totalTime,
            totalTrips: trips.length,
            avgSpeed,
            maxSpeed,
            distancePerDay,
            speedDistribution,
            avgSpeedTrend,
            insights
        };
    }

    /**
     * Calculate distance per day
     */
    calculateDistancePerDay(trips) {
        const dayDistances = {};

        trips.forEach(trip => {
            const date = new Date(trip.startTime).toDateString();
            dayDistances[date] = (dayDistances[date] || 0) + trip.distanceKm;
        });

        // Convert to array and sort by date
        return Object.entries(dayDistances)
            .map(([date, distance]) => ({
                date,
                distance
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-14); // Last 14 days
    }

    /**
     * Calculate speed distribution (histogram)
     */
    calculateSpeedDistribution(speeds) {
        if (!speeds || speeds.length === 0) return [];

        const bins = [
            { range: '0-10', count: 0 },
            { range: '10-20', count: 0 },
            { range: '20-30', count: 0 },
            { range: '30-40', count: 0 },
            { range: '40-50', count: 0 },
            { range: '50-60', count: 0 },
            { range: '60-70', count: 0 },
            { range: '70-80', count: 0 },
            { range: '80+', count: 0 }
        ];

        speeds.forEach(speed => {
            const binIndex = Math.min(Math.floor(speed / 10), 8);
            if (binIndex >= 0 && binIndex < bins.length) {
                bins[binIndex].count++;
            }
        });

        const maxCount = Math.max(...bins.map(b => b.count), 1);
        return bins.map(bin => ({
            ...bin,
            percentage: (bin.count / maxCount) * 100
        }));
    }

    /**
     * Calculate average speed trend
     */
    calculateAvgSpeedTrend(trips) {
        // Group trips by day
        const dayTrips = {};

        trips.forEach(trip => {
            const date = new Date(trip.startTime).toDateString();
            if (!dayTrips[date]) {
                dayTrips[date] = [];
            }
            dayTrips[date].push(trip);
        });

        // Calculate average speed per day
        return Object.entries(dayTrips)
            .map(([date, trips]) => ({
                date,
                avgSpeed: trips.reduce((sum, t) => sum + t.avgSpeedKmh, 0) / trips.length
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-14);
    }

    /**
     * Calculate insights
     */
    calculateInsights(trips) {
        if (!trips || trips.length === 0) return {};

        // Fastest trip (highest max speed)
        const fastestTrip = trips.reduce((max, trip) => 
            trip.maxSpeedKmh > (max?.maxSpeedKmh || 0) ? trip : max
        , null);

        // Longest trip
        const longestTrip = trips.reduce((max, trip) => 
            trip.distanceKm > (max?.distanceKm || 0) ? trip : max
        , null);

        // Most active day
        const dayCounts = {};
        trips.forEach(trip => {
            const date = new Date(trip.startTime).toDateString();
            dayCounts[date] = (dayCounts[date] || 0) + 1;
        });

        const mostActiveDay = Object.entries(dayCounts)
            .sort((a, b) => b[1] - a[1])[0];

        // Average trips per week
        const dateRange = trips.length > 1 
            ? (Math.max(...trips.map(t => t.startTime)) - Math.min(...trips.map(t => t.startTime))) / (1000 * 60 * 60 * 24)
            : 1;
        const weeks = Math.max(dateRange / 7, 1);
        const tripsPerWeek = trips.length / weeks;

        // Best average speed trip
        const bestAvgSpeedTrip = trips.reduce((max, trip) => 
            trip.avgSpeedKmh > (max?.avgSpeedKmh || 0) ? trip : max
        , null);

        // Longest idle period
        const longestIdle = trips.reduce((max, trip) => 
            trip.idleTimeSec > max ? trip.idleTimeSec : max
        , 0);

        // Streak calculation
        const uniqueDays = new Set(trips.map(t => new Date(t.startTime).toDateString()));
        const streak = this.calculateStreak(uniqueDays);

        return {
            fastestTrip: fastestTrip ? {
                maxSpeed: fastestTrip.maxSpeedKmh,
                date: new Date(fastestTrip.startTime).toDateString()
            } : null,
            longestTrip: longestTrip ? {
                distance: longestTrip.distanceKm,
                date: new Date(longestTrip.startTime).toDateString()
            } : null,
            mostActiveDay: mostActiveDay ? {
                date: mostActiveDay[0],
                trips: mostActiveDay[1]
            } : null,
            tripsPerWeek: tripsPerWeek,
            bestAvgSpeedTrip: bestAvgSpeedTrip ? {
                avgSpeed: bestAvgSpeedTrip.avgSpeedKmh,
                date: new Date(bestAvgSpeedTrip.startTime).toDateString()
            } : null,
            longestIdle: longestIdle,
            streak: streak
        };
    }

    /**
     * Calculate streak
     */
    calculateStreak(uniqueDays) {
        if (uniqueDays.size === 0) return 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let streak = 0;
        let currentDate = new Date(today);

        while (true) {
            const dateStr = currentDate.toDateString();
            if (!uniqueDays.has(dateStr)) {
                // Check if it's today and we haven't done a trip yet
                if (currentDate.getTime() === today.getTime()) {
                    currentDate.setDate(currentDate.getDate() - 1);
                    continue;
                }
                break;
            }
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);

            // Safety limit
            if (streak > 365) break;
        }

        return streak;
    }

    /**
     * Format duration
     */
    formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);

        if (h > 0) {
            return `${h}h ${m}m`;
        }
        return `${m}m`;
    }

    /**
     * Export stats as CSV
     */
    async exportStatsCSV() {
        const stats = await this.getStats('all');
        const trips = await window.SpeedometerDB.getAllTrips();

        const headers = ['Date', 'Distance (km)', 'Duration (s)', 'Avg Speed (km/h)', 'Max Speed (km/h)'];
        const rows = trips.map(trip => [
            new Date(trip.startTime).toISOString(),
            trip.distanceKm.toFixed(4),
            trip.durationSec,
            trip.avgSpeedKmh.toFixed(2),
            trip.maxSpeedKmh.toFixed(2)
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * Export stats as JSON
     */
    async exportStatsJSON() {
        const stats = await this.getStats('all');
        const trips = await window.SpeedometerDB.getAllTrips();

        return JSON.stringify({ stats, trips }, null, 2);
    }

    /**
     * Reset all stats (by clearing data)
     */
    async resetStats() {
        await window.SpeedometerDB.clearAllData();
        this.chartInstances = {};
    }

    /**
     * Draw distance per day chart
     */
    drawDistanceChart(data, canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data || data.length === 0) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Get colors
        const styles = getComputedStyle(document.documentElement);
        const accentColor = styles.getPropertyValue('--accent-primary').trim();
        const gridColor = styles.getPropertyValue('--border-color').trim();

        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        const maxDistance = Math.max(...data.map(d => d.distance), 1);
        const barWidth = (graphWidth / data.length) * 0.7;
        const barGap = (graphWidth / data.length) * 0.3;

        // Draw bars
        data.forEach((item, index) => {
            const x = padding.left + (index * (barWidth + barGap)) + barGap / 2;
            const barHeight = (item.distance / maxDistance) * graphHeight;
            const y = padding.top + graphHeight - barHeight;

            // Bar
            ctx.fillStyle = accentColor;
            ctx.fillRect(x, y, barWidth, barHeight);

            // Label
            ctx.fillStyle = gridColor;
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            const date = new Date(item.date);
            const label = `${date.getDate()}/${date.getMonth() + 1}`;
            ctx.fillText(label, x + barWidth / 2, height - 10);
        });
    }

    /**
     * Draw speed distribution chart
     */
    drawSpeedChart(data, canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data || data.length === 0) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Get colors
        const styles = getComputedStyle(document.documentElement);
        const accentColor = styles.getPropertyValue('--accent-primary').trim();
        const gridColor = styles.getPropertyValue('--border-color').trim();
        const textColor = styles.getPropertyValue('--text-muted').trim();

        const padding = { top: 20, right: 20, bottom: 30, left: 30 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        const barWidth = graphWidth / data.length;

        // Draw bars
        data.forEach((bin, index) => {
            const x = padding.left + (index * barWidth);
            const barHeight = (bin.percentage / 100) * graphHeight;
            const y = padding.top + graphHeight - barHeight;

            // Bar
            ctx.fillStyle = accentColor + Math.round(200 - bin.percentage * 1.5).toString(16).padStart(2, '0');
            ctx.fillRect(x + 2, y, barWidth - 4, barHeight);

            // Label
            ctx.fillStyle = textColor;
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(bin.range, x + barWidth / 2, height - 10);
        });
    }

    /**
     * Draw average speed trend chart
     */
    drawTrendChart(data, canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data || data.length === 0) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Get colors
        const styles = getComputedStyle(document.documentElement);
        const accentColor = styles.getPropertyValue('--accent-primary').trim();
        const gridColor = styles.getPropertyValue('--border-color').trim();
        const textColor = styles.getPropertyValue('--text-muted').trim();

        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        const maxSpeed = Math.max(...data.map(d => d.avgSpeed), 1);

        // Draw grid lines
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.font = '10px sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'right';

        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (graphHeight * i / 4);
            const value = Math.round(maxSpeed * (1 - i / 4));

            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            ctx.fillText(value.toString(), padding.left - 5, y + 3);
        }

        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        data.forEach((item, index) => {
            const x = padding.left + (index / (data.length - 1)) * graphWidth;
            const y = padding.top + graphHeight - (item.avgSpeed / maxSpeed) * graphHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw points
        data.forEach((item, index) => {
            const x = padding.left + (index / (data.length - 1)) * graphWidth;
            const y = padding.top + graphHeight - (item.avgSpeed / maxSpeed) * graphHeight;

            ctx.beginPath();
            ctx.fillStyle = accentColor;
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw labels
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        data.forEach((item, index) => {
            const x = padding.left + (index / (data.length - 1)) * graphWidth;
            const date = new Date(item.date);
            const label = `${date.getDate()}/${date.getMonth() + 1}`;
            ctx.fillText(label, x, height - 10);
        });
    }
}

// Export Stats Handler
window.StatsHandler = StatsHandler;
