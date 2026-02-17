// app.js
const DAYS_UZ = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const ALL_COURSES_CACHE_KEY = "timetable:allCoursesCache"; // optional
let allCoursesLessonsCache = null; // runtime cache

async function loadAllCoursesLessons() {
  // agar allaqachon yuklangan bo'lsa qaytaramiz
  if (allCoursesLessonsCache) return allCoursesLessonsCache;

  // localStorage’dan 5 minutlik cache qilish (ixtiyoriy)
  const cached = localStorage.getItem(ALL_COURSES_CACHE_KEY);
  if (cached) {
    try {
      const obj = JSON.parse(cached);
      if (Date.now() - obj.ts < 5 * 60 * 1000) {
        allCoursesLessonsCache = obj.lessons;
        return allCoursesLessonsCache;
      }
    } catch { }
  }

  // 1..4 kursni parallel yuklash
  const results = await Promise.all([1, 2, 3, 4].map(async (c) => {
    const { lessons } = await loadCourse(c);
    return lessons;
  }));

  const merged = results.flat();
  allCoursesLessonsCache = merged;

  localStorage.setItem(ALL_COURSES_CACHE_KEY, JSON.stringify({ ts: Date.now(), lessons: merged }));

  return merged;
}

function getTodayUz() {
  const d = new Date();
  return DAYS_UZ[d.getDay()]; // 0 yakshanba
}
const DAY_EN_TO_UZ = {
  Monday: "Dushanba",
  Tuesday: "Seshanba",
  Wednesday: "Chorshanba",
  Thursday: "Payshanba",
  Friday: "Juma",
  Saturday: "Shanba",
  Sunday: "Yakshanba",
};

const TIMES = [
  "09:00-10:20",
  "10:30-11:50",
  "12:00-13:20",
  "13:20-14:20", // lunch
  "14:20-15:40",
  "15:50-17:10",
  "17:20-18:40",
  "18:50-20:10",
];

const STATIC_ROOMS = [
  "221 Room", "222 Room", "223 Room", "230 Room", "232 Room", "234 Lecture Room", "235 Room",
  "236 Lecture Room", "238 Lecture Room", "239 Room", "240 Room", "243 Room",
  "317 Room", "318 Room", "319 Room", "320 Room", "321 Room", "322 Room", "323 Lecture Room",
  "325 Room", "326 Room", "327 Room", "329 Room"
];

const els = {
  course: document.getElementById("courseSelect"),
  day: document.getElementById("daySelect"),
  group: document.getElementById("groupSelect"),
  reload: document.getElementById("reloadBtn"),
  auto: document.getElementById("autoRefresh"),
  status: document.getElementById("status"),
  schedule: document.getElementById("schedule"),
};

let state = {
  course: 2,
  day: null,
  group: null,
  lessons: [],
  timer: null,
  tab: "schedule",
};
function savePrefs() {
  localStorage.setItem("tt.course", String(state.course));
  localStorage.setItem("tt.day", String(state.day || ""));
  localStorage.setItem("tt.group", String(state.group || ""));
  localStorage.setItem("tt.auto", els.auto.checked ? "1" : "0");
}

function loadPrefs() {
  const c = Number(localStorage.getItem("tt.course") || "2");
  state.course = Number.isFinite(c) ? c : 2;
  state.day = localStorage.getItem("tt.day") || "";
  state.group = localStorage.getItem("tt.group") || "";
  els.auto.checked = localStorage.getItem("tt.auto") === "1";
}

function todayUz() {
  const d = new Date();
  const day = d.getDay(); // 0 Sunday..6 Saturday
  // UZ: Monday index 0
  const map = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
  return map[day];
}

