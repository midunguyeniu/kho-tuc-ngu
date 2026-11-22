// Kho Tục Ngữ, Thành Ngữ, Ca Dao Việt Nam: widget "Câu ngẫu nhiên" cho app Scriptable (iPhone).
// Cỡ widget: vừa (4x2) trên màn hình chính; trên màn hình khóa: khung chữ nhật, một dòng, hoặc khung tròn.
// Bấm vào widget để mở câu đó trên trang tra cứu.
// Tùy chọn (Parameter khi sửa widget): "tục ngữ", "thành ngữ" hoặc "ca dao" để chỉ hiện một loại.
// Thông báo: mỗi ngày một câu ngẫu nhiên vào các giờ trong NOTIFY_TIMES. Không muốn nhận thì đổi thành [].

const BASE = "https://midunguyeniu.github.io/kho-tuc-ngu/";
const DATA_URL = BASE + "widget.json";
const MAX_AGE = 7 * 24 * 3600 * 1000; // tải lại dữ liệu mỗi tuần
const REFRESH_MIN = 30;               // xin iOS đổi câu sau ~30 phút (iOS quyết định thời điểm thật)
const NOTIFY_TIMES = ["08:00", "12:00", "20:00"];
const NOTIFY_DAYS = 10;               // hẹn sẵn cho 10 ngày tới (iOS giữ tối đa 64 thông báo chờ cho cả app)
const NOTIFY_PREFIX = "kho-tuc-ngu-";

const C = {
  bg: Color.dynamic(new Color("#fffdf8"), new Color("#201c17")),
  ink: Color.dynamic(new Color("#1f1a14"), new Color("#f1eadf")),
  muted: Color.dynamic(new Color("#6f6556"), new Color("#a89d8b")),
  accent: Color.dynamic(new Color("#b3261e"), new Color("#ff7a6e")),
  ex: Color.dynamic(new Color("#2f5d8a"), new Color("#8fbcec")),
  "tục ngữ": Color.dynamic(new Color("#b3261e"), new Color("#ff7a6e")),
  "thành ngữ": Color.dynamic(new Color("#2f7d4a"), new Color("#63c48a")),
  "ca dao": Color.dynamic(new Color("#6a48b0"), new Color("#b49cf2")),
};

const fm = FileManager.local();
const dir = fm.joinPath(fm.documentsDirectory(), "kho-tuc-ngu");
const cachePath = fm.joinPath(dir, "widget.json");

// dữ liệu hợp lệ: có câu và có trường ví dụ (bản lưu cũ chưa có ví dụ thì tải lại)
const valid = (a) => Array.isArray(a) && a.length > 0 && "v" in a[0];

function readCache() {
  try { const a = JSON.parse(fm.readString(cachePath)); return valid(a) ? a : null; } catch (e) { return null; }
}

async function loadData() {
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  const cached = fm.fileExists(cachePath) ? readCache() : null;
  const fresh = cached && Date.now() - fm.modificationDate(cachePath).getTime() < MAX_AGE;
  if (!fresh) {
    try {
      const req = new Request(DATA_URL);
      req.timeoutInterval = 15;
      const txt = await req.loadString();
      const arr = JSON.parse(txt);
      if (valid(arr)) {
        fm.writeString(cachePath, txt);
        return arr;
      }
    } catch (e) { /* mất mạng: dùng bản đã lưu */ }
  }
  if (cached) return cached;
  // mất mạng và bản lưu cũ chưa có ví dụ: vẫn hiện câu, chỉ thiếu ví dụ
  try { const a = JSON.parse(fm.readString(cachePath)); if (Array.isArray(a) && a.length) return a; } catch (e) {}
  return null;
}

