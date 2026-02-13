// ========== ONBOARDING & TUTORIAL SYSTEM ==========
// Birinchi marta kelgan foydalanuvchilar uchun qadamma-qadam yo'riqnoma

const ONBOARDING_KEY = 'timetable:onboarded';
const PROFILE_KEY = 'timetable:profile';

// ========== FIRST-TIME USER DETECTION ==========
export function isFirstTimeUser() {
    return !localStorage.getItem(ONBOARDING_KEY);
}

export function markOnboardingComplete() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
}

// ========== PROFILE MANAGEMENT ==========
export function getUserProfile() {
    try {
        const profile = localStorage.getItem(PROFILE_KEY);
        return profile ? JSON.parse(profile) : null;
    } catch {
        return null;
    }
}

export function saveUserProfile(profile) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function resetOnboarding() {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(PROFILE_KEY);
}

// ========== MODAL HELPERS ==========
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        // Smooth fade-in
        setTimeout(() => modal.classList.add('active'), 10);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

// ========== STEP 1: WELCOME MODAL ==========
export function showWelcomeModal() {
    showModal('welcomeModal');

    const continueBtn = document.getElementById('welcomeContinueBtn');
    continueBtn.onclick = () => {
        hideModal('welcomeModal');
        setTimeout(() => showRoleSelectionModal(), 350);
    };
}

// ========== STEP 2: ROLE SELECTION ==========
export function showRoleSelectionModal() {
    showModal('roleModal');

    const studentBtn = document.getElementById('selectStudentBtn');
    const teacherBtn = document.getElementById('selectTeacherBtn');

    studentBtn.onclick = () => {
        hideModal('roleModal');
        setTimeout(() => showProfileSetupModal('student'), 350);
    };

    teacherBtn.onclick = () => {
        hideModal('roleModal');
        setTimeout(() => showProfileSetupModal('teacher'), 350);
    };
}

// ========== STEP 3: PROFILE SETUP ==========
export async function showProfileSetupModal(role) {
    showModal('profileModal');

    const studentFields = document.getElementById('studentFields');
    const teacherFields = document.getElementById('teacherFields');
    const profileTitle = document.getElementById('profileModalTitle');

    // Role'ga qarab fieldlarni ko'rsatish
    if (role === 'student') {
        profileTitle.textContent = 'Student ma\'lumotlaringiz';
        studentFields.classList.remove('hidden');
        teacherFields.classList.add('hidden');

        // Kurs va guruhlarni yuklash
        await populateStudentFields();
    } else {
        profileTitle.textContent = 'O\'qituvchi ma\'lumotlaringiz';
        teacherFields.classList.remove('hidden');
        studentFields.classList.add('hidden');

        // O'qituvchilar ro'yxatini yuklash
        await populateTeacherFields();
    }

    // Save button
    const saveBtn = document.getElementById('saveProfileBtn');
    saveBtn.onclick = () => {
        const profile = collectProfileData(role);
        if (validateProfile(profile)) {
            saveUserProfile(profile);
            markOnboardingComplete();
            hideModal('profileModal');

            // Dasturga defaultlarni qo'llash
            applyProfileDefaults(profile);

            // Optional: feedback modalini ko'rsatish
            setTimeout(() => {
                showOptionalFeedbackSuggestion();
            }, 1000);
        }
    };
}

// ========== POPULATE FIELDS ==========
async function populateStudentFields() {
    const courseSelect = document.getElementById('profileCourseSelect');
    const groupSelect = document.getElementById('profileGroupSelect');

    // Kurs o'zgarganda guruhlarni yangilash
    courseSelect.addEventListener('change', async () => {
        const course = Number(courseSelect.value);
        await updateGroupOptions(course, groupSelect);
    });

    // Default kurs uchun guruhlarni yuklash
    await updateGroupOptions(2, groupSelect);
}

