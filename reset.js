// reset.js - Hard Reset Functionality
// Clears all localStorage, cache, and resets application

async function hardReset() {
    try {
        // Show confirmation
        const confirmed = confirm(
            '⚠️ DIQQAT!\n\n' +
            'Bu barcha sozlamalar va cache\'larni o\'chiradi:\n' +
            '• Saqlangan kurs va guruh\n' +
            '• Tanlangan kun\n' +
            '• Barcha cache\'langan ma\'lumotlar\n' +
            '• Service Worker cache\n\n' +
            'Davom etasizmi?'
        );

        if (!confirmed) return;

        // 1. Clear localStorage
        localStorage.clear();

        // 2. Clear sessionStorage
        sessionStorage.clear();

        // 3. Clear all caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }

        // 4. Unregister service workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
                registrations.map(registration => registration.unregister())
            );
        }

        // 5. Clear IndexedDB (if used)
        if ('indexedDB' in window) {
            const databases = await indexedDB.databases();
            databases.forEach(db => {
                indexedDB.deleteDatabase(db.name);
            });
        }

        // Show success message
        alert('✅ Reset muvaffaqiyatli!\n\nSahifa qayta yuklanadi...');

        // 6. Reload page
        window.location.reload(true); // Hard reload

    } catch (error) {
        alert('❌ Reset xatosi: ' + error.message);
    }
}

// Make it globally accessible
window.hardReset = hardReset;

// Add keyboard shortcut: Ctrl+Shift+R
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.keyCode === 82) { // Ctrl+Shift+R
        e.preventDefault();
        hardReset();
    }
});