const lines = (cau) => cau.split(" / ").map((s) => s.trim()).filter(Boolean);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function pick(data, param, maxLines = 4, maxLen = 150) {
  // chỉ lấy câu vừa khung: mặc định cho widget vừa (tối đa 4 dòng, không quá dài); màn hình khóa chặt hơn
  let pool = data.filter((e) => e.c && lines(e.c).length <= maxLines && e.c.length <= maxLen);
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

  // nghĩa và ví dụ: câu càng ngắn thì càng nhiều dòng cho nghĩa/ví dụ
  const short = ls.length === 1 && longest <= 30;
  if (e.m) {
    const mt = w.addText(e.m);
    mt.font = Font.systemFont(12);
    mt.textColor = C.muted;
    mt.lineLimit = short ? 2 : 1;
    mt.minimumScaleFactor = 0.85;
  }
  if (e.v) {
    w.addSpacer(4);
    const vt = w.addText("“" + e.v.replace(/^[“"']+|[”"']+$/g, "") + "”");
    vt.font = Font.italicSystemFont(12);
    vt.textColor = C.ex;
    vt.lineLimit = ls.length >= 3 ? 1 : 2;
    vt.minimumScaleFactor = 0.85;
  }
  w.addSpacer();
  return w;
}

// widget màn hình khóa (iOS 16+): iPhone tự tô màu theo hình nền, nên chỉ dùng chữ trắng + độ mờ
function buildLockWidget(e, family) {
  const w = new ListWidget();
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MIN * 60 * 1000);
  if (e) w.url = BASE + "?id=" + encodeURIComponent(e.i);

  if (family === "accessoryInline") {
    // một dòng phía trên đồng hồ: chỉ có chỗ cho câu ngắn
    const t = w.addText(e ? lines(e.c)[0] : "Kho Tục Ngữ");
    t.font = Font.systemFont(12);
    return w;
  }
  if (family === "accessoryCircular") {
    // khung tròn quá nhỏ cho chữ: hiện biểu tượng, bấm vào mở một câu ngẫu nhiên
    w.addAccessoryWidgetBackground = true;
    w.addSpacer();
    const row = w.addStack();
    row.addSpacer();
    const img = row.addImage(SFSymbol.named("quote.bubble").image);
    img.imageSize = new Size(24, 24);
    img.tintColor = Color.white();
    row.addSpacer();
    w.addSpacer();
    return w;
  }
  // khung chữ nhật dưới đồng hồ: câu (tối đa 2 dòng) + nghĩa ngắn
  w.setPadding(0, 0, 0, 0);
  if (!e) {
    const t = w.addText("Chưa tải được dữ liệu");
    t.font = Font.systemFont(13);
    return w;
  }
  const ls = lines(e.c);
  const oneLine = ls.length === 1 && e.c.length <= 24;
  const ct = w.addText(ls.join("\n"));
  ct.font = Font.semiboldSystemFont(14);
  ct.textColor = Color.white();
  ct.lineLimit = 2;
  ct.minimumScaleFactor = 0.7;
  if (e.m) {
    w.addSpacer(2);
    const mt = w.addText(e.m);
    mt.font = Font.systemFont(12);
    mt.textColor = Color.white();
    mt.textOpacity = 0.75;
    mt.lineLimit = oneLine ? 2 : 1;
  }
  w.addSpacer();
  return w;
}

// hẹn thông báo: mỗi giờ trong NOTIFY_TIMES của NOTIFY_DAYS ngày tới có một thông báo (mã theo ngày giờ).
// Thông báo đã hẹn thì giữ nguyên, chỉ hẹn thêm chỗ còn trống, và bỏ những cái không còn trong danh sách giờ.
function slotId(d) {
  const z = (n) => String(n).padStart(2, "0");
  return NOTIFY_PREFIX + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + "-" + z(d.getHours()) + z(d.getMinutes());
}

function notifSlots(now) {
  const out = [];
  for (let k = 0; k < NOTIFY_DAYS; k++) {
    for (const t of NOTIFY_TIMES) {
      const [h, m] = t.split(":").map(Number);
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, h, m, 0, 0);
      if (d.getTime() > now.getTime() + 60 * 1000) out.push(d);
    }
  }
  return out;
}

async function scheduleNotifications(data, param) {
  const pending = await Notification.allPending();
  const mine = pending.map((n) => n.identifier).filter((i) => i && i.startsWith(NOTIFY_PREFIX));
  const slots = notifSlots(new Date());
  const want = new Set(slots.map(slotId));
  const stale = mine.filter((i) => !want.has(i));
  if (stale.length) await Notification.removePending(stale);
  const have = new Set(mine);
  for (const d of slots) {
    const id = slotId(d);
    if (have.has(id)) continue;
    const n = makeNotification(pick(data, param), id);
    n.setTriggerDate(d);
    await n.schedule();
  }
}

// nội dung thông báo: câu một dòng thì câu làm tiêu đề; ca dao thì các dòng thơ nằm trong nội dung
function makeNotification(e, id) {
  const ls = lines(e.c);
  const n = new Notification();
  n.identifier = id;
  n.threadIdentifier = "kho-tuc-ngu";
  if (ls.length === 1) {
    n.title = e.c;
    n.body = [e.m, e.v ? "Ví dụ: " + e.v : ""].filter(Boolean).join("\n");
  } else {
    n.title = cap(e.l || "ca dao");
    n.body = [ls.join("\n"), e.m].filter(Boolean).join("\n");
  }
  n.openURL = BASE + "?id=" + encodeURIComponent(e.i);
  return n;
}

async function showInfo(title, message) {
  const a = new Alert();
  a.title = title;
  a.message = message;
  a.addAction("OK");
  await a.presentAlert();
}

// menu khi bấm ▶ trong app: xem trước widget, gửi thử thông báo, xem lịch thông báo đã hẹn
async function appMenu(data, widget) {
  while (true) {
    const a = new Alert();
    a.title = "Kho Tục Ngữ";
    a.message = notifError
      ? "Chưa gửi được thông báo. Vào Cài đặt → Scriptable → Thông báo, bật Cho phép thông báo."
      : "Widget và thông báo đã sẵn sàng.";
    a.addAction("Xem trước widget");
    a.addAction("Gửi thử 1 thông báo (sau 10 giây)");
    a.addAction("Xem lịch thông báo đã hẹn");
    a.addCancelAction("Đóng");
    const i = await a.presentSheet();
    if (i === 0) {
      await widget.presentMedium();
    } else if (i === 1) {
      if (!data) { await showInfo("Chưa có dữ liệu", "Kiểm tra mạng rồi chạy lại."); continue; }
      try {
        const n = makeNotification(pick(data, args.widgetParameter), "ktn-thu-" + Date.now());
        n.setTriggerDate(new Date(Date.now() + 10 * 1000));
        await n.schedule();
        await showInfo("Đã hẹn thông báo thử", "Bấm OK rồi về màn hình chính hoặc khóa máy, khoảng 10 giây sau thông báo sẽ hiện.");
        return;
      } catch (e) {
        await showInfo("Không gửi được", "Vào Cài đặt → Scriptable → Thông báo, bật Cho phép thông báo, rồi thử lại.");
      }
    } else if (i === 2) {
      const mine = (await Notification.allPending()).filter((n) => (n.identifier || "").startsWith(NOTIFY_PREFIX));
      const times = mine.map((n) => n.identifier.slice(NOTIFY_PREFIX.length)).sort().slice(0, 3)
        .map((s) => `${s.slice(9, 11)}:${s.slice(11, 13)} ngày ${s.slice(6, 8)}/${s.slice(4, 6)}`);
      await showInfo(`Đã hẹn ${mine.length} thông báo`,
        mine.length ? "Sắp tới: " + times.join(", ") : "Chưa có thông báo nào. Kiểm tra quyền thông báo trong Cài đặt → Scriptable.");
    } else {
      return;
    }
  }
}

let notifError = null;
const data = await loadData();
if (data) {
  try { await scheduleNotifications(data, args.widgetParameter); } catch (e) { notifError = e; /* chưa cho phép thông báo */ }
}
const family = config.widgetFamily;
let widget;
if (family === "accessoryRectangular") {
  widget = buildLockWidget(data ? pick(data, args.widgetParameter, 2, 70) : null, family);
} else if (family === "accessoryInline") {
  widget = buildLockWidget(data ? pick(data, args.widgetParameter, 1, 28) : null, family);
} else if (family === "accessoryCircular") {
  widget = buildLockWidget(data ? pick(data, args.widgetParameter) : null, family);
} else {
  widget = buildWidget(data ? pick(data, args.widgetParameter) : null);
}
if (config.runsInWidget) {
  Script.setWidget(widget);
} else if (config.runsInApp) {
  await appMenu(data, widget);
} else {
  await widget.presentMedium();
}
Script.complete();
