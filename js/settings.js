/**
 * Speedometer PWA - Settings Handler
 * Manages all app settings and preferences
 */

class SettingsHandler {
    constructor() {
        this.settings = {
            // GPS
            highAccuracy: true,
            autoPauseThreshold: 10,
            minAccuracyFilter: 50,
            speedSmoothing: 5,
            movingThreshold: 1,

            // Speedometer
            gaugeMaxSpeed: 160,
            gaugeTheme: 'blue',
            needleStyle: 'classic',
            fontSize: 48,
            hudMirror: false,
            showAverage: true,
            showMax: true,
            showAccuracy: true,

            // Units & Alarms
            unit: 'kmh',
            alarmEnabled: true,
            alarmThreshold: 40,
            alarmThresholdMph: 25,
            alarmSound: 'single',
            vibrationEnabled: true,

            // Appearance
            theme: 'auto',
            accentColor: '#6366f1',
            reducedMotion: false,

            // Data
            autoDeleteDays: null,
            showOnboarding: true
        };
    }

    /**
     * Initialize settings
     */
    async init() {
        await this.loadAllSettings();
        this.setupEventListeners();
        console.log('Settings initialized');
    }

    /**
     * Load all settings from database
     */
    async loadAllSettings() {
        const stored = await window.SpeedometerDB.getAllSettings();

        if (stored) {
            stored.forEach(setting => {
                if (this.settings.hasOwnProperty(setting.key)) {
                    this.settings[setting.key] = setting.value;
                }
            });
        }

        this.applySettings();
    }

