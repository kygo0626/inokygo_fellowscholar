/* ============================================================
 * 创建 Supabase 客户端（全项目唯一的连接实例）
 *
 * 类比 C++：sb 就像一个全局的"数据库句柄"，
 * 之后所有和云端的交互都通过它：sb.auth / sb.from() / sb.storage
 * ============================================================ */

if (SUPABASE_URL.includes('在这里') || SUPABASE_ANON_KEY.includes('在这里')) {
  // 还没填配置时给出明显提示，而不是报一串看不懂的错误
  alert('请先在 js/config.js 里填入你的 Supabase 项目 URL 和 anon key！\n\n获取方式见 README.md 的阶段 0。');
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
