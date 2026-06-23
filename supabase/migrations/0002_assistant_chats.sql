-- Assistant chat history. One row per saved conversation, scoped by user name.
-- (No real auth in this tool — the user's name is the editable identity.)

create table if not exists assistant_chats (
  id         text primary key,
  user_name  text not null default '',
  title      text not null default 'New chat',
  messages   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_chats_user_idx
  on assistant_chats (user_name, updated_at desc);

-- Reuses set_updated_at() from 0001_init.sql.
drop trigger if exists assistant_chats_set_updated_at on assistant_chats;
create trigger assistant_chats_set_updated_at
  before update on assistant_chats
  for each row execute function set_updated_at();

alter table assistant_chats enable row level security;
drop policy if exists "public access" on assistant_chats;
create policy "public access" on assistant_chats for all to anon, authenticated using (true) with check (true);

grant all on assistant_chats to anon, authenticated;
