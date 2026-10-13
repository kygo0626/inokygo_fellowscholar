/* ============================================================
 * 页面 3：首页
 * 展示：问候语、倒计时、统计卡片、今天我和对方的打卡状态
 * 亮点：订阅了数据库实时推送——对方打卡的瞬间，这里自动刷新
 * ============================================================ */

const HomeView = {
  setup() {
    const todayList = Vue.ref([]);      // 今天两人的打卡记录
    const recentList = Vue.ref([]);     // 最近 90 天记录（算连续天数和月度统计）
    const countdown = Vue.ref(deadlineCountdown());
    let channel = null;                 // 实时订阅句柄
    let timer = null;                   // 倒计时定时器

    /* ---- 拉取数据 ---- */
    async function load() {
      try {
        todayList.value = await apiFetchDayCheckins(todayStr());
        recentList.value = await apiFetchRecentCheckins(90);
      } catch (e) {
        showToast(e.message);
      }
    }

    /* ---- 今日状态 ---- */
    const myToday = Vue.computed(() =>
      todayList.value.find(r => r.user_id === store.user.id));
    const partnerToday = Vue.computed(() =>
      store.partner && todayList.value.find(r => r.user_id === store.partner.id));

    /* ---- 统计：连续打卡天数 ----
     * 思路：从今天（或昨天，如果今天还没打）往前一天天数，
     * 哪天断了就停。今天还没打卡不算断——今天还有机会。 */
    const myStreak = Vue.computed(() => {
      const myDates = new Set(
        recentList.value.filter(r => r.user_id === store.user.id).map(r => r.checkin_date)
      );
      let streak = 0;
      let cursor = shanghaiNow();
      if (!myDates.has(toDateStr(cursor))) cursor = new Date(cursor.getTime() - 86400000);
      while (myDates.has(toDateStr(cursor))) {
        streak++;
        cursor = new Date(cursor.getTime() - 86400000);
      }
      return streak;
    });

    /* 统计：本月两人总打卡次数 */
    const monthCount = Vue.computed(() => {
      const prefix = todayStr().slice(0, 7);   // 'YYYY-MM'
      return recentList.value.filter(r => r.checkin_date.startsWith(prefix)).length;
    });

    /* 在一起的天数：从小家创建那天算起 */
    const togetherDays = Vue.computed(() => {
      if (!store.couple) return 0;
      const from = new Date(store.couple.created_at).getTime();
      return Math.max(1, Math.floor((Date.now() - from) / 86400000) + 1);
    });

    /* 截止时间文字，如 "23:30" */
    const deadlineText = `${String(DEADLINE_HOUR).padStart(2, '0')}:${String(DEADLINE_MINUTE).padStart(2, '0')}`;

    /* ---- 生命周期：进入页面时 ---- */
    Vue.onMounted(() => {
      load();
      // 1. 订阅对方的新打卡：收到推送就插进列表并弹提示
      channel = apiSubscribeCheckins((row) => {
        todayList.value.push(row);
        recentList.value.unshift(row);
        if (row.user_id !== store.user.id) {
          showToast(`${store.partner?.nickname || 'TA'} 刚刚打卡啦 🎉`);
        }
      });
      // 2. 倒计时每 30 秒刷新一次
      timer = setInterval(() => { countdown.value = deadlineCountdown(); }, 30000);
      // 3. 手机切回前台时重新拉一次（Realtime 在后台可能断线，这是兜底）
      document.addEventListener('visibilitychange', onVisible);
    });
    function onVisible() {
      if (!document.hidden) load();
    }

    /* ---- 生命周期：离开页面时（必须清理，否则定时器/订阅会泄漏） ---- */
    Vue.onUnmounted(() => {
      apiUnsubscribe(channel);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    });

    return {
      store, countdown, myToday, partnerToday, myStreak, monthCount,
      togetherDays, deadlineText, greeting, formatDuration, navigate,
      bannerUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cute%20couple%20studying%20together%20at%20a%20cozy%20desk%2C%20books%20and%20laptop%2C%20warm%20pink%20romantic%20illustration%2C%20soft%20gradient%20background%2C%20floating%20hearts%2C%20anime%20style&image_size=landscape_16_9',
    };
  },

  template: `
    <div class="page">
      <div class="home-greeting">
        <h2>{{ greeting() }}，{{ store.profile?.nickname }} ❤</h2>
        <p>和 {{ store.partner?.nickname || 'TA' }} 一起上岸的第 {{ togetherDays }} 天</p>
      </div>

      <!-- 插画横幅 + 截止倒计时 -->
      <div class="banner">
        <img :src="bannerUrl" alt="一起学习">
        <div class="deadline-tag">
          今日截止 {{ deadlineText }}
          <strong>{{ countdown }}</strong>
        </div>
      </div>

      <!-- 三格统计 -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="icon">🔥</div>
          <div class="num">{{ myStreak }}</div>
          <div class="label">连续打卡</div>
        </div>
        <div class="stat-card">
          <div class="icon">⏱️</div>
          <div class="num">{{ myToday ? myToday.duration_minutes : 0 }}</div>
          <div class="label">今日分钟</div>
        </div>
        <div class="stat-card">
          <div class="icon">📚</div>
          <div class="num">{{ monthCount }}</div>
          <div class="label">本月打卡</div>
        </div>
      </div>

      <!-- 今日双方状态 -->
      <div class="card">
        <div class="today-status">
          <div class="status-col" :class="{ done: !!myToday }">
            <div class="who">我</div>
            <div class="state">{{ myToday ? '✅ 已打卡 ' + formatDuration(myToday.duration_minutes) : '还没打卡' }}</div>
          </div>
          <div class="status-col" :class="{ done: !!partnerToday }">
            <div class="who">{{ store.partner?.nickname || 'TA' }}</div>
            <div class="state">
              {{ store.partner
                 ? (partnerToday ? '✅ 已打卡 ' + formatDuration(partnerToday.duration_minutes) : '还没打卡')
                 : '等待加入' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 打卡入口大按钮 -->
      <button class="btn-primary" v-if="!myToday" @click="navigate('/checkin')">
        上传今日学习记录
      </button>
      <div class="card" v-else style="text-align:center; color:var(--text-sub); font-size:14px">
        今天已完成打卡，去日历看看彼此的记录吧 💪
      </div>
    </div>
  `,
};
