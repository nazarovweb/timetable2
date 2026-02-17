// security.js - Application Security Layer
// Prevents unauthorized inspection and debugging

(function () {
    'use strict';

    // Disable right-click context menu
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
    });

    // Disable keyboard shortcuts for developer tools
    document.addEventListener('keydown', function (e) {
        // F12 - DevTools
        if (e.keyCode === 123) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I - Inspect Element
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+J - Console
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+C - Inspect Element (alternative)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
            e.preventDefault();
            return false;
        }

        // Ctrl+U - View Source
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }

        // Ctrl+S - Save Page
        if (e.ctrlKey && e.keyCode === 83) {
            e.preventDefault();
            return false;
        }

        // Ctrl+P - Print
        if (e.ctrlKey && e.keyCode === 80) {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+K - Firefox Console
        if (e.ctrlKey && e.shiftKey && e.keyCode === 75) {
            e.preventDefault();
            return false;
        }
    });

    // Detect DevTools opening (advanced detection)
    let devtoolsOpen = false;
    const threshold = 160;

    const detectDevTools = () => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;

        if (widthThreshold || heightThreshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                // Optionally redirect or notify
                // window.location.href = 'about:blank';
            }
        } else {
            devtoolsOpen = false;
        }
    };

    // Check periodically
    setInterval(detectDevTools, 1000);

    // Disable selection on sensitive elements (optional)
    document.addEventListener('selectstart', function (e) {
        // Allow selection in input/textarea fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return true;
        }
    });

    // Debug mode detection
    const debugCheck = function () {
        const start = new Date();
        debugger;
        const end = new Date();
        if (end - start > 100) {
            // Debugger detected
            // window.location.href = 'about:blank';
        }
    };

    // Anti-debugging check (runs once)
    // Commented out as it can be intrusive
    // setInterval(debugCheck, 2000);

    // Override console methods in production
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const noop = function () { };
        ['log', 'debug', 'info', 'warn', 'error'].forEach(method => {
            console[method] = noop;
        });
    }

    // Prevent iframe embedding
    if (window.top !== window.self) {
        window.top.location = window.self.location;
    }

})();
