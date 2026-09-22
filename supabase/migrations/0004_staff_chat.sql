-- =============================================================================
-- 0004_staff_chat.sql — Staff-to-staff messaging (direct + group chats, @mentions, invites)
--
-- Who can use it: every staff role (super_admin, principal, deputy_principal, hod, teacher, bursar,
-- librarian, support_staff) — i.e. any non-parent account whose profile is active.
-- Scope: a person can only see/tag staff in the SAME school. A profile with no school (e.g. a
-- platform-level super_admin) forms its own workspace and only sees other school-less staff.
--
-- Security model: the browser can only READ these tables (row level security). Every write goes
-- through the SECURITY DEFINER functions below, which check who is calling. So a user cannot forge
-- the sender of a message, add themselves to a chat, or read history they were not given.
--
-- Tagging (@mention) someone who is NOT in a group creates a pending invite; they get notified,
-- cannot read the chat until they accept, and then see the conversation from the tagged message onward.
--
-- Timestamps that decide who can read what (message time, visible_from, last_read_at) use clock_timestamp(),
-- not now(), so ordering is exact even when several calls happen inside one transaction.
--
-- Idempotent — safe to re-run. Rollback block at the bottom.
-- =============================================================================

-- 1. Tables -------------------------------------------------------------------
create table if not exists public.staff_chat_conversations (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid references public.schools(id) on delete cascade,   -- null = platform-level workspace
  kind            text not null check (kind in ('direct', 'group')),
  title           text,
  created_by      uuid references public.profiles(id) on delete set null,
  direct_key      text unique,                                             -- "<smaller uuid>:<larger uuid>" for direct chats
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  constraint staff_chat_group_needs_title check (kind <> 'group' or length(btrim(coalesce(title, ''))) between 1 and 80),
  constraint staff_chat_direct_needs_key  check (kind <> 'direct' or direct_key is not null)
);

create table if not exists public.staff_chat_members (
  conversation_id uuid not null references public.staff_chat_conversations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  member_role     text not null default 'member' check (member_role in ('admin', 'member')),
  visible_from    timestamptz not null default clock_timestamp(),   -- a member never sees messages older than this
  last_read_at    timestamptz not null default clock_timestamp(),
  added_by        uuid references public.profiles(id) on delete set null,
  joined_at       timestamptz not null default clock_timestamp(),
  primary key (conversation_id, profile_id)
);
create index if not exists staff_chat_members_profile_idx on public.staff_chat_members (profile_id);

create table if not exists public.staff_chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.staff_chat_conversations(id) on delete cascade,
  school_id       uuid,
  sender_id       uuid references public.profiles(id) on delete set null,  -- null only if the account was deleted
  body            text not null check (length(btrim(body)) between 1 and 4000),
  created_at      timestamptz not null default clock_timestamp()
);
create index if not exists staff_chat_messages_conv_idx on public.staff_chat_messages (conversation_id, created_at desc);

create table if not exists public.staff_chat_mentions (
  message_id      uuid not null references public.staff_chat_messages(id) on delete cascade,
  conversation_id uuid not null references public.staff_chat_conversations(id) on delete cascade,
  mentioned_id    uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (message_id, mentioned_id)
);
create index if not exists staff_chat_mentions_person_idx on public.staff_chat_mentions (mentioned_id, created_at desc);

create table if not exists public.staff_chat_invites (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.staff_chat_conversations(id) on delete cascade,
  invitee_id      uuid not null references public.profiles(id) on delete cascade,
  invited_by      uuid references public.profiles(id) on delete set null,
  message_id      uuid references public.staff_chat_messages(id) on delete set null,
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at      timestamptz not null default now(),
  responded_at    timestamptz,
  unique (conversation_id, invitee_id)
);
create index if not exists staff_chat_invites_invitee_idx on public.staff_chat_invites (invitee_id, status);

-- 2. Helper functions (definer, so policies can consult membership without recursion) --------
create or replace function public.chat_caller()
returns public.profiles
language plpgsql stable security definer set search_path to 'public'
as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found or p.role = 'parent' or coalesce(p.account_status, 'active') <> 'active' then
    raise exception 'Staff chat is only available to active staff accounts' using errcode = '42501';
  end if;
  return p;
