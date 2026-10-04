/**
 * Speedometer PWA - IndexedDB Wrapper
 * Handles all local data persistence
 */

const DB_NAME = 'SpeedometerDB';
const DB_VERSION = 1;

// Store names
const STORES = {
    TRIPS: 'trips',
    SETTINGS: 'settings',
    SPEED_LOG: 'speedLog',
    ODOMETER: 'odometer'
};

let db = null;

/**
 * Initialize the database
 */
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open database:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('Database opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Create trips store
            if (!database.objectStoreNames.contains(STORES.TRIPS)) {
                const tripsStore = database.createObjectStore(STORES.TRIPS, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                tripsStore.createIndex('startTime', 'startTime', { unique: false });
                tripsStore.createIndex('endTime', 'endTime', { unique: false });
            }

            // Create settings store
            if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
                database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
            }

            // Create speed log store
            if (!database.objectStoreNames.contains(STORES.SPEED_LOG)) {
                const speedLogStore = database.createObjectStore(STORES.SPEED_LOG, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                speedLogStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // Create odometer store
            if (!database.objectStoreNames.contains(STORES.ODOMETER)) {
                database.createObjectStore(STORES.ODOMETER, { keyPath: 'key' });
            }

            console.log('Database schema upgraded');
        };
    });
}

/**
 * Generic database operation helper
 */
function dbOperation(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);

        callback(store);
    });
}

/**
 * Generic database operation with result
 */
function dbOperationWithResult(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);

        let result = null;

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);

        const request = callback(store);
        if (request) {
            request.onsuccess = () => {
                result = request.result;
            };
        }
    });
}

// =============================================
// Settings Operations
// =============================================

async function saveSetting(key, value) {
    return dbOperationWithResult(STORES.SETTINGS, 'readwrite', (store) => {
        return store.put({ key, value });
    });
}

async function getSetting(key, defaultValue = null) {
    const result = await dbOperationWithResult(STORES.SETTINGS, 'readonly', (store) => {
        return store.get(key);
    });
    return result ? result.value : defaultValue;
}

async function getAllSettings() {
    return dbOperationWithResult(STORES.SETTINGS, 'readonly', (store) => {
        return store.getAll();
    });
}

async function deleteSetting(key) {
    return dbOperation(STORES.SETTINGS, 'readwrite', (store) => {
        store.delete(key);
    });
}

// =============================================
// Trip Operations
// =============================================

async function saveTrip(trip) {
    return dbOperationWithResult(STORES.TRIPS, 'readwrite', (store) => {
        return store.add(trip);
    });
}

async function updateTrip(trip) {
    return dbOperation(STORES.TRIPS, 'readwrite', (store) => {
        store.put(trip);
    });
}

async function getTrip(id) {
    return dbOperationWithResult(STORES.TRIPS, 'readonly', (store) => {
        return store.get(id);
    });
}

async function getAllTrips() {
    return dbOperationWithResult(STORES.TRIPS, 'readonly', (store) => {
        return store.getAll();
    });
}

async function deleteTrip(id) {
    return dbOperation(STORES.TRIPS, 'readwrite', (store) => {
        store.delete(id);
    });
}

async function getTripsByDateRange(startDate, endDate) {
    return dbOperationWithResult(STORES.TRIPS, 'readonly', (store) => {
        const index = store.index('startTime');
        return index.getAll(IDBKeyRange.bound(startDate, endDate));
    });
}

// =============================================
// Odometer Operations
// =============================================

async function saveOdometer(distance) {
    return dbOperationWithResult(STORES.ODOMETER, 'readwrite', (store) => {
        return store.put({ key: 'total', value: distance });
    });
}

async function getOdometer() {
    const result = await dbOperationWithResult(STORES.ODOMETER, 'readonly', (store) => {
        return store.get('total');
    });
    return result ? result.value : 0;
}

async function resetOdometer() {
    return saveOdometer(0);
}

// =============================================
// Speed Log Operations
// =============================================

