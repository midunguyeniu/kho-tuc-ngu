// Kho Tục Ngữ, Thành Ngữ, Ca Dao Việt Nam: widget "Câu ngẫu nhiên" cho app Scriptable (iPhone).
// Cỡ widget: vừa (4x2). Bấm vào widget để mở câu đó trên trang tra cứu.
// Tùy chọn (Parameter khi sửa widget): "tục ngữ", "thành ngữ" hoặc "ca dao" để chỉ hiện một loại.

const BASE = "https://midunguyeniu.github.io/kho-tuc-ngu/";
const DATA_URL = BASE + "widget.json";
const MAX_AGE = 7 * 24 * 3600 * 1000; // tải lại dữ liệu mỗi tuần
const REFRESH_MIN = 30;               // xin iOS đổi câu sau ~30 phút (iOS quyết định thời điểm thật)

const C = {
  bg: Color.dynamic(new Color("#fffdf8"), new Color("#201c17")),
  ink: Color.dynamic(new Color("#1f1a14"), new Color("#f1eadf")),
  muted: Color.dynamic(new Color("#6f6556"), new Color("#a89d8b")),
  accent: Color.dynamic(new Color("#b3261e"), new Color("#ff7a6e")),
  "tục ngữ": Color.dynamic(new Color("#b3261e"), new Color("#ff7a6e")),
  "thành ngữ": Color.dynamic(new Color("#2f7d4a"), new Color("#63c48a")),
  "ca dao": Color.dynamic(new Color("#6a48b0"), new Color("#b49cf2")),
};

const fm = FileManager.local();
const dir = fm.joinPath(fm.documentsDirectory(), "kho-tuc-ngu");
const cachePath = fm.joinPath(dir, "widget.json");

async function loadData() {
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  const has = fm.fileExists(cachePath);
  const fresh = has && Date.now() - fm.modificationDate(cachePath).getTime() < MAX_AGE;
  if (!fresh) {
    try {
      const req = new Request(DATA_URL);
      req.timeoutInterval = 15;
      const txt = await req.loadString();
      const arr = JSON.parse(txt);
      if (Array.isArray(arr) && arr.length) {
        fm.writeString(cachePath, txt);
        return arr;
      }
    } catch (e) { /* mất mạng: dùng bản đã lưu */ }
  }
  if (has) {
    try { return JSON.parse(fm.readString(cachePath)); } catch (e) { /* hỏng thì coi như chưa có */ }
  }
  return null;
}

const lines = (cau) => cau.split(" / ").map((s) => s.trim()).filter(Boolean);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function pick(data, param) {
  // chỉ lấy câu vừa khung widget vừa: tối đa 4 dòng, không quá dài
  let pool = data.filter((e) => e.c && lines(e.c).length <= 4 && e.c.length <= 150);
  const want = (param || "").trim().toLowerCase();
  if (want) {
    const f = pool.filter((e) => e.l === want);
    if (f.length) pool = f;
  }
  if (!pool.length) pool = data;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildWidget(e) {
  const w = new ListWidget();
  w.backgroundColor = C.bg;
  w.setPadding(14, 16, 14, 16);
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60 * 1000);

  if (!e) {
    const t = w.addText("Chưa tải được dữ liệu. Kiểm tra mạng rồi mở lại.");
    t.font = Font.systemFont(14);
    t.textColor = C.muted;
    return w;
  }
  w.url = BASE + "?id=" + encodeURIComponent(e.i);

  // dòng trên: nhãn + loại + sao
  const top = w.addStack();
  top.centerAlignContent();
  const lb = top.addText("CÂU NGẪU NHIÊN");
  lb.font = Font.boldSystemFont(10);
  lb.textColor = C.accent;
  top.addSpacer();
  if (e.l) {
    const lt = top.addText(cap(e.l));
    lt.font = Font.semiboldSystemFont(11);
    lt.textColor = C[e.l] || C.muted;
    top.addSpacer(6);
  }
  const p = Math.max(1, Math.min(3, e.p || 1));
  const st = top.addText("★".repeat(p) + "☆".repeat(3 - p));
  st.font = Font.systemFont(11);
  st.textColor = C.accent;

  w.addSpacer(); // câu + nghĩa nằm giữa phần còn lại của khung

  // câu: ca dao mỗi dòng thơ một dòng
  const ls = lines(e.c);
  const longest = Math.max(...ls.map((s) => s.length));
  const size = ls.length >= 4 || e.c.length > 110 ? 13 : ls.length === 3 || longest > 34 ? 15 : longest <= 24 ? 20 : 17;
  const ct = w.addText(ls.join("\n"));
  ct.font = Font.semiboldSystemFont(size);
  ct.textColor = C.ink;
  ct.minimumScaleFactor = 0.6;
  ct.lineLimit = Math.max(ls.length, 2);

  w.addSpacer(5);

  // nghĩa / cách dùng (2 dòng)
  if (e.m) {
    const mt = w.addText(e.m);
    mt.font = Font.systemFont(12);
    mt.textColor = C.muted;
    mt.lineLimit = ls.length >= 3 ? 1 : 2;
    mt.minimumScaleFactor = 0.85;
  }
  w.addSpacer();
  return w;
}

const data = await loadData();
const entry = data ? pick(data, args.widgetParameter) : null;
const widget = buildWidget(entry);
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
