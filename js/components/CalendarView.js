/* ============================================================
 * 页面 5：日历
 * 月历视图查看双方的打卡历史：粉点=我，蓝点=伴侣
 * 点击某天，下方显示当天两人的打卡详情
 * ============================================================ */

const CalendarView = {
  setup() {
    const now = shanghaiNow();
    const year = Vue.ref(now.getFullYear());
    const month = Vue.ref(now.getMonth() + 1);    // JS 月份从 0 开始，转成 1-12
    const records = Vue.ref([]);                  // 当前显示月份的所有打卡
    const selected = Vue.ref(todayStr());         // 选中的日期，默认今天

    async function load() {
      try {
        records.value = await apiFetchMonthCheckins(year.value, month.value);
      } catch (e) {
        showToast(e.message);
      }
    }
    Vue.onMounted(load);
    Vue.watch([year, month], load);   // 切月份时自动重新查询

    /* ---- 日历格子数组 ----
     * 我们的表头从周一开始。JS 的 getDay() 周日=0、周一=1…
     * (getDay() + 6) % 7 换算成：周一=0、周二=1…周日=6，就是前面要空几格 */
    const cells = Vue.computed(() => {
      const firstWeekday = (new Date(year.value, month.value - 1, 1).getDay() + 6) % 7;
      const daysInMonth = new Date(year.value, month.value, 0).getDate();  // 下个月的"0号"=本月最后一天
      const arr = [];
      for (let i = 0; i < firstWeekday; i++) arr.push({ empty: true });
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year.value}-${String(month.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        arr.push({ empty: false, day: d, dateStr });
      }
      return arr;
    });

    /* 日期 → 打卡情况的索引，如 '2026-10-14' → { mine: true, partner: false } */
    const dayMap = Vue.computed(() => {
      const map = {};
      for (const r of records.value) {
        map[r.checkin_date] = map[r.checkin_date] || { mine: false, partner: false };
        if (r.user_id === store.user.id) map[r.checkin_date].mine = true;
        else map[r.checkin_date].partner = true;
      }
      return map;
    });

    /* 选中那天的详细记录（带"是不是我"的标记，模板里用来区分颜色） */
    const selectedRecords = Vue.computed(() =>
      records.value
        .filter(r => r.checkin_date === selected.value)
        .map(r => ({ ...r, isMine: r.user_id === store.user.id }))
    );

    function prevMonth() {
      if (month.value === 1) { year.value--; month.value = 12; }
      else month.value--;
    }
    function nextMonth() {
      if (month.value === 12) { year.value++; month.value = 1; }
      else month.value++;
    }
    function pick(cell) {
      if (!cell.empty) selected.value = cell.dateStr;
    }

    /* 点击图片在新标签页看原图（模板表达式里访问不了 window，所以包成方法） */
    function openImg(url) {
      window.open(url);
    }

    return {
      year, month, cells, dayMap, selected, selectedRecords,
      prevMonth, nextMonth, pick, openImg, store, formatDuration,
      weekdays: ['一', '二', '三', '四', '五', '六', '日'],
    };
  },

  template: `
    <div class="page">
      <div class="section-title" style="margin-top:20px">打卡日历</div>

      <!-- 月历 -->
      <div class="card">
        <div class="calendar-head">
          <button @click="prevMonth">‹</button>
          <span class="month-label">{{ year }} 年 {{ month }} 月</span>
          <button @click="nextMonth">›</button>
        </div>
        <div class="calendar-grid">
          <div class="weekday" v-for="w in weekdays" :key="w">{{ w }}</div>
          <div v-for="(c, i) in cells" :key="i"
               class="day-cell"
               :class="{ empty: c.empty, today: c.dateStr === todayStr(), selected: c.dateStr === selected }"
               @click="pick(c)">
            <template v-if="!c.empty">
              {{ c.day }}
              <span class="day-dots">
                <i v-if="dayMap[c.dateStr]?.mine"></i>
                <i class="partner" v-if="dayMap[c.dateStr]?.partner"></i>
              </span>
            </template>
          </div>
        </div>
        <p class="tip" style="margin-top:10px">粉点 = 我，蓝点 = {{ store.partner?.nickname || 'TA' }}</p>
      </div>

      <!-- 选中日的详情 -->
      <div class="section-title">{{ selected }} 的记录</div>
      <div class="card" v-if="selectedRecords.length">
        <div class="checkin-detail">
          <div class="checkin-item" v-for="r in selectedRecords" :key="r.id"
               :class="{ partner: !r.isMine }">
            <div class="meta">
              {{ r.isMine ? '我' : (store.partner?.nickname || 'TA') }}
              · 学了 {{ formatDuration(r.duration_minutes) }}
              · {{ r.is_on_time ? '按时' : '超时' }}
            </div>
            <div class="note" v-if="r.note">{{ r.note }}</div>
            <div class="imgs" v-if="r.image_urls.length">
              <img v-for="(url, i) in r.image_urls" :key="i" :src="url" @click="openImg(url)">
            </div>
          </div>
        </div>
      </div>
      <div class="card" v-else style="text-align:center; color:var(--text-sub); font-size:14px">
        这一天你们都没有打卡
      </div>
    </div>
  `,
  methods: { todayStr },
};
