-- 枚举类型
create type platform_type as enum ('zhubajie', 'proginn');
create type notify_channel_type as enum ('feishu', 'wechat');
create type notification_status as enum ('sent', 'failed');

-- 用户扩展表
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  phone text,
  wechat_id text,
  created_at timestamptz default now() not null,
  last_active_at timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "用户只能查看自己的 profile"
  on profiles for select using (auth.uid() = id);

create policy "用户只能更新自己的 profile"
  on profiles for update using (auth.uid() = id);

create policy "用户可以插入自己的 profile"
  on profiles for insert with check (auth.uid() = id);

-- 自动创建 profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 监控配置表
create table monitor_configs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  platform platform_type not null,
  keywords text[] not null,
  min_budget integer,
  notify_channel notify_channel_type not null,
  notify_target text not null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null
);

alter table monitor_configs enable row level security;

create policy "用户只能查看自己的配置"
  on monitor_configs for select using (auth.uid() = user_id);

create policy "用户只能创建自己的配置"
  on monitor_configs for insert with check (auth.uid() = user_id);

create policy "用户只能更新自己的配置"
  on monitor_configs for update using (auth.uid() = user_id);

create policy "用户只能删除自己的配置"
  on monitor_configs for delete using (auth.uid() = user_id);

-- 限制每个用户最多 3 个配置
create or replace function check_config_limit()
returns trigger as $$
begin
  if (select count(*) from monitor_configs where user_id = new.user_id) >= 3 then
    raise exception '每个用户最多 3 个监控配置';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger enforce_config_limit
  before insert on monitor_configs
  for each row execute procedure check_config_limit();

-- 职位表
create table jobs (
  id uuid default gen_random_uuid() primary key,
  platform platform_type not null,
  external_id text not null,
  title text not null,
  description text,
  budget integer,
  url text not null,
  posted_at timestamptz,
  crawled_at timestamptz default now() not null,
  unique(platform, external_id)
);

-- 爬虫使用 service_role key 写入，无需 RLS
alter table jobs enable row level security;

create policy "所有登录用户可查看职位"
  on jobs for select using (auth.role() = 'authenticated');

-- 推送记录表
create table notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  job_id uuid references jobs(id) on delete cascade not null,
  channel notify_channel_type not null,
  status notification_status not null,
  clicked boolean default false not null,
  sent_at timestamptz default now() not null
);

alter table notifications enable row level security;

create policy "用户只能查看自己的推送记录"
  on notifications for select using (auth.uid() = user_id);

-- 索引
create index idx_jobs_platform_external on jobs(platform, external_id);
create index idx_jobs_crawled_at on jobs(crawled_at desc);
create index idx_monitor_configs_active on monitor_configs(is_active) where is_active = true;
create index idx_notifications_user_sent on notifications(user_id, sent_at desc);
