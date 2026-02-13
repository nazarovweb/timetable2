// ========== TELEGRAM BOT CONFIGURATION ==========
// Bu ma'lumotlarni o'zingizniki bilan almashtiring
export const TELEGRAM_CONFIG = {
    botToken: '7166058447:AAHlqljNsg0DVT9f_nAHjHibpqwh9wS8VCE',  // @BotFather dan olingan token
    chatId: '1524783641'       // Bot bilan chat qilgan chatId
};

// ========== DEVICE MA'LUMOTLARINI YIG'ISH ==========
async function collectDeviceInfo() {
    const info = {
        timestamp: new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }),
        page: window.location.href
    };

    // ===== BROWSER MA'LUMOTLARI =====
    info.browser = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        platform: navigator.platform,
        vendor: navigator.vendor
    };

    // ===== SCREEN MA'LUMOTLARI =====
    info.screen = {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        orientation: screen.orientation?.type || 'unknown',
        devicePixelRatio: window.devicePixelRatio
    };

    // ===== WINDOW MA'LUMOTLARI =====
    info.window = {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight
    };

    // ===== DEVICE TYPE (device.js dan) =====
    if (window.device) {
        info.deviceType = {
            mobile: window.device.mobile,
            tablet: window.device.tablet,
            desktop: window.device.desktop,
            ios: window.device.ios,
            android: window.device.android,
            windows: window.device.windows,
            blackberry: window.device.blackberry,
            iphone: window.device.iphone,
            ipad: window.device.ipad,
            androidPhone: window.device.androidPhone,
            androidTablet: window.device.androidTablet
        };
    }

    // ===== BATTERY STATUS =====
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            info.battery = {
                level: Math.round(battery.level * 100) + '%',
                charging: battery.charging,
                chargingTime: battery.chargingTime === Infinity ? null : battery.chargingTime,
                dischargingTime: battery.dischargingTime === Infinity ? null : battery.dischargingTime
            };
        } catch (error) {
            info.battery = { error: 'Not available' };
        }
    }

    // ===== NETWORK STATUS =====
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
        info.network = {
            effectiveType: connection.effectiveType, // 4g, 3g, 2g, slow-2g
            downlink: connection.downlink, // Mbps
            rtt: connection.rtt, // ms
            saveData: connection.saveData,
            type: connection.type
        };
    } else {
        info.network = {
            online: navigator.onLine
        };
    }

    // ===== GEOLOCATION (agar ruxsat berilgan bo'lsa) =====
    // Bu optional, chunki permission kerak
    // Agar kerak bo'lsa uncomment qiling
    /*
    if ('geolocation' in navigator) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            info.location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
        } catch (error) {
            info.location = { error: 'Permission denied or unavailable' };
        }
    }
    */

    // ===== CLIENT HINTS (yangi API) =====
    if (navigator.userAgentData) {
        info.userAgentData = {
            mobile: navigator.userAgentData.mobile,
            platform: navigator.userAgentData.platform,
            brands: navigator.userAgentData.brands
        };
    }

    // ===== TIMEZONE =====
    info.timezone = {
        offset: new Date().getTimezoneOffset(),
        name: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    return info;
}

// ========== MA'LUMOTLARNI FORMATLASH ==========
function formatDeviceInfoForTelegram(info) {
    let message = '📱 <b>Yangi Foydalanuvchi Tashrifi</b>\n\n';

    message += `🕐 <b>Vaqt:</b> ${info.timestamp}\n`;
    message += `🌐 <b>Sahifa:</b> ${info.page}\n\n`;

    // Device Type
    if (info.deviceType) {
        const deviceTypes = [];
        if (info.deviceType.mobile) deviceTypes.push('📱 Mobile');
        if (info.deviceType.tablet) deviceTypes.push('📱 Tablet');
        if (info.deviceType.desktop) deviceTypes.push('💻 Desktop');

        const os = [];
        if (info.deviceType.ios) os.push('🍎 iOS');
        if (info.deviceType.android) os.push('🤖 Android');
        if (info.deviceType.windows) os.push('🪟 Windows');

        if (deviceTypes.length) message += `<b>Qurilma:</b> ${deviceTypes.join(', ')}\n`;
        if (os.length) message += `<b>OS:</b> ${os.join(', ')}\n`;
    }

    // Screen
    if (info.screen) {
        message += `<b>Ekran:</b> ${info.screen.width}x${info.screen.height} (${info.screen.colorDepth}-bit)\n`;
    }

    // Battery
    if (info.battery && !info.battery.error) {
        message += `🔋 <b>Batareya:</b> ${info.battery.level}`;
        if (info.battery.charging) message += ' ⚡ (Zaryadlanmoqda)';
        message += '\n';
    }

    // Network
    if (info.network) {
        message += `🌐 <b>Internet:</b> `;
        if (info.network.effectiveType) {
            message += `${info.network.effectiveType.toUpperCase()}`;
            if (info.network.downlink) message += ` (${info.network.downlink} Mbps)`;
        } else if (info.network.online !== undefined) {
            message += info.network.online ? 'Online' : 'Offline';
        }
        message += '\n';
    }

    // Browser
    if (info.browser) {
        message += `<b>Til:</b> ${info.browser.language}\n`;
    }

    // Timezone
    if (info.timezone) {
        message += `<b>Mintaqa:</b> ${info.timezone.name}\n`;
    }

    return message;
}

// ========== TELEGRAM BOTGA YUBORISH ==========
async function sendToTelegram(message) {
    // Agar token yoki chatId bo'sh bo'lsa, yubormaymiz
    if (!TELEGRAM_CONFIG.botToken || !TELEGRAM_CONFIG.chatId ||
        TELEGRAM_CONFIG.botToken === 'YOUR_BOT_TOKEN_HERE' ||
        TELEGRAM_CONFIG.chatId === 'YOUR_CHAT_ID_HERE') {
        console.log('📤 Telegram konfiguratsiyasi topilmadi. Ma\'lumot yuborilmadi.');
        console.log('Ma\'lumot:', message);
        return false;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CONFIG.chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (response.ok) {
            console.log('✅ Ma\'lumot Telegramga yuborildi');
            return true;
        } else {
            const error = await response.json();
            console.error('❌ Telegram xatosi:', error);
            return false;
        }
    } catch (error) {
        console.error('❌ Yuborishda xato:', error);
        return false;
    }
}

// ========== ASOSIY FUNKSIYA ==========
async function reportDeviceToTelegram() {
    try {
        // 1. Ma'lumotlarni yig'amiz
        const deviceInfo = await collectDeviceInfo();

        // 2. Console'ga chiqaramiz (development uchun)
        console.log('📊 To\'plangan ma\'lumot:', deviceInfo);

        // 3. Telegram uchun formatlaymiz
        const message = formatDeviceInfoForTelegram(deviceInfo);

        // 4. Telegramga yuboramiz (background'da)
        await sendToTelegram(message);

    } catch (error) {
        console.error('❌ Xatolik:', error);
    }
}

// ========== EXPORT ==========
export { reportDeviceToTelegram, collectDeviceInfo };