async function updateGroupOptions(course, groupSelect) {
    try {
        // loadCourse funksiyasi global window.loadCourse sifatida mavjud
        if (typeof window.loadCourse === 'function') {
            const { lessons } = await window.loadCourse(course);

            // Unique guruhlarni olish
            const groups = new Set();
            lessons.forEach(lesson => {
                if (Array.isArray(lesson.groups)) {
                    lesson.groups.forEach(g => groups.add(g));
                }
            });

            const sortedGroups = Array.from(groups).sort();
            groupSelect.innerHTML = sortedGroups.map(g =>
                `<option value="${g}">${g}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Guruhlarni yuklashda xato:', error);
    }
}

async function populateTeacherFields() {
    const teacherSelect = document.getElementById('profileTeacherSelect');

    try {
        // Barcha kurslardan o'qituvchilarni yig'ish
        const teachers = new Set();

        for (let course = 1; course <= 4; course++) {
            if (typeof window.loadCourse === 'function') {
                const { lessons } = await window.loadCourse(course);
                lessons.forEach(lesson => {
                    if (lesson.teacher && lesson.teacher.trim()) {
                        teachers.add(lesson.teacher.trim());
                    }
                });
            }
        }

        const sortedTeachers = Array.from(teachers).sort();
        teacherSelect.innerHTML = sortedTeachers.map(t =>
            `<option value="${t}">${t}</option>`
        ).join('');
    } catch (error) {
        console.error('O\'qituvchilarni yuklashda xato:', error);
    }
}

// ========== COLLECT & VALIDATE ==========
function collectProfileData(role) {
    if (role === 'student') {
        return {
            role: 'student',
            course: Number(document.getElementById('profileCourseSelect').value),
            group: document.getElementById('profileGroupSelect').value
        };
    } else {
        return {
            role: 'teacher',
            teacher: document.getElementById('profileTeacherSelect').value,
            day: document.getElementById('profileDaySelect').value
        };
    }
}

function validateProfile(profile) {
    if (profile.role === 'student') {
        if (!profile.course || !profile.group) {
            alert('Iltimos, kurs va guruhni tanlang!');
            return false;
        }
    } else {
        if (!profile.teacher) {
            alert('Iltimos, o\'qituvchini tanlang!');
            return false;
        }
    }
    return true;
}

// ========== APPLY DEFAULTS ==========
export function applyProfileDefaults(profile) {
    if (!profile) {
        profile = getUserProfile();
    }

    if (!profile) return;

    // Kurs selectni o'rnatish
    const courseSelect = document.getElementById('courseSelect');
    if (courseSelect && profile.course) {
        courseSelect.value = String(profile.course);
    }

    // Kun selectni o'rnatish
    const daySelect = document.getElementById('daySelect');
    if (daySelect && profile.day) {
        daySelect.value = profile.day;
    }

    // Trigger reload to apply new settings
    if (typeof window.reloadData === 'function') {
        window.reloadData();
    }

    console.log('✅ Profil defaultlari qo\'llandi:', profile);
}

// ========== OPTIONAL FEEDBACK SUGGESTION ==========
function showOptionalFeedbackSuggestion() {
    showModal('feedbackSuggestionModal');

    const yesBtn = document.getElementById('feedbackSuggestionYes');
    const noBtn = document.getElementById('feedbackSuggestionNo');

    yesBtn.onclick = () => {
        hideModal('feedbackSuggestionModal');
        setTimeout(() => {
            if (typeof window.showFeedbackModal === 'function') {
                window.showFeedbackModal();
            }
        }, 350);
    };

    noBtn.onclick = () => {
        hideModal('feedbackSuggestionModal');
    };
}

// ========== INITIALIZATION ==========
export function initOnboarding() {
    if (isFirstTimeUser()) {
        // Birinchi marta - tutorial ko'rsatish
        setTimeout(() => {
            showWelcomeModal();
        }, 500);
    } else {
        // Eski foydalanuvchi - profilni qo'llash
        const profile = getUserProfile();
        if (profile) {
            // Biroz kutib defaultlarni qo'llash (app yuklanishidan keyin)
            setTimeout(() => {
                applyProfileDefaults(profile);
            }, 1000);
        }
    }
}