function setStatus(text) {
  els.status.textContent = text;
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function normalizeDayName(dayStr) {
  const s = String(dayStr || "").trim();
  return DAY_EN_TO_UZ[s] || s; // Monday->Dushanba, yoki allaqachon uz bo'lsa o'zi
}

function fillDaySelect(selected) {
  els.day.innerHTML = "";
  for (const d of DAYS_UZ) {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    els.day.appendChild(opt);
  }
  els.day.value = selected || todayUz();
}

function fillGroupSelect(groups, selected) {
  els.group.innerHTML = "";
  for (const g of groups) {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    els.group.appendChild(opt);
  }
  if (selected && groups.includes(selected)) els.group.value = selected;
  else els.group.value = groups[0] || "";
}

async function fetchCourseLessons(course) {
  if (typeof window.loadCourse !== "function") {
    throw new Error("loadCourse() topilmadi. test.js oxiriga window.loadCourse = loadCourse; qo‘shilganini tekshir.");
  }
  const { lessons } = await window.loadCourse(course);

  // day ni uzbekka normalize qilamiz
  return lessons.map(l => ({
    ...l,
    day: normalizeDayName(l.day),
    teacher: String(l.teacher || "").trim(),
    room: String(l.room || "").trim(),
    subject: String(l.subject || "").trim(),
    groups: Array.isArray(l.groups) ? l.groups.map(x => String(x).trim()) : [],
    time: String(l.time || "").trim(),
  }));
}

function lessonsForGroupAndDay(lessons, group, day) {
  const g = String(group || "").trim();
  const d = String(day || "").trim();
  return lessons.filter(l => l.day === d && Array.isArray(l.groups) && l.groups.includes(g));
}

function lessonsForDay(lessons, day) {
  const d = String(day || "").trim();
  return lessons.filter(l => l.day === d);
}

function groupAllGroups(lessons) {
  const all = [];
  for (const l of lessons) {
    if (Array.isArray(l.groups)) all.push(...l.groups);
  }
  return uniq(all.map(x => String(x).trim()).filter(Boolean)).sort();
}

function buildScheduleUI(dayLessons) {
  // time -> lessons (faqat dars borlarini yig'amiz)
  const map = new Map();
  for (const l of dayLessons) {
    const time = String(l.time || "").trim();
    const subject = String(l.subject || "").trim();

    // himoya: time yo'q yoki fan yo'q bo'lsa skip
    if (!time || !subject) continue;

    // tushlikni umuman ko'rsatmaymiz
    if (time === "13:20-14:20") continue;

    if (!map.has(time)) map.set(time, []);
    map.get(time).push(l);
  }

  // vaqt bo'yicha tartiblash uchun
  const timeOrder = new Map(TIMES.map((t, i) => [t, i]));

  const timesWithLessons = Array.from(map.keys()).sort((a, b) => {
    const ai = timeOrder.has(a) ? timeOrder.get(a) : 999;
    const bi = timeOrder.has(b) ? timeOrder.get(b) : 999;
    return ai - bi;
  });

  const root = document.createElement("div");
  root.className = "grid";

  // Agar bu kunda umuman dars bo'lmasa
  if (timesWithLessons.length === 0) {
    const empty = document.createElement("div");
    empty.className = "slot";
    empty.innerHTML = `<div class="empty">Bu kunda dars yo‘q.</div>`;
    root.appendChild(empty);
    return root;
  }

  for (const t of timesWithLessons) {
    const list = map.get(t) || [];

    // slot card
    const slot = document.createElement("section");
    slot.className = "slot";

    const head = document.createElement("div");
    head.className = "slot-head";

    const timeEl = document.createElement("div");
    timeEl.className = "slot-time";
    timeEl.textContent = t;

    const countEl = document.createElement("div");
    countEl.className = "slot-count";
    countEl.textContent = `${list.length} ta dars`;

    head.appendChild(timeEl);
    head.appendChild(countEl);
    slot.appendChild(head);

    // darslarni tartiblash (xohlasang)
    // hozir bitta slot ichida bir nechta dars bo'lishi mumkin: shuni room/teacher bo'yicha barqaror qilamiz
    list.sort((a, b) => {
      const ar = String(a.room || "");
      const br = String(b.room || "");
      return ar.localeCompare(br);
    });

    // lessons
    for (const l of list) {
      const item = document.createElement("div");
      item.className = "lesson";

      const subj = document.createElement("div");
      subj.className = "subject";
      subj.textContent = l.subject || "(Noma’lum fan)";

      const meta = document.createElement("div");
      meta.className = "meta";

      const teacher = document.createElement("span");
      teacher.className = "pill";
      teacher.textContent = `👨‍🏫 ${l.teacher || "—"}`;

      const room = document.createElement("span");
      room.className = "pill";
      room.textContent = `🏫 ${l.room || "—"}`;

      meta.appendChild(teacher);
      meta.appendChild(room);

      // birlashgan dars bo'lsa ko'rsatamiz
      if (Array.isArray(l.groups) && l.groups.length > 1) {
        const g = document.createElement("span");
        g.className = "pill";
        g.textContent = `👥 ${l.groups.join(", ")}`;
        meta.appendChild(g);
      }

      item.appendChild(subj);
      item.appendChild(meta);
      slot.appendChild(item);
    }

    root.appendChild(slot);
  }

  return root;
}

function buildTeachersUI(lessonsDay) {
  const byTeacher = new Map();
  for (const l of lessonsDay) {
    const key = l.teacher || "Noma’lum";
    if (!byTeacher.has(key)) byTeacher.set(key, []);
    byTeacher.get(key).push(l);
  }

  const teachers = Array.from(byTeacher.keys()).sort();
  const root = document.createElement("div");
  root.className = "grid";

  if (!teachers.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Bu kunda darslar topilmadi.";
    root.appendChild(empty);
    return root;
  }

  for (const t of teachers) {
    const slot = document.createElement("section");
    slot.className = "slot";

    const head = document.createElement("div");
    head.className = "slot-head";

    const name = document.createElement("div");
    name.className = "slot-time";
    name.textContent = t;

    const count = document.createElement("div");
    count.className = "slot-count";
    count.textContent = `${byTeacher.get(t).length} ta dars`;

    head.appendChild(name);
    head.appendChild(count);
    slot.appendChild(head);

    const list = byTeacher.get(t).sort((a, b) => TIMES.indexOf(a.time) - TIMES.indexOf(b.time));
    for (const l of list) {
      const item = document.createElement("div");
      item.className = "lesson";

      const subj = document.createElement("div");
      subj.className = "subject";
      subj.textContent = `${l.time} — ${l.subject}`;

      const meta = document.createElement("div");
      meta.className = "meta";

      const room = document.createElement("span");
      room.className = "pill";
      room.textContent = `🏫 ${l.room || "—"}`;

      const groups = document.createElement("span");
      groups.className = "pill";
      groups.textContent = `👥 ${Array.isArray(l.groups) ? l.groups.join(", ") : ""}`;

      meta.appendChild(room);
      meta.appendChild(groups);

      item.appendChild(subj);
      item.appendChild(meta);
      slot.appendChild(item);
    }

    root.appendChild(slot);
  }

  return root;
}

function buildRoomsUI(lessonsDay) {
  // time -> set(rooms used)
  const used = new Map();
  for (const t of TIMES) used.set(t, new Set());

  for (const l of lessonsDay) {
    if (!l.time || !l.room) continue;
    if (!used.has(l.time)) used.set(l.time, new Set());
    used.get(l.time).add(l.room);
  }

  const root = document.createElement("div");
  root.className = "grid";

  for (const t of TIMES) {
    const slot = document.createElement("section");
    slot.className = "slot";

    const head = document.createElement("div");
    head.className = "slot-head";

    const timeEl = document.createElement("div");
    timeEl.className = "slot-time";
    timeEl.textContent = t;

    const count = document.createElement("div");
    count.className = "slot-count";

    if (t === "13:20-14:20") {
      count.textContent = "Tushlik";
    } else {
      const usedRooms = used.get(t) || new Set();
      const freeCount = STATIC_ROOMS.filter(r => !usedRooms.has(r)).length;
      count.textContent = `${freeCount} ta bo‘sh`;
    }

    head.appendChild(timeEl);
    head.appendChild(count);
    slot.appendChild(head);

    if (t === "13:20-14:20") {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Tushlik vaqti";
      slot.appendChild(empty);
      root.appendChild(slot);
      continue;
    }

    const usedRooms = used.get(t) || new Set();
    const freeRooms = STATIC_ROOMS.filter(r => !usedRooms.has(r));

    const wrap = document.createElement("div");
    wrap.className = "lesson";

    const title = document.createElement("div");
    title.className = "subject";
    title.textContent = "Bo‘sh xonalar";

    const meta = document.createElement("div");
    meta.className = "meta";

    if (!freeRooms.length) {
      const p = document.createElement("span");
      p.className = "pill";
      p.textContent = "Bo‘sh xona topilmadi";
      meta.appendChild(p);
    } else {
      for (const r of freeRooms.slice(0, 18)) { // ko‘p bo‘lsa ham ekranni to‘ldirmasin
        const p = document.createElement("span");
        p.className = "pill";
        p.textContent = r;
        meta.appendChild(p);
      }
      if (freeRooms.length > 18) {
        const more = document.createElement("span");
        more.className = "pill";
        more.textContent = `+${freeRooms.length - 18} ta`;
        meta.appendChild(more);
      }
    }

    wrap.appendChild(title);
    wrap.appendChild(meta);
    slot.appendChild(wrap);
    root.appendChild(slot);
  }

  return root;
}

function mountBaseLayout() {
  els.schedule.innerHTML = "";

  const tabs = document.createElement("div");

  tabs.innerHTML = `
    <section id="tabSchedule" class="tab active"></section>
    <section id="tabTeachers" class="tab"></section>
    <section id="tabRooms" class="tab"></section>

    <nav class="appbar">
      <div class="appbar-inner">
        <button class="appbtn active" data-tab="schedule" type="button">📅 Jadval</button>
        <button class="appbtn" data-tab="teachers" type="button">👨‍🏫 Ustozlar</button>
        <button class="appbtn" data-tab="rooms" type="button">🏫 Xonalar</button>
        <button class="appbtn" data-tab="settings" type="button">⚙️ Sozlash</button>
      </div>
    </nav>
  `;

  els.schedule.appendChild(tabs);

  tabs.querySelectorAll(".appbtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      // Handle settings tab separately
      if (tab === "settings") {
        openSettingsModal();
        return;
      }

      state.tab = tab;

      tabs.querySelectorAll(".appbtn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      tabs.querySelector("#tabSchedule").classList.toggle("active", tab === "schedule");
      tabs.querySelector("#tabTeachers").classList.toggle("active", tab === "teachers");
      tabs.querySelector("#tabRooms").classList.toggle("active", tab === "rooms");

      renderTabs();
    });
  });
}

