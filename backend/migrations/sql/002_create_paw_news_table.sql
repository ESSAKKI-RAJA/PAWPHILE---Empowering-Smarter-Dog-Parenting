-- Create paw_news table for PAWPHILE articles and educational content
-- This table stores all veterinary articles, seasonal alerts, and care guides

create table public.paw_news (
  id text primary key default 'pn-' || gen_random_uuid()::text,
  title text not null,
  summary text not null,
  content text not null,
  category text not null check (category in ('seasonal', 'breed', 'symptom', 'nutrition', 'recall', 'preventive', 'emergency', 'product')),
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  published_at timestamp with time zone default now(),
  source text not null,
  source_url text,
  image_url text,
  read_time_minutes integer default 5 check (read_time_minutes > 0 and read_time_minutes <= 60),
  
  -- JSON arrays for flexible relationships
  breeds text[] default array[]::text[],
  seasons text[] default array[]::text[],
  tags text[] default array[]::text[],
  
  -- Admin metadata
  created_by uuid references auth.users on delete set null,
  updated_by uuid references auth.users on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Tracking
  view_count integer default 0,
  share_count integer default 0
);

-- Add indexes for efficient queries
create index paw_news_category_idx on public.paw_news(category);
create index paw_news_severity_idx on public.paw_news(severity);
create index paw_news_published_at_idx on public.paw_news(published_at desc);
create index paw_news_created_by_idx on public.paw_news(created_by);
create index paw_news_tags_idx on public.paw_news using gin(tags);
create index paw_news_breeds_idx on public.paw_news using gin(breeds);
create index paw_news_seasons_idx on public.paw_news using gin(seasons);

-- Enable Row Level Security (RLS)
alter table public.paw_news enable row level security;

-- RLS Policies:
-- Anyone can view articles (public read)
create policy "Anyone can view paw_news articles"
  on public.paw_news for select
  using (true);

-- Only admins can create, update, or delete articles
-- This function checks if user has admin role in their metadata
create or replace function public.is_admin(user_id uuid)
returns boolean as $$
begin
  return (select raw_app_meta_data->>'role' = 'admin' from auth.users where id = user_id);
end;
$$ language plpgsql security definer;

create policy "Only admins can create articles"
  on public.paw_news for insert
  with check (public.is_admin(auth.uid()));

create policy "Only admins can update articles"
  on public.paw_news for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Only admins can delete articles"
  on public.paw_news for delete
  using (public.is_admin(auth.uid()));

-- Create trigger to update updated_at timestamp
create or replace function public.update_paw_news_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$ language plpgsql;

create trigger paw_news_updated_at_trigger
  before update on public.paw_news
  for each row
  execute function public.update_paw_news_updated_at();

-- Create trigger to set created_by on insert
create or replace function public.set_paw_news_created_by()
returns trigger as $$
begin
  new.created_by = auth.uid();
  return new;
end;
$$ language plpgsql;

create trigger paw_news_created_by_trigger
  before insert on public.paw_news
  for each row
  execute function public.set_paw_news_created_by();

-- View for getting articles with admin-friendly info
create or replace view public.paw_news_admin as
select
  id,
  title,
  summary,
  category,
  severity,
  published_at,
  source,
  created_by,
  created_at,
  updated_at,
  array_length(tags, 1) as tag_count,
  array_length(breeds, 1) as breed_count,
  array_length(seasons, 1) as season_count,
  view_count,
  share_count
from public.paw_news
order by published_at desc;
