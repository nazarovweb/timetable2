// app.js ichida
// app.js ichida
const COURSE_SHEETS = {
  1: {
    publishedId: "2PACX-1vQjmxDQIL8RumnyaMdY7W_bm-T-4Agk6snf1S7-KCieFUgopBaZH7tIRFAZtsoNjvIGvuOjULOys5-K",
    gid: 0,
  },
  2: {
    publishedId: "2PACX-1vSl7bSI3rO61zJ7R1cXHpRQitwtygoZbVhZpeLzgqEvz6f84Va2I95tXBy5LeHFg_3JtxkBZR6fpDQ2",
    gid: 0,
  },
  3: {
    publishedId: "2PACX-1vRNnttb_SHtMret_V6ze6pZNYTpEVZLYCpVbpcv5O_1sxM_AR2YlJZCzBRuuprNWVU5WxUCHf_Yz6mx",
    gid: 0,
  },
  4: {
    publishedId: "2PACX-1vT126RO-PqYp2FAZUV4u_KIEHrFdN57jMfTY2QWLpvXfbhDk_MC-Af7liFyeAylOQVAYDiURe1rTis7",
    gid: 0,
  },
};

const DAY_MAP = {
    Monday: "Dushanba",
    Tuesday: "Seshanba",
    Wednesday: "Chorshanba",
    Thursday: "Payshanba",
    Friday: "Juma",
    Saturday: "Shanba",
    Sunday: "Yakshanba",
};

function makePublishedCsvUrl(publishedId, gid) {
  return `https://docs.google.com/spreadsheets/d/e/${publishedId}/pub?output=csv&gid=${gid}`;
}

async function fetchCourseCsv(course) {
  const cfg = COURSE_SHEETS[course];
  if (!cfg) throw new Error("Course config topilmadi: " + course);

  const url = makePublishedCsvUrl(cfg.publishedId, cfg.gid);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("CSV fetch error: " + res.status);

  return await res.text();
}


function parseCSV(text) {
    // Windows CRLF ni normal qilamiz
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];

        // "" -> " (escaped quote)
        if (ch === '"' && inQuotes && next === '"') {
            cur += '"';
            i++;
            continue;
        }

        if (ch === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (ch === "," && !inQuotes) {
            row.push(cur);
            cur = "";
            continue;
        }

        if (ch === "\n" && !inQuotes) {
            row.push(cur);
            rows.push(row);
            row = [];
            cur = "";
            continue;
        }

        cur += ch;
    }

    // oxirgi qiymat
    if (cur.length || row.length) {
        row.push(cur);
        rows.push(row);
    }

    return rows;
}

// ✅ Barcha qatorlarni header uzunligiga tenglashtiramiz (ustunlar siljimaydi)
function normalizeToHeaderWidth(rows) {
    if (!rows?.length) return rows;

    const headerWidth = Math.max(rows[0]?.length || 0, rows[1]?.length || 0);
    return rows.map((r) => {
        const row = r.slice();
        while (row.length < headerWidth) row.push("");
        return row;
    });

}

const LUNCH = "13:20-14:20";
const SHIFT1 = new Set(["09:00-10:20", "10:30-11:50", "12:00-13:20"]);
const SHIFT2 = new Set(["14:20-15:40", "15:50-17:10", "17:20-18:40", "18:50-20:10"]);

function getShiftByTime(time) {
    if (SHIFT1.has(time)) return 1;
    if (SHIFT2.has(time)) return 2;
    return 0; // lunch yoki noma'lum
}

function splitGroups(cell) {
    const s = String(cell ?? "").trim();
    if (!s) return [];
    return s.split(",").map(x => x.trim()).filter(Boolean);
}
function buildColumnMeta(dayRow, timeRow) {
    const meta = [];
    let currentDay = "";

    const maxCols = Math.max(dayRow.length, timeRow.length);

    for (let c = 0; c < maxCols; c++) {
        const dayCell = String(dayRow[c] ?? "").trim();
        if (dayCell) currentDay = dayCell;

        const timeCell = String(timeRow[c] ?? "").trim();
        if (!currentDay || !timeCell) { meta[c] = null; continue; }

        const day = currentDay.split("(")[0].trim();
        const m = timeCell.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
        const time = m ? `${m[1]}-${m[2]}` : timeCell;

        meta[c] = { day, time };
    }
    return meta;
}
function matrixToLessonEvents(rows, course) {
    const dayHeader = rows[0] || [];
    const timeHeader = rows[1] || [];
    const colMeta = buildColumnMeta(dayHeader, timeHeader);

    const lessons = [];
    const seen = new Set();

    for (let r = 2; r < rows.length; r += 4) {
        const subjectsRow = rows[r] || [];
        const teachersRow = rows[r + 1] || [];
        const groupsRow = rows[r + 2] || [];
        const roomsRow = rows[r + 3] || [];

        // blok guruhi odatda subjectsRow[0]
        const blockGroup = String(subjectsRow[0] ?? "").trim();

        for (let c = 0; c < colMeta.length; c++) {
            const meta = colMeta[c];
            if (!meta) continue;

            const subject = String(subjectsRow[c] ?? "").trim();
            if (!subject) continue;                 // dars yo'q

            if (meta.time === LUNCH) continue;      // lunch dars emas

            const teacher = String(teachersRow[c] ?? "").trim();
            const room = String(roomsRow[c] ?? "").trim();

            const cellGroups = splitGroups(groupsRow[c]);
            const groups = cellGroups.length ? cellGroups : (blockGroup ? [blockGroup] : []);

            const shift = getShiftByTime(meta.time);
            if (!shift) continue; // noma'lum yoki lunch

            // dedupe key
            const id = [
                course, meta.day, meta.time,
                subject, teacher, room,
                groups.join("+")
            ].join("|");

            if (seen.has(id)) continue;
            seen.add(id);

            lessons.push({
                id,
                course,
                day: meta.day,
                time: meta.time,
                shift,
                subject,
                teacher,
                room,
                groups
            });
        }
    }

    return lessons;
}
async function loadCourse(course) {
  const csv = await fetchCourseCsv(course);
  console.log(" CSV:", csv);
  let rows = parseCSV(csv);
  console.log("ROWS:", rows);
  
  rows = normalizeToHeaderWidth(rows);
  const meta = buildColumnMeta(rows[0], rows[1]);
  const lessons = matrixToLessonEvents(rows, course);
  return { rows, lessons };
}


loadCourse(2);
window.loadCourse = loadCourse;
