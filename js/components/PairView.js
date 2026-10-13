/* ============================================================
 * 页面 2：配对（创建小家 / 凭配对码加入）
 *
 * 三种界面状态：
 *   未配对   → 显示两个选择：创建 / 加入
 *   已创建   → 展示配对码，等对方输入加入
 *   已配对   → main.js 会自动把你带去首页，不会停留在这里
 * ============================================================ */

const PairView = {
  setup() {
    const code = Vue.ref('');        // 输入的配对码
    const busy = Vue.ref(false);

    // 我已创建的小家的配对码（还没人加入时展示）
    const myCode = Vue.computed(() =>
      store.couple && !store.couple.user2_id ? store.couple.pair_code : ''
    );

    async function create() {
      busy.value = true;
      try {
        await apiCreateCouple();
        await apiLoadMyData();       // 重新拉取数据，store.couple 就有值了
        showToast('小家创建成功，把配对码发给 TA 吧');
      } catch (e) {
        showToast(e.message);
      } finally {
        busy.value = false;
      }
    }

    async function join() {
      if (code.value.trim().length !== 6) return showToast('配对码是 6 位哦');
      busy.value = true;
      try {
        await apiJoinCouple(code.value);
        await apiLoadMyData();
        showToast('配对成功！');
        // 配对成功后 main.js 的路由守卫会自动跳去首页
      } catch (e) {
        showToast(e.message);
      } finally {
        busy.value = false;
      }
    }

    async function logout() {
      await apiSignOut();
      showToast('已退出登录');
    }

    async function refresh() {
      try {
        await apiLoadMyData();
        showToast('已刷新');
      } catch (e) {
        showToast(e.message);
      }
    }

    return { code, busy, myCode, store, create, join, logout, refresh };
  },

  template: `
    <div class="page">
      <div class="auth-hero">
        <div class="logo">🏠</div>
        <h1>组成你们的小家</h1>
        <p>打卡记录只有你们两个人可见</p>
      </div>

      <!-- 情况一：我已创建小家，正在等对方加入 -->
      <div class="card" v-if="myCode">
        <p class="tip">把这个配对码发给 TA（有效期不限）：</p>
        <div class="pair-code-box">{{ myCode }}</div>
        <button class="btn-outline" @click="refresh">TA 已加入？点我刷新</button>
      </div>

      <!-- 情况二：我还没配对，选择创建或加入 -->
      <template v-else>
        <div class="card">
          <p class="section-title" style="margin-top:0">我是先来的那个</p>
          <button class="btn-primary" :disabled="busy" @click="create">创建我们的小家</button>
        </div>

        <div class="card">
          <p class="section-title" style="margin-top:0">TA 已经建好了</p>
          <input class="input" v-model="code" maxlength="6"
                 placeholder="输入 6 位配对码" style="text-transform:uppercase">
          <button class="btn-primary" :disabled="busy" @click="join">加入小家</button>
        </div>
      </template>

      <div class="auth-switch" @click="logout">退出登录（{{ store.profile?.nickname }}）</div>
    </div>
  `,
};