async function saveSpeedLog(entry) {
    return dbOperationWithResult(STORES.SPEED_LOG, 'readwrite', (store) => {
        return store.add(entry);
    });
}

async function getSpeedLogs(limit = 1000) {
    return dbOperationWithResult(STORES.SPEED_LOG, 'readonly', (store) => {
        const index = store.index('timestamp');
        const request = index.getAll(null, limit);
        return request;
    });
}

async function clearSpeedLogs() {
    return dbOperation(STORES.SPEED_LOG, 'readwrite', (store) => {
        store.clear();
    });
}

async function deleteOldSpeedLogs(daysToKeep = 7) {
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    return dbOperation(STORES.SPEED_LOG, 'readwrite', (store) => {
        const index = store.index('timestamp');
        index.getAll(null).onsuccess = (e) => {
            const logs = e.target.result;
            logs.forEach(log => {
                if (log.timestamp < cutoffDate) {
                    store.delete(log.id);
                }
            });
        };
    });
}

// =============================================
// Data Export/Import
// =============================================

async function exportAllData() {
    const trips = await getAllTrips();
    const settings = await getAllSettings();
    const odometer = await getOdometer();
    const speedLogs = await getSpeedLogs(10000);

    return {
        version: DB_VERSION,
        exportDate: new Date().toISOString(),
        trips,
        settings,
        odometer,
        speedLogs
    };
}

async function importAllData(data) {
    const transaction = db.transaction(
        [STORES.TRIPS, STORES.SETTINGS, STORES.ODOMETER, STORES.SPEED_LOG],
        'readwrite'
    );

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);

        const tripsStore = transaction.objectStore(STORES.TRIPS);
        const settingsStore = transaction.objectStore(STORES.SETTINGS);
        const odometerStore = transaction.objectStore(STORES.ODOMETER);
        const speedLogStore = transaction.objectStore(STORES.SPEED_LOG);

        // Import trips
        if (data.trips) {
            data.trips.forEach(trip => {
                delete trip.id; // Let auto-increment handle it
                tripsStore.add(trip);
            });
        }

        // Import settings
        if (data.settings) {
            data.settings.forEach(setting => {
                settingsStore.put(setting);
            });
        }

        // Import odometer
        if (data.odometer !== undefined) {
            odometerStore.put({ key: 'total', value: data.odometer });
        }

        // Import speed logs
        if (data.speedLogs) {
            data.speedLogs.forEach(log => {
                delete log.id;
                speedLogStore.add(log);
            });
        }
    });
}

// =============================================
// Clear All Data
// =============================================

async function clearAllData() {
    const transaction = db.transaction(
        [STORES.TRIPS, STORES.SETTINGS, STORES.ODOMETER, STORES.SPEED_LOG],
        'readwrite'
    );

    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);

        transaction.objectStore(STORES.TRIPS).clear();
        transaction.objectStore(STORES.SETTINGS).clear();
        transaction.objectStore(STORES.ODOMETER).clear();
        transaction.objectStore(STORES.SPEED_LOG).clear();
    });
}

// =============================================
// Get Database Size
// =============================================

async function getDatabaseSize() {
    if (!db) return 0;

    return new Promise((resolve) => {
        const estimate = navigator.storage ? 
            navigator.storage.estimate().then(estimate => {
                resolve(estimate.usage || 0);
            }) : Promise.resolve(0);

        estimate.catch(() => resolve(0));
    });
}

// Export for use in other modules
window.SpeedometerDB = {
    initDB,
    saveSetting,
    getSetting,
    getAllSettings,
    deleteSetting,
    saveTrip,
    updateTrip,
    getTrip,
    getAllTrips,
    deleteTrip,
    getTripsByDateRange,
    saveOdometer,
    getOdometer,
    resetOdometer,
    saveSpeedLog,
    getSpeedLogs,
    clearSpeedLogs,
    deleteOldSpeedLogs,
    exportAllData,
    importAllData,
    clearAllData,
    getDatabaseSize,
    STORES
};
