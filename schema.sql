-- ============================================================
-- 情侣学习打卡网站 · 数据库初始化脚本
-- 用法：Supabase 后台 → SQL Editor → 新建查询 → 粘贴全部 → 运行
-- ============================================================

-- 1. 情侣配对表 ------------------------------------------------
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  pair_code text unique not null,            -- 6位配对码，如 "A3K9Z2"
  user1_id uuid not null references auth.users(id),
  user2_id uuid references auth.users(id),   -- 空 = 等待伴侣加入
  created_at timestamptz not null default now()
);

-- 2. 用户资料扩展表（auth.users 是系统表不能加列，另建一张） ----
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '同学',
  couple_id uuid references public.couples(id),  -- null = 未配对
  points int not null default 0,                  -- 积分（迭代预留）
  streak int not null default 0,                  -- 连续打卡天数（迭代预留）
  created_at timestamptz not null default now()
);

-- 3. 打卡记录表 -------------------------------------------------
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  couple_id uuid not null references public.couples(id),
  checkin_date date not null,                     -- 东八区当天，前端传入
  duration_minutes int not null check (duration_minutes between 0 and 600),
  note text not null default '',
  image_urls text[] not null default '{}',        -- 图片URL数组，最多3张
  is_on_time boolean not null default false,      -- 23:30 前提交
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)                  -- 每人每天只能打一次卡
);

-- 4. 开启 RLS（行级安全）----------------------------------------
-- anon key 是公开在前端代码里的（官方设计），安全完全靠这些规则：
-- 你只能读写自己和伴侣的数据。
alter table public.couples  enable row level security;
alter table public.profiles enable row level security;
alter table public.checkins enable row level security;

-- couples：两名成员可读；本人可创建；空位允许伴侣加入
create policy "couple members can read" on public.couples
  for select to authenticated
  using (user1_id = auth.uid() or user2_id = auth.uid());

create policy "user can create own couple" on public.couples
  for insert to authenticated
  with check (user1_id = auth.uid());

create policy "couple members can update" on public.couples
  for update to authenticated
  using (user1_id = auth.uid() or user2_id = auth.uid())
  with check (user1_id = auth.uid() or user2_id = auth.uid());

-- 2.1 凭配对码加入小家的数据库函数 ------------------------------
-- 为什么需要它：上面的安全规则不允许你"查看到别人家的配对行"，
-- 但加入小家时恰恰需要按配对码找到它。这个函数以管理员权限
-- 执行（security definer），把"凭码加入"这一步安全地包起来。
create or replace function public.join_couple(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_couple public.couples%rowtype;
begin
  -- 我已经有家了就不能再加入别人
  if exists (select 1 from public.profiles where id = auth.uid() and couple_id is not null) then
    raise exception '你已经加入过小家啦';
  end if;

  select * into v_Couple from public.couples
  where pair_code = upper(trim(p_code)) for update;

  if not found then
    raise exception '配对码不存在，检查一下有没有输错';
  end if;
  if v_Couple.user1_id = auth.uid() then
    raise exception '不能和自己配对哦';
  end if;
  if v_Couple.user2_id is not null then
    raise exception '这个小家已经满员啦';
  end if;

  update public.couples set user2_id = auth.uid() where id = v_Couple.id;
  update public.profiles set couple_id = v_Couple.id where id = auth.uid();
  return v_Couple.id;
end;
$$;

-- profiles：看自己 + 看伴侣（通过 couples 找伴侣 id）
create policy "read self and partner profile" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or id in (
      select case when user1_id = auth.uid() then user2_id else user1_id end
      from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "insert own profile" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- checkins：读 = 自己或伴侣的；写 = 只能写/改/删自己的
create policy "read couple checkins" on public.checkins
  for select to authenticated
  using (
    user_id = auth.uid()
    or user_id in (
      select case when user1_id = auth.uid() then user2_id else user1_id end
      from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "insert own checkin" on public.checkins
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "update own checkin" on public.checkins
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "delete own checkin" on public.checkins
  for delete to authenticated
  using (user_id = auth.uid());

-- 5. 图片存储桶（打卡凭证）---------------------------------------
-- 公开桶：图片 URL 可直接 <img> 显示；文件名含随机 uuid 无法被猜测遍历
insert into storage.buckets (id, name, public)
values ('checkin-images', 'checkin-images', true);

-- 任何人可看图片（配合 RLS，URL 本身已在打卡记录里受保护）
create policy "public read checkin images" on storage.objects
  for select
  using (bucket_id = 'checkin-images');

-- 只能上传到自己 uid 开头的目录（如 "用户uuid/2026-10-14/xxx.jpg"）
create policy "users upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'checkin-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 只能删自己的图片
create policy "users delete own images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'checkin-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