end $$;

-- Is this person an active staff member of the given workspace (school)?
create or replace function public.chat_eligible(p_id uuid, p_school uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles pr
    where pr.id = p_id
      and pr.role <> 'parent'
      and coalesce(pr.account_status, 'active') = 'active'
      and pr.school_id is not distinct from p_school
      and not exists (select 1 from public.staff s where s.id = pr.staff_id and s.status = 'Inactive')
  );
$$;

create or replace function public.chat_is_member(p_conv uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (select 1 from public.staff_chat_members m where m.conversation_id = p_conv and m.profile_id = auth.uid());
$$;

create or replace function public.chat_can_read(p_conv uuid, p_at timestamptz)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
    select 1 from public.staff_chat_members m
    where m.conversation_id = p_conv and m.profile_id = auth.uid() and m.visible_from <= p_at
  );
$$;

-- 3. Row level security: read-only from the browser ------------------------------------------
alter table public.staff_chat_conversations enable row level security;
alter table public.staff_chat_members       enable row level security;
alter table public.staff_chat_messages      enable row level security;
alter table public.staff_chat_mentions      enable row level security;
alter table public.staff_chat_invites       enable row level security;

drop policy if exists "chat members read conversation" on public.staff_chat_conversations;
create policy "chat members read conversation" on public.staff_chat_conversations for select
  using (public.chat_is_member(id));

drop policy if exists "chat members read membership" on public.staff_chat_members;
create policy "chat members read membership" on public.staff_chat_members for select
  using (public.chat_is_member(conversation_id));

drop policy if exists "chat members read visible messages" on public.staff_chat_messages;
create policy "chat members read visible messages" on public.staff_chat_messages for select
  using (public.chat_can_read(conversation_id, created_at));

drop policy if exists "chat people read own mentions" on public.staff_chat_mentions;
create policy "chat people read own mentions" on public.staff_chat_mentions for select
  using (mentioned_id = auth.uid());

drop policy if exists "chat people read own invites" on public.staff_chat_invites;
create policy "chat people read own invites" on public.staff_chat_invites for select
  using (invitee_id = auth.uid());

-- No INSERT/UPDATE/DELETE for the browser at all — only the functions below can write.
revoke all on public.staff_chat_conversations, public.staff_chat_members, public.staff_chat_messages,
              public.staff_chat_mentions, public.staff_chat_invites from anon, authenticated;
grant select on public.staff_chat_conversations, public.staff_chat_members, public.staff_chat_messages,
                public.staff_chat_mentions, public.staff_chat_invites to authenticated;

-- 4. Functions the app calls -------------------------------------------------------------------

-- Everyone I can chat with / tag (same school, staff only).
create or replace function public.staff_chat_directory()
returns table (id uuid, first_name text, last_name text, role text, photo_url text, department text, active boolean, is_me boolean)
language plpgsql stable security definer set search_path to 'public'
as $$
#variable_conflict use_column
declare me public.profiles;
begin
  me := public.chat_caller();
  return query
    select pr.id, coalesce(pr.first_name, ''), coalesce(pr.last_name, ''), pr.role::text, pr.photo_url, s.department,
           (coalesce(pr.account_status, 'active') = 'active' and coalesce(s.status, 'Active') <> 'Inactive'),
           pr.id = me.id
    from public.profiles pr
    left join public.staff s on s.id = pr.staff_id
    where pr.role <> 'parent' and pr.school_id is not distinct from me.school_id
    order by pr.first_name, pr.last_name;
end $$;

