-- Note for non-coders: this function creates the poll and all 7 days together in one database transaction.
-- If any step fails (like duplicate week), PostgreSQL rolls everything back so we never store a half-created poll.
create or replace function public.create_availability_poll_with_days(
  p_week_year integer,
  p_week_number integer,
  p_start_date date,
  p_end_date date
)
returns public.availability_polls
language plpgsql
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_is_admin boolean;
  v_poll public.availability_polls;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'User must be authenticated to create availability polls.'
      using errcode = '42501';
  end if;

  select p.is_admin
    into v_is_admin
  from public.profiles p
  where p.id = v_user_id;

  if coalesce(v_is_admin, false) is not true then
    raise exception 'Only admins can create availability polls.'
      using errcode = '42501';
  end if;

  insert into public.availability_polls (
    created_by,
    week_year,
    week_number,
    start_date,
    end_date
  )
  values (
    v_user_id,
    p_week_year,
    p_week_number,
    p_start_date,
    p_end_date
  )
  returning * into v_poll;

  insert into public.availability_poll_days (poll_id, date)
  select v_poll.id, (p_start_date + day_offset)
  from generate_series(0, 6) as day_offset;

  return v_poll;
end;
$$;

grant execute on function public.create_availability_poll_with_days(integer, integer, date, date) to authenticated;
