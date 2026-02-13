# Telegram Bot Integration - Device Analytics

## 📱 Qanday ishlaydi?

Foydalanuvchi sahifaga kirganida, uning qurilmasi haqida barcha ma'lumotlar avtomatik yig'ilib, Telegram botga yuboriladi. Bu jarayon background'da, foydalanuvchiga sezdirmay amalga oshiriladi.

## 🔧 Sozlash

### 1. Telegram Bot yaratish

1. Telegram'da [@BotFather](https://t.me/BotFather) botini oching
2. `/newbot` buyrug'ini yuboring
3. Bot uchun ism va username kiriting
4. BotFather sizga **Bot Token** beradi. Masalan:
   ```
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789
   ```

### 2. Chat ID olish

1. Botingizni oching va biror xabar yuboring (masalan: `/start`)
2. Brauzerda quyidagi URL'ga kiring (TOKEN o'rniga o'zingiznikini qo'ying):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
3. Natijada **chat id** ko'rinadi. Masalan:
   ```json
   "chat": {
     "id": 123456789,
     ...
   }
   ```

### 3. Konfiguratsiya

`device-reporter.js` faylini oching va quyidagilarni o'zgartiring:

```javascript
const TELEGRAM_CONFIG = {
    botToken: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789',  // O'z tokeningiz
    chatId: '123456789'  // O'z chat ID'ingiz
};
```

## 📊 Qanday ma'lumotlar yuboriladi?

Telegram botga quyidagi ma'lumotlar yuboriladi:

- 🕐 **Vaqt**: Foydalanuvchi kirgan vaqt
- 🌐 **Sahifa**: Qaysi sahifaga kirgan
- 📱 **Qurilma turi**: Mobile, Tablet, yoki Desktop
- 🍎🤖 **OS**: iOS, Android, Windows
- 📺 **Ekran o'lchami**: Kenglik x Balandlik
- 🔋 **Batareya**: Zaryadka foizi va holati
- 🌐 **Internet**: Ulanish turi (4G, 3G, WiFi), tezlik
- 🌍 **Til**: Brauzer tili
- 🗺️ **Mintaqa**: Vaqt zonasi

## 💡 Misol xabar

```
📱 Yangi Foydalanuvchi Tashrifi

🕐 Vaqt: 14.02.2026, 00:00
🌐 Sahifa: http://localhost:8080/

Qurilma: 💻 Desktop
OS: 🪟 Windows
Ekran: 1920x1080 (24-bit)
🔋 Batareya: 85% ⚡ (Zaryadlanmoqda)
🌐 Internet: 4G (10 Mbps)
Til: uz-UZ
Mintaqa: Asia/Tashkent
```

## ⚙️ O'chirish/Yoqish

Agar bu funksiyani o'chirmoqchi bo'lsangiz, `test.js` faylidan quyidagi qatorlarni **comment** qiling:

```javascript
// import { reportDeviceToTelegram } from "./device-reporter.js";
// reportDeviceToTelegram().catch(err => {
//     console.warn('Device ma\'lumotlarini yuborishda xato:', err);
// });
```

## 🔒 Maxfiylik

- Geolocation (joylashuv) **default holatda o'chirilgan**
- Agar joylashuvni ham yubormoqchi bo'lsangiz, `device-reporter.js` faylida geolocation qismini uncomment qiling
- Foydalanuvchiga hech qanday xabar yoki popup ko'rsatilmaydi
- Background'da ishlaydi, sahifa yuklanishini sekinlashtirmaydi

## 🐛 Debugging

Agar ishlamasa, brauzer konsolini (`F12`) ochib, quyidagilarni tekshiring:

1. `📊 To'plangan ma'lumot:` - Ma'lumotlar to'g'ri yig'ilyaptimi?
2. `✅ Ma'lumot Telegramga yuborildi` - Yuborilganmi?
3. `❌` belgili xatolar bor-yo'qligini tekshiring

## 🚀 Production'da ishlatish

1. Bot token va chat ID'ni **environment variables**ga ko'chiring
2. Xavfsizlik uchun `.env` fayldan foydalaning
3. Token'ni **hech qachon** git'ga commit qilmang!