function renderTabs() {
  const day = els.day.value;
  const group = els.group.value;

  const tabSchedule = document.getElementById("tabSchedule");
  const tabTeachers = document.getElementById("tabTeachers");
  const tabRooms = document.getElementById("tabRooms");

  // Header
  tabSchedule.innerHTML = "";
  tabTeachers.innerHTML = "";
  tabRooms.innerHTML = "";

  const head = document.createElement("div");
  head.className = "day-header";
  head.innerHTML = `
    <span class="badge">📘 Kurs: ${state.course}</span>
    <span class="badge">📅 ${day}</span>
    <span class="badge">👥 ${group || "-"}</span>
  `;

  if (state.tab === "schedule") tabSchedule.appendChild(head);
  if (state.tab === "teachers") tabTeachers.appendChild(head.cloneNode(true));
  if (state.tab === "rooms") tabRooms.appendChild(head.cloneNode(true));

  // Schedule tab (group+day)
  const dayLessonsForGroup = lessonsForGroupAndDay(state.lessons, group, day);
  tabSchedule.appendChild(buildScheduleUI(dayLessonsForGroup));

  // Teachers tab (all lessons in day)
  const dayAll = lessonsForDay(state.lessons, day);
  tabTeachers.appendChild(buildTeachersUI(dayAll));

  // Rooms tab
  tabRooms.appendChild(buildRoomsUI(dayAll));

  savePrefs();
}