create or replace function public.staff_chat_create_direct(p_other uuid)
returns uuid
language plpgsql security definer set search_path to 'public'
as $$
declare me public.profiles; v_key text; v_id uuid;
begin
  me := public.chat_caller();
  if p_other is null or p_other = me.id then raise exception 'Choose someone else to chat with'; end if;
  if not public.chat_eligible(p_other, me.school_id) then raise exception 'That person is not available for chat'; end if;

  v_key := least(me.id::text, p_other::text) || ':' || greatest(me.id::text, p_other::text);
  select id into v_id from public.staff_chat_conversations where direct_key = v_key;
  if v_id is null then
    insert into public.staff_chat_conversations (school_id, kind, created_by, direct_key)
      values (me.school_id, 'direct', me.id, v_key)
      on conflict (direct_key) do nothing
      returning id into v_id;
    if v_id is null then
      select id into v_id from public.staff_chat_conversations where direct_key = v_key;   -- lost a race, reuse
    else
      insert into public.staff_chat_members (conversation_id, profile_id, member_role, added_by)
        values (v_id, me.id, 'member', me.id), (v_id, p_other, 'member', me.id);
    end if;
  end if;
  return v_id;
end $$;

create or replace function public.staff_chat_create_group(p_title text, p_members uuid[])
returns uuid
language plpgsql security definer set search_path to 'public'
as $$
declare me public.profiles; v_id uuid; v_title text := btrim(coalesce(p_title, '')); v_m uuid; v_ids uuid[];
begin
  me := public.chat_caller();
  if length(v_title) < 1 or length(v_title) > 80 then raise exception 'Give the group a name (up to 80 characters)'; end if;
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_members, '{}')) x where x <> me.id;
  if coalesce(array_length(v_ids, 1), 0) > 200 then raise exception 'A group can start with at most 200 people'; end if;
  foreach v_m in array v_ids loop
    if not public.chat_eligible(v_m, me.school_id) then raise exception 'One or more people are not available for chat'; end if;
  end loop;

  insert into public.staff_chat_conversations (school_id, kind, title, created_by)
    values (me.school_id, 'group', v_title, me.id) returning id into v_id;
  insert into public.staff_chat_members (conversation_id, profile_id, member_role, added_by) values (v_id, me.id, 'admin', me.id);
  foreach v_m in array v_ids loop
    insert into public.staff_chat_members (conversation_id, profile_id, member_role, added_by) values (v_id, v_m, 'member', me.id);
  end loop;
  return v_id;
end $$;

create or replace function public.staff_chat_add_members(p_conv uuid, p_members uuid[], p_share_history boolean default false)
returns integer
language plpgsql security definer set search_path to 'public'
as $$
declare me public.profiles; c public.staff_chat_conversations; v_m uuid; v_n int := 0; v_from timestamptz;
begin
  me := public.chat_caller();
  select * into c from public.staff_chat_conversations where id = p_conv;
  if not found or c.kind <> 'group' then raise exception 'Group not found'; end if;
  if not exists (select 1 from public.staff_chat_members where conversation_id = p_conv and profile_id = me.id and member_role = 'admin') then
    raise exception 'Only group admins can add people' using errcode = '42501';
  end if;
  v_from := case when p_share_history then c.created_at else clock_timestamp() end;
  foreach v_m in array coalesce(p_members, '{}') loop
    if not public.chat_eligible(v_m, c.school_id) then continue; end if;
    insert into public.staff_chat_members (conversation_id, profile_id, visible_from, added_by)
      values (p_conv, v_m, v_from, me.id) on conflict do nothing;
    if found then
      v_n := v_n + 1;
      update public.staff_chat_invites set status = 'accepted', responded_at = now()
        where conversation_id = p_conv and invitee_id = v_m and status = 'pending';
    end if;
  end loop;
  return v_n;
end $$;

create or replace function public.staff_chat_rename(p_conv uuid, p_title text)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare me public.profiles; v_title text := btrim(coalesce(p_title, ''));
begin
  me := public.chat_caller();
  if length(v_title) < 1 or length(v_title) > 80 then raise exception 'Give the group a name (up to 80 characters)'; end if;
  if not exists (select 1 from public.staff_chat_conversations c join public.staff_chat_members m on m.conversation_id = c.id
                 where c.id = p_conv and c.kind = 'group' and m.profile_id = me.id and m.member_role = 'admin') then
    raise exception 'Only group admins can rename the group' using errcode = '42501';
  end if;
  update public.staff_chat_conversations set title = v_title where id = p_conv;
