create table if not exists public.scholarship_interests (
  id uuid primary key,
  application_id uuid,
  created_at timestamptz not null default now(),
  full_name text not null check (char_length(full_name) between 1 and 150),
  email text not null check (char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) <= 40),
  field text not null check (char_length(field) between 1 and 100),
  study_level text not null check (char_length(study_level) between 1 and 100),
  course text check (course is null or char_length(course) <= 150),
  destination text check (destination is null or char_length(destination) <= 100),
  cv_path text,
  transcript_path text
);

alter table public.scholarship_interests
  add column if not exists application_id uuid,
  add column if not exists cv_path text,
  add column if not exists transcript_path text;

alter table public.scholarship_interests enable row level security;

revoke all on public.scholarship_interests from public, anon, authenticated;

drop policy if exists "Allow anonymous interest submissions"
  on public.scholarship_interests;
create policy "Allow anonymous interest submissions"
  on public.scholarship_interests
  for insert
  to anon
  with check (true);

grant usage on schema public to anon;
grant insert (id, application_id, full_name, email, phone, field, study_level, course, destination, cv_path, transcript_path)
  on public.scholarship_interests to anon;

create table if not exists public.scholarship_application_progress (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  step smallint not null check (step between 1 and 3),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  check (
    char_length(data ->> 'name') between 1 and 150
    and char_length(data ->> 'email') between 3 and 254
    and (
      (step = 1
        and data ?& array['name', 'email']
        and data - array['name', 'email', 'phone'] = '{}'::jsonb)
      or (step = 2
        and data ?& array['name', 'email', 'field', 'study_level']
        and data - array['name', 'email', 'phone', 'field', 'study_level', 'course', 'destination'] = '{}'::jsonb)
      or (step = 3
        and data ?& array['name', 'email', 'field', 'study_level']
        and data - array['name', 'email', 'phone', 'field', 'study_level', 'course', 'destination', 'cv_path', 'transcript_path'] = '{}'::jsonb)
    )
  )
);

alter table public.scholarship_application_progress enable row level security;
revoke all on public.scholarship_application_progress from public, anon, authenticated;

drop policy if exists "Allow anonymous application progress submissions"
  on public.scholarship_application_progress;
create policy "Allow anonymous application progress submissions"
  on public.scholarship_application_progress
  for insert
  to anon
  with check (true);

grant insert (application_id, step, data)
  on public.scholarship_application_progress to anon;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'scholarship-documents',
  'scholarship-documents',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Allow anonymous scholarship document uploads"
  on storage.objects;
create policy "Allow anonymous scholarship document uploads"
  on storage.objects
  for insert
  to anon
  with check (
    bucket_id = 'scholarship-documents'
    and (storage.foldername(name))[1] ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  );