async function reloadData() {
  try {
    setStatus("⏳ Ma'lumot yuklanmoqda...");
    els.reload.disabled = true;

    state.course = Number(els.course.value);

    const lessons = await fetchCourseLessons(state.course);
    state.lessons = lessons;

    const groups = groupAllGroups(lessons);
    fillGroupSelect(groups, state.group);

    if (!els.day.value) fillDaySelect(state.day);

    setStatus(`✅ Yuklandi: Kurs ${state.course}`);

    renderTabs();
  } catch (e) {
    setStatus("❌ Xatolik: " + (e?.message || e));
  } finally {
    els.reload.disabled = false;
  }
}

function setupAutoRefresh() {
  if (state.timer) clearInterval(state.timer);
  state.timer = null;

  if (!els.auto.checked) return;

  state.timer = setInterval(() => {
    reloadData();
  }, 60 * 1000);
}

function init() {
  loadPrefs();

  // Set course from saved preferences
  els.course.value = String(state.course);

  // Set day from saved preferences
  fillDaySelect(state.day || todayUz());

  mountBaseLayout();

  els.course.addEventListener("change", () => {
    state.course = Number(els.course.value);
    savePrefs();
    reloadData();
  });

  els.day.addEventListener("change", () => {
    state.day = els.day.value;
    savePrefs();
    renderTabs();
  });

  els.group.addEventListener("change", () => {
    state.group = els.group.value;
    savePrefs();
    renderTabs();
  });

  els.reload.addEventListener("click", () => reloadData());

  els.auto.addEventListener("change", () => {
    savePrefs();
    setupAutoRefresh();
  });

  setupAutoRefresh();

  // Load data - this will populate groups and auto-select saved group
  reloadData();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        await navigator.serviceWorker.register("./service-worker.js");
      } catch (err) {
        // Service worker registration failed silently
      }
    });
  }

}
const PROFILE_KEY = "timetable:profile";
// profile example:
// { role: "student", course: 2, group: "24-302 AI", teacher: "", day: "Dushanba" }

