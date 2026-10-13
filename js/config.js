/* ============================================================
 * 配置文件 —— 全项目唯一需要你自己填写的地方
 *
 * 去哪里拿这两个值（README 阶段 0 有图文步骤）：
 *   Supabase 后台 → 左下角齿轮 Settings → API
 *   - Project URL        填到下面 SUPABASE_URL
 *   - anon public key    填到下面 SUPABASE_ANON_KEY
 *
 * 安全说明：anon key 公开在前端是 Supabase 的官方设计，
 * 它只相当于"数据库门牌号"，数据安全由数据库的 RLS 规则保证。
 * 注意：绝对不要把 service_role key 填到这里！
 * ============================================================ */

const SUPABASE_URL = 'https://wgqppbqwetipwztalixf.supabase.co';        // 形如 https://abcdefgh.supabase.co
const SUPABASE_ANON_KEY = 'sb_publishable_galYN6el0A0HrVZqQa9KKw_KwCKENQr';  // 形如 eyJhbGciOi... 很长一串

/* 打卡截止时间：晚上 23:30（参考图的规则） */
const DEADLINE_HOUR = 23;
const DEADLINE_MINUTE = 30;

/* 网站标题 */
const APP_TITLE = '我们的上岸小站';