end $$;

create or replace function public.staff_chat_leave(p_conv uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $$
declare me public.profiles; c public.staff_chat_conversations; v_next uuid;
begin
  me := public.chat_caller();
  select * into c from public.staff_chat_conversations where id = p_conv;
  if not found or not public.chat_is_member(p_conv) then raise exception 'Chat not found'; end if;
  if c.kind <> 'group' then raise exception 'You can only leave group chats'; end if;

  delete from public.staff_chat_members where conversation_id = p_conv and profile_id = me.id;

  if not exists (select 1 from public.staff_chat_members where conversation_id = p_conv) then
    delete from public.staff_chat_conversations where id = p_conv;       -- nobody left
  elsif not exists (select 1 from public.staff_chat_members where conversation_id = p_conv and member_role = 'admin') then
    select profile_id into v_next from public.staff_chat_members where conversation_id = p_conv order by joined_at limit 1;
    update public.staff_chat_members set member_role = 'admin' where conversation_id = p_conv and profile_id = v_next;
  end if;
end $$;

-- Send a message. Mentions are written into the text as  @[Name](profile-uuid)  and extracted here,
-- on the server, so they cannot be spoofed separately from what was actually written.
create or replace function public.staff_chat_send(p_conv uuid, p_body text)
returns table (id uuid, created_at timestamptz)
language plpgsql security definer set search_path to 'public'
as $$
#variable_conflict use_column
declare
  me public.profiles; c public.staff_chat_conversations; v_body text := btrim(coalesce(p_body, ''));
  v_msg uuid; v_at timestamptz; v_pid uuid; v_is_member boolean;
begin
  me := public.chat_caller();
  if length(v_body) < 1 or length(v_body) > 4000 then raise exception 'A message must be between 1 and 4000 characters'; end if;
  select * into c from public.staff_chat_conversations where staff_chat_conversations.id = p_conv;
  if not found or not public.chat_is_member(p_conv) then raise exception 'You are not in this chat' using errcode = '42501'; end if;

  insert into public.staff_chat_messages (conversation_id, school_id, sender_id, body)
    values (p_conv, c.school_id, me.id, v_body) returning staff_chat_messages.id, staff_chat_messages.created_at into v_msg, v_at;
  update public.staff_chat_conversations set last_message_at = v_at where staff_chat_conversations.id = p_conv;
  update public.staff_chat_members set last_read_at = v_at where conversation_id = p_conv and profile_id = me.id;

  for v_pid in
    select distinct x[1]::uuid
    from regexp_matches(v_body, '@\[[^\]]{1,80}\]\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)', 'g') as x
    limit 20
  loop
    continue when v_pid = me.id;
    continue when not public.chat_eligible(v_pid, c.school_id);      -- other school / parent / inactive: ignored
    insert into public.staff_chat_mentions (message_id, conversation_id, mentioned_id) values (v_msg, p_conv, v_pid) on conflict do nothing;

    select exists (select 1 from public.staff_chat_members m where m.conversation_id = p_conv and m.profile_id = v_pid) into v_is_member;
    if not v_is_member and c.kind = 'group' then
      -- Not in the chat yet: invite them (a re-tag re-opens a declined/finished invite; a pending one keeps its first message).
      insert into public.staff_chat_invites (conversation_id, invitee_id, invited_by, message_id)
        values (p_conv, v_pid, me.id, v_msg)
        on conflict (conversation_id, invitee_id) do update
          set status = 'pending', invited_by = excluded.invited_by, message_id = excluded.message_id, created_at = now(), responded_at = null
          where public.staff_chat_invites.status <> 'pending';
    end if;
  end loop;

  return query select v_msg, v_at;
end $$;

create or replace function public.staff_chat_mark_read(p_conv uuid)
returns void
language plpgsql security definer set search_path to 'public'
as $$
begin
  perform public.chat_caller();
  update public.staff_chat_members set last_read_at = clock_timestamp() where conversation_id = p_conv and profile_id = auth.uid();
end $$;

-- My chat list, with unread counts and a preview, in one round trip.
create or replace function public.staff_chat_conversations()
returns table (
  id uuid, kind text, title text, last_message_at timestamptz, created_at timestamptz, member_count integer,
  unread_count integer, unread_mentions integer, last_body text, last_sender_id uuid, last_sender_name text,
  other_id uuid, other_name text, other_role text, other_photo text, my_member_role text
)
language plpgsql stable security definer set search_path to 'public'
as $$
#variable_conflict use_column
begin
  perform public.chat_caller();
  return query
    select c.id, c.kind, c.title, c.last_message_at, c.created_at,
           (select count(*)::int from public.staff_chat_members x where x.conversation_id = c.id),
           (select count(*)::int from public.staff_chat_messages m
             where m.conversation_id = c.id and m.created_at >= me.visible_from and m.created_at > me.last_read_at and m.sender_id is distinct from me.profile_id),
           (select count(*)::int from public.staff_chat_mentions mn
             where mn.conversation_id = c.id and mn.mentioned_id = me.profile_id and mn.created_at > me.last_read_at),
           lm.body, lm.sender_id, nullif(btrim(coalesce(sp.first_name, '') || ' ' || coalesce(sp.last_name, '')), ''),
           o.profile_id, nullif(btrim(coalesce(op.first_name, '') || ' ' || coalesce(op.last_name, '')), ''), op.role::text, op.photo_url,
           me.member_role
    from public.staff_chat_members me
    join public.staff_chat_conversations c on c.id = me.conversation_id
    left join lateral (
      select m.body, m.sender_id from public.staff_chat_messages m
      where m.conversation_id = c.id and m.created_at >= me.visible_from order by m.created_at desc limit 1
    ) lm on true
    left join public.profiles sp on sp.id = lm.sender_id
    left join lateral (
      select x.profile_id from public.staff_chat_members x where x.conversation_id = c.id and x.profile_id <> me.profile_id limit 1
    ) o on c.kind = 'direct'
    left join public.profiles op on op.id = o.profile_id
    where me.profile_id = auth.uid()
    order by c.last_message_at desc;
end $$;

create or replace function public.staff_chat_members_of(p_conv uuid)
returns table (profile_id uuid, first_name text, last_name text, role text, photo_url text, member_role text, joined_at timestamptz)
language plpgsql stable security definer set search_path to 'public'
as $$
#variable_conflict use_column
begin
  perform public.chat_caller();
  if not public.chat_is_member(p_conv) then raise exception 'Chat not found' using errcode = '42501'; end if;
  return query
    select m.profile_id, coalesce(pr.first_name, ''), coalesce(pr.last_name, ''), pr.role::text, pr.photo_url, m.member_role, m.joined_at
    from public.staff_chat_members m join public.profiles pr on pr.id = m.profile_id
    where m.conversation_id = p_conv order by m.member_role, pr.first_name;
end $$;

-- Chats I have been tagged into but have not joined. Shows only the message that tagged me — never the history.
create or replace function public.staff_chat_my_invites()
returns table (invite_id uuid, conversation_id uuid, title text, invited_by_id uuid, invited_by_name text, message_body text, invited_at timestamptz, member_count integer)
language plpgsql stable security definer set search_path to 'public'
as $$
#variable_conflict use_column
begin
  perform public.chat_caller();
  return query
    select i.id, i.conversation_id, c.title, i.invited_by,
           nullif(btrim(coalesce(ip.first_name, '') || ' ' || coalesce(ip.last_name, '')), ''),
           m.body, i.created_at,
           (select count(*)::int from public.staff_chat_members x where x.conversation_id = c.id)
    from public.staff_chat_invites i
    join public.staff_chat_conversations c on c.id = i.conversation_id
    left join public.staff_chat_messages m on m.id = i.message_id
    left join public.profiles ip on ip.id = i.invited_by
    where i.invitee_id = auth.uid() and i.status = 'pending'
    order by i.created_at desc;
end $$;

create or replace function public.staff_chat_respond_invite(p_invite uuid, p_accept boolean)
returns uuid
language plpgsql security definer set search_path to 'public'
as $$
declare me public.profiles; i public.staff_chat_invites; v_from timestamptz;
begin
  me := public.chat_caller();
  select * into i from public.staff_chat_invites where id = p_invite and invitee_id = me.id and status = 'pending';
  if not found then raise exception 'This invitation is no longer available'; end if;

  if not p_accept then
    update public.staff_chat_invites set status = 'declined', responded_at = now() where id = p_invite;
    return null;
  end if;

  -- They may read from the message that tagged them onward (not the earlier history).
  select coalesce((select created_at from public.staff_chat_messages where id = i.message_id), clock_timestamp()) into v_from;
  insert into public.staff_chat_members (conversation_id, profile_id, visible_from, added_by)
    values (i.conversation_id, me.id, v_from, i.invited_by) on conflict do nothing;
  update public.staff_chat_invites set status = 'accepted', responded_at = now() where id = p_invite;
  return i.conversation_id;
end $$;

-- Numbers for the sidebar badge.
create or replace function public.staff_chat_summary()
returns table (unread_conversations integer, unread_mentions integer, pending_invites integer)
language plpgsql stable security definer set search_path to 'public'
as $$
begin
  perform public.chat_caller();
  return query
    select
      (select count(*)::int from public.staff_chat_members me
        where me.profile_id = auth.uid() and exists (
          select 1 from public.staff_chat_messages m
          where m.conversation_id = me.conversation_id and m.created_at >= me.visible_from
            and m.created_at > me.last_read_at and m.sender_id is distinct from me.profile_id)),
      (select count(*)::int from public.staff_chat_mentions mn
        join public.staff_chat_members me on me.conversation_id = mn.conversation_id and me.profile_id = mn.mentioned_id
        where mn.mentioned_id = auth.uid() and mn.created_at > me.last_read_at),
      (select count(*)::int from public.staff_chat_invites i where i.invitee_id = auth.uid() and i.status = 'pending');
end $$;

-- Only signed-in users may call the app functions; the internal helpers stay callable by policies only.
do $$
declare f text;
begin
  foreach f in array array[
    'staff_chat_directory()', 'staff_chat_create_direct(uuid)', 'staff_chat_create_group(text, uuid[])',
    'staff_chat_add_members(uuid, uuid[], boolean)', 'staff_chat_rename(uuid, text)', 'staff_chat_leave(uuid)',
    'staff_chat_send(uuid, text)', 'staff_chat_mark_read(uuid)', 'staff_chat_conversations()', 'staff_chat_members_of(uuid)',
    'staff_chat_my_invites()', 'staff_chat_respond_invite(uuid, boolean)', 'staff_chat_summary()'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- 5. Realtime: live messages, invites and membership changes (still filtered by the policies above) -------
do $$
declare t text;
begin
  foreach t in array array['staff_chat_messages', 'staff_chat_invites', 'staff_chat_members'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- =============================================================================
-- ROLLBACK (removes the feature and ALL chat data):
-- drop table if exists public.staff_chat_invites, public.staff_chat_mentions, public.staff_chat_messages,
--                      public.staff_chat_members, public.staff_chat_conversations cascade;
-- drop function if exists public.staff_chat_directory(), public.staff_chat_create_direct(uuid),
--   public.staff_chat_create_group(text, uuid[]), public.staff_chat_add_members(uuid, uuid[], boolean),
--   public.staff_chat_rename(uuid, text), public.staff_chat_leave(uuid), public.staff_chat_send(uuid, text),
--   public.staff_chat_mark_read(uuid), public.staff_chat_conversations(), public.staff_chat_members_of(uuid),
--   public.staff_chat_my_invites(), public.staff_chat_respond_invite(uuid, boolean), public.staff_chat_summary(),
--   public.chat_caller(), public.chat_eligible(uuid, uuid), public.chat_is_member(uuid), public.chat_can_read(uuid, timestamptz);
-- =============================================================================