function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); }
  catch { return null; }
}

function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}


function showModal() {
  document.getElementById("setupModal").classList.remove("hidden");
}
function hideModal() {
  document.getElementById("setupModal").classList.add("hidden");
}

// ====== OPEN SETTINGS MODAL ======
async function openSettingsModal() {
  const modal = document.getElementById("setupModal");
  const roleSeg = document.getElementById("roleSeg");
  const courseSelectModal = document.getElementById("courseSelectModal");
  const saveBtn = document.getElementById("saveSetupBtn");

  // Load current settings
  const currentCourse = Number(els.course.value);
  const currentGroup = els.group.value;

  // Set modal values to current settings
  courseSelectModal.value = String(currentCourse);

  // Update role buttons (assume student for now)
  roleSeg.querySelectorAll(".seg-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.role === "student");
  });

  // Load groups for current course
  try {
    const lessons = await fetchCourseLessons(currentCourse);
    const groups = groupAllGroups(lessons);

    // Get group select from modal
    const groupSelectModal = document.getElementById("groupSelect");
    if (groupSelectModal) {
      groupSelectModal.innerHTML = groups.map(g => `<option value="${g}">${g}</option>`).join("");
      // Set current group as selected
      if (currentGroup && groups.includes(currentGroup)) {
        groupSelectModal.value = currentGroup;
      }
    }

    // Handle course change to reload groups
    const handleCourseChange = async () => {
      const newCourse = Number(courseSelectModal.value);
      const newLessons = await fetchCourseLessons(newCourse);
      const newGroups = groupAllGroups(newLessons);

      if (groupSelectModal) {
        groupSelectModal.innerHTML = newGroups.map(g => `<option value="${g}">${g}</option>`).join("");
      }
    };

    courseSelectModal.removeEventListener("change", handleCourseChange);
    courseSelectModal.addEventListener("change", handleCourseChange);

    // Show modal
    modal.classList.remove("hidden");
    modal.classList.add("active");

    // Handle save button
    const handleSave = async () => {
      const newCourse = Number(courseSelectModal.value);
      const newGroup = groupSelectModal ? groupSelectModal.value : "";

      // Update main controls
      els.course.value = String(newCourse);
      state.course = newCourse;
      state.group = newGroup;

      // Save preferences
      savePrefs();

      // Reload data with new course
      await reloadData();

      // Close modal
      modal.classList.remove("active");
      modal.classList.add("hidden");

      // Remove event listeners
      saveBtn.removeEventListener("click", handleSave);
      courseSelectModal.removeEventListener("change", handleCourseChange);
    };

    // Remove any existing listeners and add new one
    saveBtn.removeEventListener("click", handleSave);
    saveBtn.addEventListener("click", handleSave);

    // Close on background click
    const handleBackgroundClick = (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
        modal.classList.add("hidden");
        modal.removeEventListener("click", handleBackgroundClick);
        saveBtn.removeEventListener("click", handleSave);
        courseSelectModal.removeEventListener("change", handleCourseChange);
      }
    };
    modal.addEventListener("click", handleBackgroundClick);
  } catch (error) {
    // If loading fails, still show modal but without groups
    modal.classList.remove("hidden");
    modal.classList.add("active");
  }
}


// ====== UI BINDINGS ======
function setupFirstRunUI() {
  const modal = document.getElementById("setupModal");
  const roleSeg = document.getElementById("roleSeg");
  const courseSelect = document.getElementById("courseSelect");
  const saveBtn = document.getElementById("saveSetupBtn");
  const openSettingsBtn = document.getElementById("openSettingsBtn");

  let selectedRole = "student";

  // Role toggle
  roleSeg.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-role]");
    if (!btn) return;
    selectedRole = btn.dataset.role;

    // active class
    roleSeg.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });

  // Save
  saveBtn.addEventListener("click", async () => {
    const course = Number(courseSelect.value);

    const profile = { role: selectedRole, course };
    saveProfile(profile);
    hideModal();

    // Profil saqlandi -> endi asosiy logikani ishga tushiramiz
    await onProfileReady(profile);
  });

  // Open settings (re-config)
  openSettingsBtn?.addEventListener("click", () => {
    // oldingi qiymatni UIga qo'yamiz
    const p = loadProfile();
    if (p) {
      selectedRole = p.role || "student";
      courseSelect.value = String(p.course || 2);

      // active update
      roleSeg.querySelectorAll(".seg-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.role === selectedRole);
      });
    }
    showModal();
  });

  // Modal fonini bosganda yopilmasin (majburiy tanlash uchun)
  // agar xohlasang yopilishini:
  // modal.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });
}

