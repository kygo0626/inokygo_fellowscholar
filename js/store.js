/* ============================================================
 * 全局状态仓库
 *
 * 类比 C++：store 就是一个"全局结构体"，但它是 Vue 的响应式对象——
 * 任何页面读它的属性，属性一变，相关页面会自动重新渲染。
 * 这解决了"登录后所有页面都要知道用户是谁"的问题。
 * ============================================================ */

const store = Vue.reactive({
  ready: false,     // 初始化（恢复登录态）是否完成，完成前显示加载页
  user: null,       // 当前登录用户（Supabase Auth 的用户对象）
  profile: null,    // 我的资料行（昵称、couple_id 等）
  couple: null,     // 我所在的小家（配对信息）
  partner: null,    // 伴侣的资料行
  toast: '',        // 全局提示文字，非空时屏幕上方弹出
});

/* 弹出一条提示，2.2 秒后自动消失 */
let toastTimer = null;
function showToast(msg) {
  store.toast = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { store.toast = ''; }, 2200);
}
