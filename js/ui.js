/**
 * Speedometer PWA - UI Handler
 * Manages speedometer displays, animations, and UI updates
 */

class UIHandler {
    constructor() {
        this.currentMode = 'analogue';
        this.currentSpeed = 0;
        this.targetSpeed = 0;
        this.displaySpeed = 0;
        this.unit = 'kmh';
        this.gaugeMaxSpeed = 160;
        this.animationFrame = null;
        this.speedHistory = [];
        this.maxHistoryLength = 120;
        this.heading = 0;
        this.settings = {};

        // DOM Elements
        this.elements = {};
    }

    /**
     * Initialize UI
     */
    async init() {
        this.cacheElements();
        await this.loadSettings();
        this.setupGauge();
        this.setupEventListeners();
        this.startAnimationLoop();
        this.setupGraph();
        console.log('UI initialized');
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Speed displays
            gaugeNeedle: document.querySelector('.gauge-needle'),
            gaugeSpeedValue: document.querySelector('.gauge-speed-value'),
            gaugeSpeedUnit: document.querySelector('.gauge-speed-unit'),
            digitalSpeed: document.getElementById('digital-speed'),
            digitalUnit: document.getElementById('digital-unit'),
            digitalAvg: document.getElementById('digital-avg'),
            digitalMax: document.getElementById('digital-max'),
            digitalGps: document.getElementById('digital-gps'),
            minimalSpeed: document.getElementById('minimal-speed'),
            minimalUnit: document.getElementById('minimal-unit'),
            minimalGpsDot: document.getElementById('minimal-gps-dot'),
            hudSpeed: document.getElementById('hud-speed'),
            hudUnit: document.getElementById('hud-unit'),
            hudStatus: document.getElementById('hud-status'),
            graphCurrentSpeed: document.getElementById('graph-current-speed'),
            compassSpeedValue: document.getElementById('compass-speed-value'),
            compassSpeedUnit: document.getElementById('compass-speed-unit'),
            compassHeading: document.getElementById('compass-heading'),
            compassArrow: document.getElementById('compass-arrow'),

            // Modes
            modeButtons: document.querySelectorAll('.mode-btn'),
            modeDisplays: document.querySelectorAll('.gauge-mode, .digital-mode, .minimalist-mode, .hud-mode, .graph-mode, .compass-mode'),

            // GPS Status
            gpsDot: document.querySelector('.gps-dot'),
            gpsText: document.querySelector('.gps-text'),

            // Warning
            overspeedWarning: document.getElementById('overspeed-warning'),

            // Graph
            speedGraph: document.getElementById('speed-graph')
        };
    }

    /**
     * Load UI settings
     */
    async loadSettings() {
        this.unit = await window.SpeedometerDB.getSetting('unit', 'kmh');
        this.gaugeMaxSpeed = await window.SpeedometerDB.getSetting('gaugeMaxSpeed', 160);
        this.settings = {
            needleStyle: await window.SpeedometerDB.getSetting('needleStyle', 'classic'),
            fontSize: await window.SpeedometerDB.getSetting('fontSize', 48),
            hudMirror: await window.SpeedometerDB.getSetting('hudMirror', false),
            showAverage: await window.SpeedometerDB.getSetting('showAverage', true),
            showMax: await window.SpeedometerDB.getSetting('showMax', true),
            showAccuracy: await window.SpeedometerDB.getSetting('showAccuracy', true)
        };

        this.applySettings();
    }

    /**
     * Apply UI settings
     */
    applySettings() {
        // Needle style
        if (this.elements.gaugeNeedle) {
            this.elements.gaugeNeedle.className.baseVal = 'gauge-needle ' + this.settings.needleStyle;
        }

        // Font size
        if (this.elements.digitalSpeed) {
            this.elements.digitalSpeed.style.fontSize = `${this.settings.fontSize}px`;
        }

        // HUD mirror
        const hudDisplay = document.getElementById('hud-display');
        if (hudDisplay) {
            hudDisplay.style.transform = this.settings.hudMirror ? 'scaleX(-1)' : '';
        }
    }

    /**
     * Setup analogue gauge ticks and labels
     */
    setupGauge() {
        const ticksGroup = document.querySelector('.gauge-ticks');
        const labelsGroup = document.querySelector('.gauge-labels');

        if (!ticksGroup || !labelsGroup) return;

        ticksGroup.innerHTML = '';
        labelsGroup.innerHTML = '';

        const startAngle = -135;
        const endAngle = 135;
        const totalAngle = endAngle - startAngle;
        const majorTicks = 8;
        const minorTicksPerMajor = 4;
        const centerX = 150;
        const centerY = 150;
        const outerRadius = 125;
        const majorInnerRadius = 110;
        const minorInnerRadius = 117;
        const labelRadius = 95;

        // Create ticks
        for (let i = 0; i <= majorTicks * minorTicksPerMajor; i++) {
            const isMajor = i % minorTicksPerMajor === 0;
            const angle = startAngle + (i / (majorTicks * minorTicksPerMajor)) * totalAngle;
            const rad = (angle * Math.PI) / 180;
            const innerRadius = isMajor ? majorInnerRadius : minorInnerRadius;

            const x1 = centerX + Math.cos(rad) * innerRadius;
            const y1 = centerY + Math.sin(rad) * innerRadius;
            const x2 = centerX + Math.cos(rad) * outerRadius;
            const y2 = centerY + Math.sin(rad) * outerRadius;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            if (isMajor) line.classList.add('major');
            ticksGroup.appendChild(line);

            // Add labels for major ticks
            if (isMajor) {
                const value = Math.round((i / (majorTicks * minorTicksPerMajor)) * this.gaugeMaxSpeed);
                const labelX = centerX + Math.cos(rad) * labelRadius;
                const labelY = centerY + Math.sin(rad) * labelRadius + 5;

                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', labelX);
                text.setAttribute('y', labelY);
                text.setAttribute('text-anchor', 'middle');
                text.textContent = value;
                labelsGroup.appendChild(text);
            }
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mode buttons
        this.elements.modeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.dataset.mode;
                this.switchMode(mode);
            });
        });

        // Handle canvas resize
        window.addEventListener('resize', () => {
            this.resizeGraph();
        });
    }

    /**
     * Switch speedometer mode
     */
    switchMode(mode) {
        if (mode === this.currentMode) return;

        this.currentMode = mode;

        // Update buttons
        this.elements.modeButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.mode === mode);
        });

        // Update displays
        this.elements.modeDisplays.forEach(display => {
            display.classList.add('hidden');
            display.classList.remove('active');
        });

        const displayMap = {
            analogue: 'analogue-gauge',
            digital: 'digital-display',
            minimalist: 'minimalist-display',
            hud: 'hud-display',
            graph: 'graph-display',
            compass: 'compass-display'
        };

        const activeDisplay = document.getElementById(displayMap[mode]);
        if (activeDisplay) {
            activeDisplay.classList.remove('hidden');
            activeDisplay.classList.add('active');
        }

        if (mode === 'graph') {
            setTimeout(() => this.resizeGraph(), 100);
        }

        window.showToast(`Switched to ${mode} mode`);
    }

    /**
     * Update speed display with new GPS data
     */
    updateSpeed(gpsData) {
        const speedKmh = gpsData.speed || 0;
        this.targetSpeed = this.unit === 'kmh' ? speedKmh : speedKmh * 0.621371;
        this.heading = gpsData.heading || this.heading;

        // Add to history
        this.speedHistory.push({
            speed: this.targetSpeed,
            timestamp: gpsData.timestamp || Date.now()
        });
        if (this.speedHistory.length > this.maxHistoryLength) {
            this.speedHistory.shift();
        }

        // Update static UI elements immediately
        this.updateStaticDisplays(gpsData);
    }

    /**
     * Update displays that don't need animation
     */
    updateStaticDisplays(gpsData) {
        const speed = Math.round(this.targetSpeed);
        const unitLabel = this.unit === 'kmh' ? 'km/h' : 'mph';

        // Digital display
        if (this.elements.digitalSpeed) this.elements.digitalSpeed.textContent = speed;
        if (this.elements.digitalUnit) this.elements.digitalUnit.textContent = unitLabel;
        if (this.elements.digitalGps) {
            this.elements.digitalGps.textContent = gpsData.accuracy ? `±${gpsData.accuracy}m` : '--';
        }

        // Minimalist display
        if (this.elements.minimalSpeed) this.elements.minimalSpeed.textContent = speed;
        if (this.elements.minimalUnit) this.elements.minimalUnit.textContent = unitLabel;
        if (this.elements.minimalGpsDot) {
            this.elements.minimalGpsDot.style.background = gpsData.status === 'active' ? 'var(--accent-success)' : 'var(--accent-warning)';
        }

        // HUD display
        if (this.elements.hudSpeed) this.elements.hudSpeed.textContent = speed;
        if (this.elements.hudUnit) this.elements.hudUnit.textContent = unitLabel;
        if (this.elements.hudStatus) {
            this.elements.hudStatus.textContent = gpsData.status === 'active' ? 'GPS ACTIVE' : 'SEARCHING GPS';
        }

        // Graph display
        if (this.elements.graphCurrentSpeed) {
            this.elements.graphCurrentSpeed.textContent = `${speed} ${unitLabel}`;
        }

        // Compass display
        if (this.elements.compassSpeedValue) this.elements.compassSpeedValue.textContent = speed;
        if (this.elements.compassSpeedUnit) this.elements.compassSpeedUnit.textContent = unitLabel;
        if (this.elements.compassHeading) {
            this.elements.compassHeading.textContent = this.heading !== null ? `${Math.round(this.heading)}°` : '--°';
        }

        // Update GPS status
        this.updateGPSStatus(gpsData);
    }

    /**
     * Animation loop for smooth needle movement
     */
    startAnimationLoop() {
        const animate = () => {
            // Smooth interpolation
            const diff = this.targetSpeed - this.displaySpeed;
            this.displaySpeed += diff * 0.15;

            // Update gauge needle
            this.updateGaugeNeedle();

            // Update graph if active
            if (this.currentMode === 'graph') {
                this.drawGraph();
            }

            // Update compass
            if (this.currentMode === 'compass') {
                this.updateCompass();
            }

            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * Update gauge needle position
     */
    updateGaugeNeedle() {
        if (!this.elements.gaugeNeedle) return;

        const clampedSpeed = Math.min(Math.max(this.displaySpeed, 0), this.gaugeMaxSpeed);
        const percentage = clampedSpeed / this.gaugeMaxSpeed;
        const angle = -135 + (percentage * 270);

        this.elements.gaugeNeedle.style.transform = `rotate(${angle}deg)`;

        if (this.elements.gaugeSpeedValue) {
            this.elements.gaugeSpeedValue.textContent = Math.round(this.displaySpeed);
        }
        if (this.elements.gaugeSpeedUnit) {
            this.elements.gaugeSpeedUnit.textContent = this.unit === 'kmh' ? 'km/h' : 'mph';
        }
    }

    /**
     * Update compass arrow
     */
    updateCompass() {
        if (this.elements.compassArrow && this.heading !== null) {
            this.elements.compassArrow.style.transform = `rotate(${this.heading}deg)`;
        }
    }

    /**
     * Update GPS status indicator
     */
    updateGPSStatus(gpsData) {
        if (!this.elements.gpsDot || !this.elements.gpsText) return;

        this.elements.gpsDot.classList.remove('searching', 'active', 'error');

        switch (gpsData.status) {
            case 'active':
                this.elements.gpsDot.classList.add('active');
                this.elements.gpsText.textContent = gpsData.accuracy ? `GPS ±${gpsData.accuracy}m` : 'GPS Active';
                break;
            case 'searching':
                this.elements.gpsDot.classList.add('searching');
                this.elements.gpsText.textContent = 'Searching GPS...';
                break;
            case 'error':
                this.elements.gpsDot.classList.add('error');
                this.elements.gpsText.textContent = 'GPS Error';
                break;
            default:
                this.elements.gpsText.textContent = 'GPS Off';
        }
    }

    /**
     * Update trip statistics on displays
     */
    updateTripStats(tripData) {
        const unitMultiplier = this.unit === 'kmh' ? 1 : 0.621371;
        const avgSpeed = Math.round((tripData.avgSpeedKmh || 0) * unitMultiplier);
        const maxSpeed = Math.round((tripData.maxSpeedKmh || 0) * unitMultiplier);

        if (this.elements.digitalAvg) this.elements.digitalAvg.textContent = avgSpeed;
        if (this.elements.digitalMax) this.elements.digitalMax.textContent = maxSpeed;
    }

    /**
     * Set unit
     */
    async setUnit(unit) {
        this.unit = unit;
        await window.SpeedometerDB.saveSetting('unit', unit);
        this.setupGauge();
        window.showToast(`Units changed to ${unit === 'kmh' ? 'km/h' : 'mph'}`);
    }

    /**
     * Set gauge max speed
     */
    setGaugeMaxSpeed(maxSpeed) {
        this.gaugeMaxSpeed = parseInt(maxSpeed);
        this.setupGauge();
    }

    /**
     * Setup graph canvas
     */
    setupGraph() {
        this.resizeGraph();
    }

    /**
     * Resize graph canvas for high DPI
     */
    resizeGraph() {
        const canvas = this.elements.speedGraph;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
    }

    /**
     * Draw speed graph
     */
    drawGraph() {
        const canvas = this.elements.speedGraph;
        if (!canvas || this.speedHistory.length < 2) return;

        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get colors from CSS variables
        const styles = getComputedStyle(document.documentElement);
        const accentColor = styles.getPropertyValue('--accent-primary').trim();
        const gridColor = styles.getPropertyValue('--border-color').trim();
        const textColor = styles.getPropertyValue('--text-muted').trim();

        // Calculate scale
        const maxSpeed = Math.max(...this.speedHistory.map(p => p.speed), 10);
        const paddedMaxSpeed = Math.ceil(maxSpeed / 10) * 10;
        const padding = { top: 20, right: 20, bottom: 30, left: 40 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        // Draw grid
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.font = '10px sans-serif';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'right';

        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (graphHeight * i / 4);
            const value = Math.round(paddedMaxSpeed * (1 - i / 4));

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

        this.speedHistory.forEach((point, index) => {
            const x = padding.left + (index / (this.speedHistory.length - 1)) * graphWidth;
            const y = padding.top + graphHeight - (point.speed / paddedMaxSpeed) * graphHeight;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw area fill
        ctx.lineTo(padding.left + graphWidth, padding.top + graphHeight);
        ctx.lineTo(padding.left, padding.top + graphHeight);
        ctx.closePath();
        ctx.fillStyle = accentColor + '20';
        ctx.fill();
    }

    /**
     * Show overspeed warning
     */
    showOverspeedWarning(show) {
        if (this.elements.overspeedWarning) {
            this.elements.overspeedWarning.classList.toggle('hidden', !show);
        }
    }

    /**
     * Destroy UI handler
     */
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}

// Export UI Handler
window.UIHandler = UIHandler;
