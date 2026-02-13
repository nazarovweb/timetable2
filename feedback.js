// ========== FEEDBACK & SUGGESTION SYSTEM ==========
// Foydalanuvchilardan taklif va fikrlarni qabul qilish

import { TELEGRAM_CONFIG } from './device-reporter.js';

// ========== SHOW FEEDBACK MODAL ==========
export function showFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('active'), 10);

        // Textarea'ni tozalash
        const textarea = document.getElementById('feedbackText');
        if (textarea) textarea.value = '';

        // Character counter
        updateCharacterCount();
    }
}

function hideFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

// ========== CHARACTER COUNTER ==========
function updateCharacterCount() {
    const textarea = document.getElementById('feedbackText');
    const counter = document.getElementById('feedbackCharCount');

    if (textarea && counter) {
        const count = textarea.value.length;
        const max = 1000;
        counter.textContent = `${count}/${max}`;

        if (count > max * 0.9) {
            counter.style.color = '#ff4444';
        } else {
            counter.style.color = '#888';
        }
    }
}

// ========== FORMAT FEEDBACK MESSAGE ==========
function formatFeedbackMessage(feedbackText, userProfile) {
    let message = '💬 <b>Yangi Taklif/Fikr</b>\n\n';

    // Foydalanuvchi ma'lumotlari
    if (userProfile) {
        message += '👤 <b>Foydalanuvchi:</b> ';

        if (userProfile.role === 'student') {
            message += `Student (${userProfile.course}-kurs`;
            if (userProfile.group) message += `, ${userProfile.group}`;
            message += ')\n';
        } else if (userProfile.role === 'teacher') {
            message += `O'qituvchi (${userProfile.teacher})\n`;
        } else {
            message += 'Noma\'lum\n';
        }
    }

    // Vaqt
    const now = new Date();
    message += `🕐 <b>Vaqt:</b> ${now.toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}\n\n`;

    // Xabar matni
    message += '📝 <b>Xabar:</b>\n';
    message += feedbackText.trim();

    // Qurilma ma'lumotlari (optional, qisqa)
    message += '\n\n---\n';
    if (window.device) {
        const deviceType = window.device.mobile ? '📱 Mobile' :
            window.device.tablet ? '📱 Tablet' : '💻 Desktop';
        message += `🌐 <b>Qurilma:</b> ${deviceType}`;

        if (window.device.ios) message += ', iOS';
        else if (window.device.android) message += ', Android';
        else if (window.device.windows) message += ', Windows';
    }

    return message;
}

// ========== SEND FEEDBACK TO TELEGRAM ==========
async function sendFeedbackToTelegram(message) {
    // Konfiguratsiya tekshiruvi
    if (!TELEGRAM_CONFIG.botToken || !TELEGRAM_CONFIG.chatId ||
        TELEGRAM_CONFIG.botToken === 'YOUR_BOT_TOKEN_HERE' ||
        TELEGRAM_CONFIG.chatId === 'YOUR_CHAT_ID_HERE') {
        console.error('❌ Telegram konfiguratsiyasi topilmadi!');
        return {
            success: false,
            error: 'Telegram bot sozlanmagan'
        };
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
            console.log('✅ Feedback Telegramga yuborildi');
            return { success: true };
        } else {
            const error = await response.json();
            console.error('❌ Telegram xatosi:', error);
            return {
                success: false,
                error: error.description || 'Nomaʼlum xato'
            };
        }
    } catch (error) {
        console.error('❌ Yuborishda xato:', error);
        return {
            success: false,
            error: error.message || 'Tarmoq xatosi'
        };
    }
}

// ========== HANDLE FEEDBACK SUBMISSION ==========
async function handleFeedbackSubmit() {
    const textarea = document.getElementById('feedbackText');
    const submitBtn = document.getElementById('feedbackSubmitBtn');
    const status = document.getElementById('feedbackStatus');

    const feedbackText = textarea.value.trim();

    // Validatsiya
    if (!feedbackText) {
        showFeedbackStatus('Iltimos, fikringizni yozing!', 'error');
        return;
    }

    if (feedbackText.length < 10) {
        showFeedbackStatus('Iltimos, kamida 10 ta belgi yozing!', 'error');
        return;
    }

    if (feedbackText.length > 1000) {
        showFeedbackStatus('Xabar 1000 ta belgidan oshmasin!', 'error');
        return;
    }

    // Loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Yuborilmoqda...';
    showFeedbackStatus('📤 Yuborilmoqda...', 'info');

    // Foydalanuvchi profilini olish
    let userProfile = null;
    try {
        const profileData = localStorage.getItem('timetable:profile');
        if (profileData) {
            userProfile = JSON.parse(profileData);
        }
    } catch (e) {
        console.warn('Profilni o\'qishda xato:', e);
    }

    // Xabarni formatlash
    const message = formatFeedbackMessage(feedbackText, userProfile);

    // Yuborish
    const result = await sendFeedbackToTelegram(message);

    if (result.success) {
        showFeedbackStatus('✅ Rahmat! Fikringiz yuborildi!', 'success');
        textarea.value = '';
        updateCharacterCount();

        // Modalni yopish
        setTimeout(() => {
            hideFeedbackModal();
        }, 2000);
    } else {
        showFeedbackStatus(`❌ Xatolik: ${result.error}`, 'error');
    }

    // Reset button
    submitBtn.disabled = false;
    submitBtn.textContent = 'Yuborish';
}

// ========== SHOW FEEDBACK STATUS ==========
function showFeedbackStatus(text, type) {
    const status = document.getElementById('feedbackStatus');
    if (status) {
        status.textContent = text;
        status.className = 'feedback-status ' + type;
        status.style.display = 'block';
    }
}

// ========== INITIALIZE FEEDBACK SYSTEM ==========
export function initFeedback() {
    // Feedback button
    const feedbackBtn = document.getElementById('feedbackBtn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', showFeedbackModal);
    }

    // Close button
    const closeBtn = document.getElementById('feedbackCloseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideFeedbackModal);
    }

    // Submit button
    const submitBtn = document.getElementById('feedbackSubmitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleFeedbackSubmit);
    }

    // Textarea character counter
    const textarea = document.getElementById('feedbackText');
    if (textarea) {
        textarea.addEventListener('input', updateCharacterCount);
    }

    // Global access
    window.showFeedbackModal = showFeedbackModal;
}
