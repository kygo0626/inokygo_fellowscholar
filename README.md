# 我们的上岸小站 💕

情侣双人学习打卡网站：每日打卡（图片凭证 + 学习时长 + 心得）、互相实时监督、日历回顾。

技术栈：HTML + CSS + Vue 3（CDN） + Supabase（免费云服务） + GitHub Pages。**零成本。**

---

## 你只需要做两件事

代码已经全部写好。你要做的：

1. **阶段 0（约 20 分钟）**：注册 Supabase，拿到"门牌号"填进 `js/config.js`，执行一段数据库脚本
2. **阶段 6（约 15 分钟）**：把代码推上 GitHub，开启 Pages，两人手机就能访问了

中间如果想在电脑上先预览效果，看【本地预览】一节。

---

## 阶段 0：开通云端数据库（约 20 分钟）

### 0.1 注册并创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com)，点 **Start your project**，用 GitHub 账号登录
2. 点 **New project**：
   - Name 随便起，如 `love-study`
   - Database Password 点 **Generate** 生成一个（复制保存到记事本，以后基本用不到）
   - Region 选 **Singapore**（新加坡，离国内最近）
3. 等 1-2 分钟项目创建完成

### 0.2 创建数据库表（复制粘贴即可）

1. 左侧菜单点 **SQL Editor**（图标像个数据库）→ **New query**
2. 打开本项目里的 `schema.sql`，**全选复制**，粘贴进去，点右下角 **Run**
3. 看到 "Success" 就成功了。左侧 **Table Editor** 里应该能看到 couples、profiles、checkins 三张表

### 0.3 关闭邮箱验证（两人自用，不需要收验证邮件）

1. 左侧菜单 **Authentication** → **Sign In / Providers**
2. 找到 **Email**，把 **Confirm email** 开关**关掉**，保存

### 0.4 拿到配置，填进项目

1. 左侧菜单最下方 **Settings（齿轮）** → **API**
2. 复制两个值，填到 `js/config.js` 里对应位置：
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key（注意是 anon，不是 service_role！）→ `SUPABASE_ANON_KEY`

### 阶段 0 里程碑 ✅

在 Supabase 的 **Table Editor** → checkins 表里手动 Insert 一行假数据试试（user_id / couple_id 随便填个 uuid 格式如 `11111111-1111-1111-1111-111111111111`，checkin_date 填今天，duration_minutes 填 60）。能插进去说明表建好了。（测完可以删掉这行）

> 注：手动插入时如果报 RLS 相关错误，是因为后台编辑器也受安全规则限制，属正常现象，不影响网页端使用——跳过这步直接往下走也可以。

---

## 本地预览（可选，建议做）

**电脑上**：直接双击 `index.html` 用浏览器打开即可。如果页面空白或报错，改用这个稳妥方法：

1. 安装 [VS Code](https://code.visualstudio.com) → 插件市场搜 **Live Server** 安装
2. VS Code 打开 `couple-checkin` 文件夹 → 右键 `index.html` → **Open with Live Server**

**手机上预览（调手机界面很有用）**：手机和电脑连**同一个 WiFi**，Live Server 启动后把地址里的 `127.0.0.1` 换成电脑的局域网 IP（Windows 按 `Win+R` 输入 `cmd` 回车，输入 `ipconfig`，找"IPv4 地址"，形如 `192.168.x.x`），手机浏览器访问 `http://192.168.x.x:5500`。

---

## 阶段 6：部署上线（约 15 分钟）

### 6.1 推送到 GitHub

在 `couple-checkin` 文件夹里打开终端（VS Code 里 `` Ctrl+` `` 或文件夹空白处 Shift+右键 → 终端/PowerShell）：

```bash
git init
git add .
git commit -m "情侣打卡网站第一版"
```

然后去 [github.com/new](https://github.com/new) 建一个仓库（名字如 `love-study`，**Public**），按页面提示关联并推送：

```bash
git remote add origin https://github.com/你的用户名/love-study.git
git branch -M main
git push -u origin main
```

### 6.2 开启 GitHub Pages

1. 仓库页面 → **Settings** → 左侧 **Pages**
2. **Source** 选 **Deploy from a branch**，分支选 **main**，文件夹选 **/(root)**，保存
3. 等 1-2 分钟，刷新页面，顶部会出现你的网址：
   `https://你的用户名.github.io/love-study/`
4. 把这个网址发给你对象，两台手机各自打开 → 注册 → 配对 → 打卡

> GitHub Pages 在国内偶尔抽风打不开。如果遇到，备选方案：注册 [vercel.com](https://vercel.com)（用 GitHub 登录）→ **Add New Project** → 导入这个仓库 →  Deploy，全程零配置。

---

## 使用流程

1. 两人各自打开网址 → 注册（邮箱+密码+昵称）
2. 其中一人点 **创建我们的小家** → 把 6 位配对码发给对方
3. 另一人选 **输入配对码加入**
4. 每天点底部 **✏️ 打卡**：传学习照片、拖时长滑块、写心得，23:30 前提交算按时
5. 首页实时看到对方今天打没打卡（对方提交瞬间你这边自动更新）；日历页回顾历史

---

## 遇到问题先看这里（FAQ）

| 现象 | 原因与解决 |
|---|---|
| 打开就弹"请先在 config.js 里填配置" | 阶段 0.4 没做或填错位置 |
| 注册/登录转圈没反应 | 检查 config.js 的 URL 和 key 是否复制完整（key 很长，别漏）；按 F12 看 Console 红字 |
| 注册提示邮箱格式 | 随便什么邮箱都行，不需要真实（已关闭验证），但要带 @ |
| 配对码报错"不存在" | 检查 6 位码大小写；让对方把配对页截图发你对照 |
| 图片传不上去 | 确认阶段 0.2 的 schema.sql 完整跑过（含存储桶部分）；手机换 WiFi/流量试试 |
| 晚上 8 点后打卡日期错 | 不会错——代码已统一按东八区处理（utils.js） |
| 网站一周没开，突然打不开 | Supabase 免费项目 7 天无活动会休眠，登录 supabase.com 点一下项目即恢复 |

---

## 代码导览（想改哪里看哪里）

| 文件 | 作用 | 里面的注释教什么 |
|---|---|---|
| `index.html` | 唯一的网页骨架 | CDN 引入、viewport 手机适配 |
| `css/style.css` | 全部样式 | 盒模型、Flexbox、CSS 变量 |
| `js/config.js` | **唯一要填的配置** | — |
| `js/utils.js` | 日期/倒计时/压缩 | 东八区时区坑、Promise |
| `js/store.js` | 全局状态 | Vue 响应式 ≈ "数据变→界面自动变" |
| `js/api.js` | 所有后端交互 | async/await、数据库增删改查 |
| `js/components/*.js` | 5 个页面 | Vue 模板语法 `v-if` `v-for` `@click` |
| `js/main.js` | 启动 + 路由守卫 | 登录状态监听、单页应用原理 |
| `schema.sql` | 数据库表 + 安全规则 | 表设计、RLS 行级安全 |

## 后续可以加的玩法（表结构已预留字段）

- 积分系统：按时打卡 +5 分，积分换奖励（商城）
- 连续打卡加成、补卡机制
- 打卡成功撒花动效、对方打卡推送提醒
- PWA：把网站"添加到主屏幕"，像 App 一样有图标
