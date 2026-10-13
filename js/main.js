/* ============================================================
 * 启动文件：整个应用的入口
 *
 * 它做三件事：
 * 1. 定义根组件（决定当前显示哪个页面 + 底部导航 + 全局提示）
 * 2. 监听登录状态：打开网页时自动恢复登录；登录/退出时更新全局状态
 * 3. 路由守卫：没登录只能看登录页，没配对只能看配对页
 * ============================================================ */

const App = {
  setup() {
    /* 当前路由（响应式）：网址 # 变化时更新 */
    const route = Vue.ref(currentRoute());
    window.addEventListener('hashchange', () => {
      route.value = currentRoute();
      guard();
    });

    /* 路由 → 页面组件 的对照表 */
    const viewMap = {
      '/login': LoginView,
      '/pair': PairView,
      '/': HomeView,
      '/checkin': CheckinView,
      '/calendar': CalendarView,
    };
    const currentView = Vue.computed(() => viewMap[route.value] || HomeView);

    /* 底部导航只在"已登录 + 已配对 + 主页面"时显示 */
    const showTabbar = Vue.computed(() =>
      store.ready && store.user && store.profile && store.profile.couple_id
      && ['/', '/checkin', '/calendar'].includes(route.value)
    );

    /* 路由守卫：检查"当前用户有没有资格看当前页面" */
    function guard() {
      if (!store.ready) return;                          // 还没初始化完，不动
      if (!store.user) {                                 // 没登录 → 只能去登录页
        if (route.value !== '/login') navigate('/login');
        return;
      }
      if (!store.profile) return;                        // 资料还在加载，等下一次
      if (!store.profile.couple_id) {                    // 没配对 → 只能去配对页
        if (route.value !== '/pair') navigate('/pair');
        return;
      }
      if (route.value === '/login' || route.value === '/pair') {
        navigate('/');                                   // 已配对还去登录页 → 拉回首页
      }
    }

    Vue.onMounted(() => {
      /* 监听登录状态。这个回调会在三种时候触发：
         ① 打开网页时（恢复上次登录，事件名 INITIAL_SESSION）
         ② 登录/注册成功时（SIGNED_IN）
         ③ 退出登录时（SIGNED_OUT） */
      sb.auth.onAuthStateChange(async (event, session) => {
        store.user = session && session.user ? session.user : null;
        if (store.user) {
          try {
            await apiLoadMyData();       // 拉取 我的资料/小家/伴侣 进全局状态
          } catch (e) {
            showToast(e.message);
          }
        } else {
          store.profile = null;
          store.couple = null;
          store.partner = null;
        }
        store.ready = true;
        guard();
      });
    });

    return { store, route, currentView, showTabbar };
  },

  /* <component :is="currentView"> 是 Vue 的动态组件：is 指向谁，就渲染谁 */
  template: `
    <div v-if="!store.ready" class="loading-wrap">加载中…</div>
    <template v-else>
      <component :is="currentView"></component>
      <nav class="tabbar" v-if="showTabbar">
        <a href="#/" :class="{ active: route === '/' }">
          <span class="ico">🏠</span>首页
        </a>
        <a href="#/checkin" :class="{ active: route === '/checkin' }">
          <span class="ico">✏️</span>打卡
        </a>
        <a href="#/calendar" :class="{ active: route === '/calendar' }">
          <span class="ico">📅</span>日历
        </a>
      </nav>
    </template>
    <div class="toast" v-if="store.toast">{{ store.toast }}</div>
  `,
};

/* 创建应用并挂载到 index.html 里的 <div id="app"> */
Vue.createApp(App).mount('#app');