// ====== APP INIT ======
async function initApp() {
  const p = loadProfile();

  if (!p?.role || !p?.course || !p?.day || (p.role === "student" && !p.group) || (p.role === "teacher" && !p.teacher)) {
    await openSetupWizard();
    return;
  }

  await onProfileReady(p);
}


// ====== WHEN PROFILE READY ======
async function onProfileReady(profile) {
  // statusga yozish (agar sendagi #status bo'lsa)
  const status = document.getElementById("status");
  if (status) {
    status.textContent = `${profile.role === "student" ? "Student" : "Teacher"} • ${profile.course}-kurs`;
  }

}

// ====== HEADER COLLAPSE FUNCTIONALITY ======
function initHeaderCollapse() {
  const headerToggleBtn = document.getElementById("headerToggleBtn");
  const topbar = document.querySelector(".topbar");

  if (!headerToggleBtn || !topbar) return;

  // Load saved state
  const isCollapsed = localStorage.getItem("headerCollapsed") === "true";
  if (isCollapsed) {
    topbar.classList.add("collapsed");
  }

  headerToggleBtn.addEventListener("click", () => {
    topbar.classList.toggle("collapsed");
    localStorage.setItem("headerCollapsed", topbar.classList.contains("collapsed"));
  });
}

// start
initHeaderCollapse();
initApp();
async function openSetupWizard() {
  const modal = document.getElementById("setupModal");
  const roleSeg = document.getElementById("roleSeg");
  const courseSelect = document.getElementById("courseSelectModal");
  const daySelect = document.getElementById("daySelect");

  const groupField = document.getElementById("groupField");
  const teacherField = document.getElementById("teacherField");
  const groupSelectSetup = document.getElementById("groupSelect");
  const teacherSelectSetup = document.getElementById("teacherSelect");

  const saveBtn = document.getElementById("saveSetupBtn");

  // defaults
  let selectedRole = "student";
  daySelect.value = getTodayUz();

  // role toggle
  roleSeg.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-role]");
    if (!btn) return;
    selectedRole = btn.dataset.role;

    roleSeg.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // rolega qarab field ko'rsatish
    if (selectedRole === "student") {
      groupField.classList.remove("hidden");
      teacherField.classList.add("hidden");
    } else {
      teacherField.classList.remove("hidden");
      groupField.classList.add("hidden");
    }
  });

  async function refreshGroupTeacherOptions() {
    const course = Number(courseSelect.value);

    // ⚠️ bu funksiya SENING test.js dagi loadCourse(course) bo'lishi kerak
    const { lessons } = await loadCourse(course);

    // student uchun group list
    const groups = Array.from(new Set(
      lessons.flatMap(l => Array.isArray(l.groups) ? l.groups : [])
    )).sort();

    // teacher uchun teacher list
    const teachers = Array.from(new Set(
      lessons.map(l => (l.teacher || "").trim()).filter(Boolean)
    )).sort();

    groupSelectSetup.innerHTML = groups.map(g => `<option value="${g}">${g}</option>`).join("");
    teacherSelectSetup.innerHTML = teachers.map(t => `<option value="${t}">${t}</option>`).join("");
  }

  // course o'zgarsa listni yangilash
  courseSelect.addEventListener("change", refreshGroupTeacherOptions);

  // modal ochilganda birinchi marta ham to'ldiramiz
  await refreshGroupTeacherOptions();

  modal.classList.remove("hidden");

  saveBtn.onclick = async () => {
    const course = Number(courseSelect.value);
    const day = daySelect.value;

    const profile = {
      role: selectedRole,
      course,
      day,
      group: selectedRole === "student" ? groupSelectSetup.value : "",
      teacher: selectedRole === "teacher" ? teacherSelectSetup.value : ""
    };

    saveProfile(profile);
    modal.classList.add("hidden");

    await onProfileReady(profile);
  };
}
init();

// ========== NEW ONBOARDING & FEEDBACK INTEGRATION ==========
import { initOnboarding } from './onboarding.js';
import { initFeedback } from './feedback.js';

//Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initOnboarding();
  initFeedback();
  window.reloadData = reloadData;
});
