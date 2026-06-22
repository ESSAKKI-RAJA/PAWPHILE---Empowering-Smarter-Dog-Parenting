-- Create fcm_tokens table for Firebase Cloud Messaging tokens
-- This table stores FCM tokens for each user device to enable push notifications

create table public.fcm_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  token text not null unique,
  device_info jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_used_at timestamp with time zone,
  
  -- Indexes for efficient queries
  unique(user_id, token)
);

-- Add index for user lookups
create index fcm_tokens_user_id_idx on public.fcm_tokens(user_id);
create index fcm_tokens_is_active_idx on public.fcm_tokens(is_active);

-- Enable Row Level Security (RLS)
alter table public.fcm_tokens enable row level security;

-- RLS Policies:
-- Users can only manage their own tokens
create policy "Users can view their own FCM tokens"
  on public.fcm_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert their own FCM tokens"
  on public.fcm_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own FCM tokens"
  on public.fcm_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own FCM tokens"
  on public.fcm_tokens for delete
  using (auth.uid() = user_id);

-- Service role can query all tokens (for sending notifications)
-- This is handled separately in edge functions with service role

-- Create trigger to update updated_at timestamp
create or replace function public.update_fcm_tokens_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger fcm_tokens_updated_at_trigger
  before update on public.fcm_tokens
  for each row
  execute function public.update_fcm_tokens_updated_at();
