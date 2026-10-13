/* ============================================================
 * 工具函数库
 * ============================================================ */

/* ---------- 日期处理（重点防踩坑） ----------
 * 坑：JS 的 new Date() 用浏览器本地时区，而数据库存的是"日期"。
 * 如果你们在中国用，本地就是东八区没问题；但万一哪天开了国外代理，
 * 本地时区变了，"今天"就错了。所以统一换算成东八区再取日期。
 */
function shanghaiNow() {
  // toLocaleString 带 timeZone 参数，会得到东八区的"当地时间字符串"，
  // 再 new Date 一次就得到一个"数值上等于东八区时间"的 Date 对象
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
}

/* 把 Date 格式化成 'YYYY-MM-DD'（数据库存的就是这个格式） */
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* 东八区的"今天"，如 '2026-10-14' */
function todayStr() {
  return toDateStr(shanghaiNow());
}

/* 现在是否还在截止时间（默认 23:30）之前？ */
function isBeforeDeadline() {
  const now = shanghaiNow();
  const limit = DEADLINE_HOUR * 60 + DEADLINE_MINUTE;
  return now.getHours() * 60 + now.getMinutes() < limit;
}

/* 距截止的倒计时文字，如 "还剩 2小时13分"；已过截止返回 '今日已截止' */
function deadlineCountdown() {
  const now = shanghaiNow();
  const limitMin = DEADLINE_HOUR * 60 + DEADLINE_MINUTE;
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const diff = Math.floor(limitMin - nowMin);
  if (diff < 0) return '今日已截止';
  if (diff >= 60) return `还剩 ${Math.floor(diff / 60)} 小时 ${diff % 60} 分`;
  return `还剩 ${diff} 分钟`;
}

/* 按时段的问候语，如 "晚上好" */
function greeting() {
  const h = shanghaiNow().getHours();
  if (h < 5) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

/* 分钟数 → "X小时Y分"，如 130 → "2小时10分" */
function formatDuration(min) {
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
}

/* 生成 6 位配对码。去掉 0/O、1/I 这类容易看混的字符 */
function genPairCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);   // 浏览器自带的加密级随机数
  for (let i = 0; i < 6; i++) code += chars[arr[i] % chars.length];
  return code;
}

/* ---------- 图片压缩 ----------
 * 手机照片动辄 3-8MB，直接上传又慢又费存储。
 * 用 compressorjs 在前端压到 1280px 宽、60% 质量，约 150-300KB。
 * 用法：const blob = await compressImage(file);
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.6,
      maxWidth: 1280,
      maxHeight: 1280,
      checkOrientation: true,    // 修正 iPhone 照片的旋转问题，必须开
      mimeType: 'image/jpeg',
      success: resolve,
      error: reject,
    });
  });
}
