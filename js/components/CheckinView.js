/* ============================================================
 * 页面 4：打卡
 * 流程：选图片（本地预览）→ 拖滑块选时长 → 写心得 → 提交
 * 提交时：图片逐张压缩上传 → 拿到 URL 数组 → 写入打卡记录
 * ============================================================ */

const CheckinView = {
  setup() {
    const myToday = Vue.ref(null);       // 今天我的打卡记录（null = 还没打）
    const photos = Vue.ref([]);          // 待上传的图片 { file, previewUrl }
    const duration = Vue.ref(60);        // 学习时长（分钟）
    const note = Vue.ref('');            // 心得
    const busy = Vue.ref(false);
    const uploading = Vue.ref('');       // 上传进度提示

    Vue.onMounted(async () => {
      try {
        const list = await apiFetchDayCheckins(todayStr());
        myToday.value = list.find(r => r.user_id === store.user.id) || null;
      } catch (e) {
        showToast(e.message);
      }
    });

    /* 选中图片：生成本地预览 URL（不消耗流量，图片还在本地） */
    function onPick(e) {
      const files = Array.from(e.target.files);
      for (const f of files) {
        if (photos.value.length >= 3) { showToast('最多上传 3 张'); break; }
        photos.value.push({ file: f, previewUrl: URL.createObjectURL(f) });
      }
      e.target.value = '';   // 清空选择，允许下次再选同一个文件
    }

    function removePhoto(i) {
      URL.revokeObjectURL(photos.value[i].previewUrl);   // 释放本地预览内存
      photos.value.splice(i, 1);
    }

    async function submit() {
      if (!photos.value.length) return showToast('请上传学习凭证图片');
      if (duration.value === 0) return showToast('学习时长不能是 0 哦');

      busy.value = true;
      try {
        // 逐张压缩上传（最多 3 张，串行即可，避免小水管拥堵）
        const urls = [];
        for (let i = 0; i < photos.value.length; i++) {
          uploading.value = `正在上传第 ${i + 1}/${photos.value.length} 张图片…`;
          urls.push(await apiUploadImage(photos.value[i].file));
        }
        uploading.value = '正在保存记录…';
        await apiSubmitCheckin({
          durationMinutes: duration.value,
          note: note.value.trim(),
          imageUrls: urls,
        });
        showToast('打卡成功！继续保持 🎉');
        navigate('/');
      } catch (e) {
        showToast(e.message);
      } finally {
        busy.value = false;
        uploading.value = '';
      }
    }

    /* 点击图片在新标签页看原图（模板表达式里访问不了 window，所以包成方法） */
    function openImg(url) {
      window.open(url);
    }

    return { myToday, photos, duration, note, busy, uploading, onPick, removePhoto, submit, openImg, formatDuration };
  },

  template: `
    <div class="page">
      <!-- 已打卡：展示记录 -->
      <template v-if="myToday">
        <div class="auth-hero">
          <div class="logo">✅</div>
          <h1>今日已打卡</h1>
          <p>{{ myToday.is_on_time ? '在 23:30 前完成，很棒！' : '超时完成，明天早点哦' }}</p>
        </div>
        <div class="card">
          <div class="duration-display">{{ formatDuration(myToday.duration_minutes) }}</div>
          <p class="note" v-if="myToday.note" style="margin:10px 0; line-height:1.7">{{ myToday.note }}</p>
          <div class="photo-grid" style="margin-top:10px">
            <div class="photo-item" v-for="(url, i) in myToday.image_urls" :key="i">
              <img :src="url" @click="openImg(url)">
            </div>
          </div>
        </div>
      </template>

      <!-- 未打卡：打卡表单 -->
      <template v-else>
        <div class="checkin-tip" style="margin-top:16px">
          ⏰ 今日 23:30 前提交算按时打卡，别拖到最后哦
        </div>

        <!-- 学习凭证图片 -->
        <div class="section-title">学习凭证<span class="required">必填，最多 3 张</span></div>
        <div class="card">
          <div class="photo-grid">
            <div class="photo-item" v-for="(p, i) in photos" :key="p.previewUrl">
              <img :src="p.previewUrl">
              <span class="del" @click="removePhoto(i)">×</span>
            </div>
            <!-- label 包着隐藏的 file 输入框，点"+"就能拉起相册/相机 -->
            <label class="photo-add" v-if="photos.length < 3">
              +
              <input type="file" accept="image/*" multiple style="display:none" @change="onPick">
            </label>
          </div>
          <p class="tip" style="margin-top:8px">拍下你的笔记、屏幕或书桌，作为今天的学习凭证</p>
        </div>

        <!-- 学习时长滑块 -->
        <div class="section-title">今天学了多久？</div>
        <div class="card">
          <div class="duration-display">{{ formatDuration(duration) }}</div>
          <input type="range" min="0" max="600" step="15" v-model.number="duration">
          <p class="tip" style="text-align:center">拖动滑块选择，最长 10 小时</p>
        </div>

        <!-- 心得 -->
        <div class="section-title">写给今天的话<span class="required">选填</span></div>
        <div class="card">
          <textarea class="note-input" v-model="note" maxlength="500"
                    placeholder="今天学了什么？有什么收获？"></textarea>
        </div>

        <button class="btn-primary" :disabled="busy" @click="submit">
          {{ busy ? (uploading || '提交中…') : '完成今日打卡' }}
        </button>
      </template>
    </div>
  `,
};
