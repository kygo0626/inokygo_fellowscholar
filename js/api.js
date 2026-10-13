/* ============================================================
 * API 层：所有和 Supabase 的交互都封装在这一个文件里。
 *
 * 好处：
 * 1. 页面组件只管界面，不用关心数据库细节；
 * 2. 以后如果想把后端换成别的云服务，只需要改这一个文件。
 *
 * 约定：函数失败时 throw 异常，页面里用 try/catch 捕获后 showToast。
 *
 * 关于 async/await（和 C++ 最大的思维差异）：
 *   网络请求是"异步"的——发出请求后程序不会停下等结果。
 *   await 的意思是"等这个请求完成再执行下一行"，
 *   看起来和 C++ 顺序执行一样，但页面不会卡死。
 * ============================================================ */

/* ================= 账号 ================= */

/* 注册：创建账号 + 顺便建好自己的资料行 */
async function apiSignUp(email, password, nickname) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('注册失败，请重试');
  // 资料表的 id 必须等于 auth 用户的 id（一对一关系）
  const { error: pErr } = await sb.from('profiles').insert({ id: data.user.id, nickname });
  if (pErr) throw new Error(pErr.message);
  /* 注册成功后主动刷新全局状态并跳去配对页。
     注意：signUp 成功瞬间 onAuthStateChange 也会触发一次加载，
     那时资料行可能还没插入（竞态），所以这里 insert 完成后再加载一次兜底。 */
  await apiLoadMyData();
  navigate('/pair');
}

/* 登录 */
async function apiSignIn(email, password) {
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error('邮箱或密码不对哦');
}

/* 退出登录 */
async function apiSignOut() {
  await sb.auth.signOut();
}

/* ================= 加载自己的数据 ================= */

/* 登录成功后调用：把 我的资料 / 小家 / 伴侣资料 一次性装进 store */
async function apiLoadMyData() {
  // 1. 我的资料（查不到可能是注册竞态：资料行还没插完，等 0.6 秒重试，最多 3 次）
  let profile = null;
  for (let i = 0; i < 3; i++) {
    const { data, error } = await sb
      .from('profiles').select('*').eq('id', store.user.id).maybeSingle();
    if (error) throw new Error(error.message);
    profile = data;
    if (profile) break;
    await new Promise(r => setTimeout(r, 600));
  }
  store.profile = profile;
  store.couple = null;
  store.partner = null;

  // 2. 如果已配对，再查小家和伴侣
  if (profile && profile.couple_id) {
    const { data: couple, error: cErr } = await sb
      .from('couples').select('*').eq('id', profile.couple_id).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    store.couple = couple;

    if (couple) {
      const partnerId = couple.user1_id === store.user.id ? couple.user2_id : couple.user1_id;
      if (partnerId) {
        const { data: partner, error: pErr } = await sb
          .from('profiles').select('*').eq('id', partnerId).maybeSingle();
        if (pErr) throw new Error(pErr.message);
        store.partner = partner;
      }
    }
  }
}

/* ================= 配对 ================= */

/* 创建小家：生成配对码 → 插入 couples → 把自己挂进去 */
async function apiCreateCouple() {
  // 极小概率和别人撞码，撞了就重试，最多 5 次
  for (let i = 0; i < 5; i++) {
    const code = genPairCode();
    const { data, error } = await sb
      .from('couples')
      .insert({ pair_code: code, user1_id: store.user.id })
      .select().single();
    if (error) {
      if (error.code === '23505') continue;   // 23505 = 唯一约束冲突（撞码），重试
      throw new Error(error.message);
    }
    // 把自己的资料行指向这个小家
    const { error: uErr } = await sb
      .from('profiles').update({ couple_id: data.id }).eq('id', store.user.id);
    if (uErr) throw new Error(uErr.message);
    return data;
  }
  throw new Error('生成配对码失败，请再点一次');
}

/* 加入小家：调用数据库函数 join_couple（在 schema.sql 里定义）。
 * 为什么用数据库函数而不是直接查询+更新？
 * 因为安全规则（RLS）不允许你看到别人家的信息——哪怕是为了加入。
 * 数据库函数以管理员权限执行，可以安全地"凭码加入"。 */
async function apiJoinCouple(code) {
  const { error } = await sb.rpc('join_couple', { p_code: code.trim().toUpperCase() });
  if (error) throw new Error(error.message);
}

/* ================= 打卡 ================= */

/* 上传一张凭证图片：先压缩，再传到存储桶，返回可公开访问的 URL */
async function apiUploadImage(file) {
  const blob = await compressImage(file);
  // 路径规则：我的uid/日期/随机名.jpg —— 存储桶的安全规则按第一段路径限权
  const path = `${store.user.id}/${todayStr()}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from('checkin-images').upload(path, blob);
  if (error) throw new Error('图片上传失败：' + error.message);
  const { data } = sb.storage.from('checkin-images').getPublicUrl(path);
  return data.publicUrl;
}

/* 提交今日打卡 */
async function apiSubmitCheckin({ durationMinutes, note, imageUrls }) {
  const { error } = await sb.from('checkins').insert({
    user_id: store.user.id,
    couple_id: store.profile.couple_id,
    checkin_date: todayStr(),
    duration_minutes: durationMinutes,
    note,
    image_urls: imageUrls,
    is_on_time: isBeforeDeadline(),
  });
  if (error) {
    if (error.code === '23505') throw new Error('今天已经打过卡啦');
    throw new Error(error.message);
  }
}

/* 查某一天两个人的打卡记录 */
async function apiFetchDayCheckins(dateStr) {
  const { data, error } = await sb
    .from('checkins').select('*')
    .eq('couple_id', store.profile.couple_id)
    .eq('checkin_date', dateStr)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

/* 查某个月两个人的打卡记录（日历页和首页统计都用它） */
async function apiFetchMonthCheckins(year, month) {
  const first = `${year}-${String(month).padStart(2, '0')}-01`;
  // 下个月 1 号作为区间右端（不含）
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const { data, error } = await sb
    .from('checkins').select('*')
    .eq('couple_id', store.profile.couple_id)
    .gte('checkin_date', first)
    .lt('checkin_date', nextMonth)
    .order('checkin_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

/* 查最近 N 天两个人的打卡记录（首页算连续打卡天数用，覆盖跨月情况） */
async function apiFetchRecentCheckins(days) {
  const since = new Date(shanghaiNow().getTime() - days * 86400000);
  const { data, error } = await sb
    .from('checkins').select('*')
    .eq('couple_id', store.profile.couple_id)
    .gte('checkin_date', toDateStr(since))
    .order('checkin_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

/* ================= 实时同步 ================= */

/* 订阅小家的新打卡：对方打卡成功的瞬间，回调函数就会被调用。
 * 返回订阅对象，页面关闭时要调用退订（见 HomeView 的 onUnmounted）。 */
function apiSubscribeCheckins(onNew) {
  return sb
    .channel('couple-' + store.profile.couple_id)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'checkins',
        filter: `couple_id=eq.${store.profile.couple_id}` },
      (payload) => onNew(payload.new))
    .subscribe();
}

function apiUnsubscribe(channel) {
  if (channel) sb.removeChannel(channel);
}