    /**
     * Apply settings to UI
     */
    applySettings() {
        // GPS settings
        const highAccuracyToggle = document.getElementById('high-accuracy-toggle');
        const autoPauseInput = document.getElementById('auto-pause-threshold');
        const minAccuracyInput = document.getElementById('min-accuracy-filter');
        const smoothingInput = document.getElementById('speed-smoothing');

        if (highAccuracyToggle) highAccuracyToggle.checked = this.settings.highAccuracy;
        if (autoPauseInput) autoPauseInput.value = this.settings.autoPauseThreshold;
        if (minAccuracyInput) minAccuracyInput.value = this.settings.minAccuracyFilter;
        if (smoothingInput) smoothingInput.value = this.settings.speedSmoothing;

        // Speedometer settings
        const gaugeMaxSelect = document.getElementById('gauge-max-speed');
        const gaugeThemeSelect = document.getElementById('gauge-theme');
        const needleSelect = document.getElementById('needle-style');
        const fontSizeSlider = document.getElementById('font-size-slider');
        const hudMirrorToggle = document.getElementById('hud-mirror-toggle');

        if (gaugeMaxSelect) gaugeMaxSelect.value = this.settings.gaugeMaxSpeed.toString();
        if (gaugeThemeSelect) gaugeThemeSelect.value = this.settings.gaugeTheme;
        if (needleSelect) needleSelect.value = this.settings.needleStyle;
        if (fontSizeSlider) fontSizeSlider.value = this.settings.fontSize;
        if (hudMirrorToggle) hudMirrorToggle.checked = this.settings.hudMirror;

        // Units & Alarms
        const unitBtns = document.querySelectorAll('.unit-btn');
        const alarmToggle = document.getElementById('alarm-enable-toggle');
        const alarmThresholdInput = document.getElementById('alarm-threshold');
        const alarmSoundSelect = document.getElementById('alarm-sound');
        const vibrationToggle = document.getElementById('vibration-toggle');

        unitBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.unit === this.settings.unit);
        });
        if (alarmToggle) alarmToggle.checked = this.settings.alarmEnabled;
        if (alarmThresholdInput) alarmThresholdInput.value = this.settings.alarmThreshold;
        if (alarmSoundSelect) alarmSoundSelect.value = this.settings.alarmSound;
        if (vibrationToggle) vibrationToggle.checked = this.settings.vibrationEnabled;

        // Appearance
        const themeSelect = document.getElementById('theme-select');
        const accentColorInput = document.getElementById('accent-color');
        const reducedMotionToggle = document.getElementById('reduced-motion-toggle');

        if (themeSelect) themeSelect.value = this.settings.theme;
        if (accentColorInput) accentColorInput.value = this.settings.accentColor;
        if (reducedMotionToggle) reducedMotionToggle.checked = this.settings.reducedMotion;

        // Apply theme
        this.applyTheme();
        this.applyAccentColor();
    }

    /**
     * Apply theme
     */
    applyTheme() {
        let theme = this.settings.theme;

        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? 'dark' : 'light';
        }

        document.documentElement.setAttribute('data-theme', theme);

        // Update theme toggle icon
        const sunIcon = document.querySelector('.theme-icon.sun');
        const moonIcon = document.querySelector('.theme-icon.moon');

        if (sunIcon && moonIcon) {
            sunIcon.classList.toggle('hidden', theme === 'dark');
            moonIcon.classList.toggle('hidden', theme === 'light');
        }
    }

    /**
     * Apply accent color
     */
    applyAccentColor() {
        document.documentElement.style.setProperty('--accent-primary', this.settings.accentColor);

        // Calculate secondary accent (lighter version)
        const lighter = this.lightenColor(this.settings.accentColor, 20);
        document.documentElement.style.setProperty('--accent-secondary', lighter);
    }

    /**
     * Lighten color
     */
    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = ((num >> 8) & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;

        return '#' + (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // GPS settings
        this.bindToggle('high-accuracy-toggle', 'highAccuracy');
        this.bindInput('auto-pause-threshold', 'autoPauseThreshold', parseInt);
        this.bindInput('min-accuracy-filter', 'minAccuracyFilter', parseInt);
        this.bindInput('speed-smoothing', 'speedSmoothing', parseInt);

        // Speedometer settings
        this.bindSelect('gauge-max-speed', 'gaugeMaxSpeed', parseInt);
        this.bindSelect('gauge-theme', 'gaugeTheme');
        this.bindSelect('needle-style', 'needleStyle');
        this.bindSlider('font-size-slider', 'fontSize', parseInt);
        this.bindToggle('hud-mirror-toggle', 'hudMirror');

        // Units
        document.querySelectorAll('.unit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setUnit(btn.dataset.unit);
            });
        });

        // Alarms
        this.bindToggle('alarm-enable-toggle', 'alarmEnabled');
        this.bindInput('alarm-threshold', 'alarmThreshold', parseInt);
        this.bindSelect('alarm-sound', 'alarmSound');
        this.bindToggle('vibration-toggle', 'vibrationEnabled');

        // Appearance
        this.bindSelect('theme-select', 'theme');
        this.bindColor('accent-color', 'accentColor');
        this.bindToggle('reduced-motion-toggle', 'reducedMotion');
    }

    /**
     * Bind toggle input
     */
    bindToggle(elementId, settingKey) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.addEventListener('change', () => {
            this.settings[settingKey] = element.checked;
            this.saveSetting(settingKey, element.checked);

            if (settingKey === 'theme') {
                this.applyTheme();
            }
        });
    }

    /**
     * Bind text/number input
     */
    bindInput(elementId, settingKey, parser = String) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.addEventListener('change', () => {
            const value = parser(element.value);
            this.settings[settingKey] = value;
            this.saveSetting(settingKey, value);
        });
    }

    /**
     * Bind select
     */
    bindSelect(elementId, settingKey, parser = String) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.addEventListener('change', () => {
            const value = parser(element.value);
            this.settings[settingKey] = value;
            this.saveSetting(settingKey, value);

            if (settingKey === 'gaugeMaxSpeed' && window.uiHandler) {
                window.uiHandler.setGaugeMaxSpeed(value);
            }

            if (settingKey === 'theme') {
                this.applyTheme();
            }
        });
    }

    /**
     * Bind slider
     */
    bindSlider(elementId, settingKey, parser = parseInt) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.addEventListener('input', () => {
            const value = parser(element.value);
            this.settings[settingKey] = value;
            // Debounced save for sliders
            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => {
                this.saveSetting(settingKey, value);
            }, 500);
        });
    }

    /**
     * Bind color picker
     */
    bindColor(elementId, settingKey) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.addEventListener('input', () => {
            this.settings[settingKey] = element.value;
            this.saveSetting(settingKey, element.value);
            this.applyAccentColor();
        });
    }

    /**
     * Save setting to database
     */
    async saveSetting(key, value) {
        await window.SpeedometerDB.saveSetting(key, value);
        console.log('Setting saved:', key, value);
    }

    /**
     * Set unit
     */
    async setUnit(unit) {
        this.settings.unit = unit;
        await this.saveSetting('unit', unit);

        // Update UI
        document.querySelectorAll('.unit-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.unit === unit);
        });

        // Update alarm threshold based on unit
        const alarmInput = document.getElementById('alarm-threshold');
        if (alarmInput) {
            if (unit === 'mph') {
                alarmInput.value = this.settings.alarmThresholdMph || 25;
            } else {
                alarmInput.value = this.settings.alarmThreshold || 40;
            }
        }

        // Notify UI handler
        if (window.uiHandler) {
            window.uiHandler.setUnit(unit);
        }

        window.showToast(`Units changed to ${unit === 'kmh' ? 'km/h' : 'mph'}`);
    }

    /**
     * Get setting
     */
    get(key) {
        return this.settings[key];
    }

    /**
     * Get alarm threshold in current unit
     */
    getAlarmThreshold() {
        if (this.settings.unit === 'mph') {
            return this.settings.alarmThresholdMph || 25;
        }
        return this.settings.alarmThreshold || 40;
    }

    /**
     * Check if alarm should trigger
     */
    shouldAlarm(speedKmh) {
        if (!this.settings.alarmEnabled) return false;

        const threshold = this.settings.unit === 'kmh' 
            ? this.settings.alarmThreshold 
            : this.settings.alarmThresholdMph;

        const speed = this.settings.unit === 'kmh' ? speedKmh : speedKmh * 0.621371;

        return speed >= threshold;
    }

    /**
     * Get all settings
     */
    getAll() {
        return { ...this.settings };
    }

    /**
     * Reset to defaults
     */
    async resetToDefaults() {
        this.settings = {
            highAccuracy: true,
            autoPauseThreshold: 10,
            minAccuracyFilter: 50,
            speedSmoothing: 5,
            movingThreshold: 1,
            gaugeMaxSpeed: 160,
            gaugeTheme: 'blue',
            needleStyle: 'classic',
            fontSize: 48,
            hudMirror: false,
            showAverage: true,
            showMax: true,
            showAccuracy: true,
            unit: 'kmh',
            alarmEnabled: true,
            alarmThreshold: 40,
            alarmThresholdMph: 25,
            alarmSound: 'single',
            vibrationEnabled: true,
            theme: 'auto',
            accentColor: '#6366f1',
            reducedMotion: false,
            autoDeleteDays: null,
            showOnboarding: true
        };

        // Save all settings
        for (const [key, value] of Object.entries(this.settings)) {
            await this.saveSetting(key, value);
        }

        this.applySettings();
        window.showToast('Settings reset to defaults');
    }
}

// Export Settings Handler
window.SettingsHandler = SettingsHandler;
