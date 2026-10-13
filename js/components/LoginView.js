/* ============================================================
 * 页面 1：登录 / 注册
 *
 * Vue 组件的写法（对照 C++ 理解）：
 *   setup()  ≈ 构造函数，返回的变量和函数会暴露给模板
 *   ref(x)   ≈ 一个"被监视的变量"，它的值一变，用到它的 HTML 自动更新
 *   template ≈ 这个页面的 HTML 骨架，{{ }} 处会被替换成变量的值
 * ============================================================ */

const LoginView = {
  setup() {
    const mode = Vue.ref('login');       // 'login' 登录 | 'register' 注册
    const email = Vue.ref('');
    const password = Vue.ref('');
    const nickname = Vue.ref('');        // 仅注册时用
    const busy = Vue.ref(false);         // 提交中禁用按钮，防重复点击

    async function submit() {
      // 基础校验
      if (!email.value.includes('@')) return showToast('邮箱格式不对哦');
      if (password.value.length < 6) return showToast('密码至少 6 位');
      if (mode.value === 'register' && !nickname.value.trim()) return showToast('给自己起个昵称吧');

      busy.value = true;
      try {
        if (mode.value === 'login') {
          await apiSignIn(email.value.trim(), password.value);
        } else {
          await apiSignUp(email.value.trim(), password.value, nickname.value.trim());
          showToast('注册成功，欢迎入住小家');
        }
        // 登录成功后，main.js 里的登录状态监听会自动跳转到下一页，这里不用管
      } catch (e) {
        showToast(e.message);
      } finally {
        busy.value = false;
      }
    }

    function switchMode() {
      mode.value = mode.value === 'login' ? 'register' : 'login';
    }

    return { mode, email, password, nickname, busy, submit, switchMode, APP_TITLE };
  },

  // v-model="email" 的意思是：输入框内容和变量 email 双向绑定（输入即赋值）
  // @click="submit" 的意思：点击时调用 submit 函数（≈ C++ 的按钮回调）
  template: `
    <div class="page">
      <div class="auth-hero">
        <div class="logo">💕</div>
        <h1>{{ APP_TITLE }}</h1>
        <p>互相监督，一起上岸</p>
      </div>

      <div class="card">
        <input class="input" v-model="email" type="email" placeholder="邮箱">
        <input class="input" v-model="password" type="password" placeholder="密码（至少6位）">
        <input class="input" v-if="mode === 'register'" v-model="nickname" placeholder="你的昵称，如：小慧">

        <button class="btn-primary" :disabled="busy" @click="submit">
          {{ busy ? '请稍等…' : (mode === 'login' ? '登 录' : '注 册') }}
        </button>

        <div class="auth-switch" @click="switchMode">
          {{ mode === 'login' ? '没有账号？点我注册' : '已有账号？返回登录' }}
        </div>
      </div>

      <p class="tip" style="text-align:center">
        你们俩各注册一个账号，下一步用配对码组成小家
      </p>
    </div>
  `,
};
