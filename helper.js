export async function getClientInfo() {
  const basic = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform,
    screen: { w: screen.width, h: screen.height },
    viewport: { w: innerWidth, h: innerHeight },
    pixelRatio: devicePixelRatio,
    touch: ("ontouchstart" in window) || navigator.maxTouchPoints > 0,
    standalone:
      matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone === true,
  };

  if (navigator.userAgentData?.getHighEntropyValues) {
    basic.uaData = await navigator.userAgentData.getHighEntropyValues([
      "model",
      "platform",
      "platformVersion",
      "architecture",
      "uaFullVersion",
      "brand",
      "mobile",
    ]);
  }

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    basic.network = {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData,
    };
  }

  return basic;
}

if (window.device) {
    console.log('📱 Device Type:', {
        mobile: window.device.mobile,
        tablet: window.device.tablet,
        desktop: window.device.desktop,
        ios: window.device.ios,
        android: window.device.android
    });
}

export async function getBatteryInfo() {
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();

            const batteryInfo = {
                level: Math.round(battery.level * 100) + '%',  // Zaryadka foizi
                charging: battery.charging ? 'Ha, zaryadlanmoqda' : 'Yo\'q',
                chargingTime: battery.chargingTime === Infinity ? 'Noma\'lum' : battery.chargingTime + ' soniya',
                dischargingTime: battery.dischargingTime === Infinity ? 'Noma\'lum' : battery.dischargingTime + ' soniya'
            };

            console.log('🔋 Batareya:', batteryInfo);

            // Batareya o'zgarganda yangilanadi
            battery.addEventListener('levelchange', () => {
                console.log('🔋 Batareya yangilandi:', Math.round(battery.level * 100) + '%');
            });

            battery.addEventListener('chargingchange', () => {
                console.log('🔌 Zaryadka holati:', battery.charging ? 'Zaryadlanmoqda' : 'Zaryadlanmayapti');
            });

            return batteryInfo;
        } catch (error) {
            console.warn('⚠️ Battery API ishlamadi:', error);
            return null;
        }
    } else {
        console.warn('⚠️ Battery API qo\'llab-quvvatlanmaydi');
        return null;
    }
}

export function getNetworkInfo() {
    // Network Information API (Chrome, Edge qo'llab-quvvatlaydi)
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (connection) {
        const networkInfo = {
            type: connection.effectiveType || connection.type || 'Noma\'lum',  // 4g, 3g, 2g, slow-2g, wifi
            downlink: connection.downlink ? connection.downlink + ' Mbps' : 'Noma\'lum',  // Tezlik
            rtt: connection.rtt ? connection.rtt + ' ms' : 'Noma\'lum',  // Round trip time
            saveData: connection.saveData ? 'Faol' : 'Faol emas'  // Data tejash rejimi
        };

        console.log('🌐 Internet ulanish:', networkInfo);

        // Tarmoq o'zgarganda yangilanadi
        connection.addEventListener('change', () => {
            console.log('🌐 Tarmoq o\'zgardi:', connection.effectiveType);
        });

        return networkInfo;
    } else {
        // Agar Network Information API mavjud bo'lmasa, asosiy online/offline holatini tekshiramiz
        const basicInfo = {
            online: navigator.onLine ? 'Onlayn' : 'Oflayn',
            type: 'API qo\'llab-quvvatlanmaydi'
        };

        console.log('🌐 Internet holati (basic):', basicInfo);

        // Online/offline eventlarini tinglash
        window.addEventListener('online', () => {
            console.log('🌐 Internet qayta ulandi');
        });

        window.addEventListener('offline', () => {
            console.log('🌐 Internet uzildi');
        });

        return basicInfo;
    }
}