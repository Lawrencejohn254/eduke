-- EduKe MVP schema
-- Core entities for: School, Academics, People, Lesson Plans / Schemes / Question Bank (AI),
-- Attendance, Exams & Results, Fees. Roles supported in MVP: principal, teacher, parent
-- (hod, bursar, super_admin columns/enums are included so the schema doesn't need to change
-- when those roles are added later).

create extension if not exists "uuid-ossp";

-- ========== ENUMS ==========
create type user_role as enum ('super_admin','principal','deputy_principal','hod','teacher','bursar','parent');
create type curriculum_type as enum ('CBC','8-4-4');
create type school_type as enum ('Public','Private','Mission','International');
create type school_level as enum ('Primary','Secondary','Both');
create type gender_type as enum ('Male','Female');
create type student_status as enum ('Active','Transferred Out','Graduated','Suspended','Expelled');
create type boarding_status as enum ('Day Scholar','Boarder');
create type special_needs_type as enum ('None','Visual Impairment','Hearing Impairment','Physical Disability','Learning Disability','Other');
create type guardian_relationship as enum ('Father','Mother','Guardian','Uncle','Aunt','Grandparent','Other');
create type doc_status as enum ('Draft','Submitted','Approved','Returned');
create type attendance_status as enum ('Present','Absent','Late','Excused');
create type exam_type as enum ('CAT 1','CAT 2','CAT 3','Mid-Term','End of Term','Mock','Pre-KCSE','CBC Summative');
create type exam_status as enum ('Upcoming','Ongoing','Marking','Results Released');
create type fee_category as enum ('Tuition','Activity','Boarding','Uniform','Exam Fee','Trip','Development','Caution','Other');
create type payment_method as enum ('M-Pesa','Cash','Cheque','Bank Transfer','Card');
create type payment_status as enum ('Confirmed','Pending','Failed');
create type notification_channel as enum ('SMS','WhatsApp','Email','In-App');
create type notification_status as enum ('Draft','Sent','Failed');
create type question_type as enum ('MCQ','Short Answer','Structured','Essay','True/False');
create type difficulty_level as enum ('Easy','Medium','Hard');

-- ========== SCHOOL ==========
create table schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  knec_code text unique,
  county text,
  sub_county text,
  phone text,
  email text,
  logo_url text,
  motto text,
  school_type school_type default 'Private',
  school_level school_level default 'Both',
  curriculum curriculum_type,
  is_boarding boolean default false,
  pesapal_paybill text,
  sms_sender_id text default 'EduKe',
  promotion_threshold numeric(5,2) default 50,
  created_at timestamptz default now()
);

-- ========== PROFILES (linked to Supabase auth.users) ==========
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references schools(id) on delete cascade,
  role user_role not null,
  first_name text,
  last_name text,
  phone text,
  photo_url text,
  staff_id uuid, -- set once staff row exists
  guardian_id uuid, -- set once guardian row exists (parents)
  created_at timestamptz default now()
);

-- ========== ACADEMIC CALENDAR ==========
create table academic_years (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  year int not null,
  is_current boolean default false
);

create table terms (
  id uuid primary key default uuid_generate_v4(),
  academic_year_id uuid references academic_years(id) on delete cascade,
  term_number text check (term_number in ('Term 1','Term 2','Term 3')) not null,
  start_date date,
  end_date date,
  is_current boolean default false
);

-- ========== CLASSES / STREAMS ==========
create table classes (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  level text,
  curriculum_type curriculum_type,
  next_class_id uuid references classes(id) on delete set null
);

create table staff (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  staff_number text,
  tsc_number text,
  first_name text not null,
  last_name text not null,
  gender gender_type,
  national_id text,
  kra_pin text,
  nhif_number text,
  nssf_number text,
  phone text not null,
  email text,
  photo_url text,
  role text,
  department text,
  contract_type text,
  date_joined date,
  status text default 'Active',
  basic_salary numeric(12,2)
);

create table streams (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) on delete cascade,
  name text not null,
  class_teacher_id uuid references staff(id),
  capacity int
);

-- ========== STUDENTS / GUARDIANS ==========
create table students (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  admission_number text unique not null,
  nemis_id text,
  upi text,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  gender gender_type,
  photo_url text,
  stream_id uuid references streams(id),
  class_id uuid references classes(id),
  status student_status default 'Active',
  enrollment_date date default now(),
  medical_notes text,
  special_needs special_needs_type default 'None',
  boarding_status boarding_status default 'Day Scholar',
  previous_school text,
  kcpe_index text,
  balance_brought_forward numeric(12,2) default 0
);

create table guardians (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete set null,
  full_name text not null,
  phone_primary text not null,
  phone_secondary text,
  email text,
  national_id text,
  relationship guardian_relationship,
  occupation text,
  residence text
);

create table student_guardians (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  guardian_id uuid references guardians(id) on delete cascade,
  is_primary boolean default false,
  fee_payer boolean default false,
  can_pickup boolean default true
);

-- ========== SUBJECTS / TEACHING ASSIGNMENTS ==========
create table subjects (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  code text,
  class_id uuid references classes(id),
  curriculum_type curriculum_type,
  is_examinable boolean default true,
  max_marks int default 100,
  learning_area text
);

create table teacher_subjects (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references staff(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  stream_id uuid references streams(id),
  term_id uuid references terms(id)
);

-- ========== AI-GENERATED ACADEMIC CONTENT ==========
create table lesson_plans (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references staff(id) not null,
  subject_id uuid references subjects(id) not null,
  stream_id uuid references streams(id) not null,
  term_id uuid references terms(id) not null,
  week_number int check (week_number between 1 and 13),
  date date,
  topic text not null,
  subtopic text,
  learning_objectives text,
  teaching_activities text,
  learning_resources text,
  reference text,
  assessment_method text,
  file_url text,
  status doc_status default 'Draft',
  hod_comments text,
  reviewed_by uuid references staff(id),
  reviewed_at timestamptz,
  submitted_at timestamptz,
  ai_generated boolean default false,
  content text, -- full AI-generated / manual body text
  created_at timestamptz default now()
);

create table schemes_of_work (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references staff(id) not null,
  subject_id uuid references subjects(id) not null,
  class_id uuid references classes(id) not null,
  term_id uuid references terms(id) not null,
  title text not null,
  content text,
  file_url text,
  status doc_status default 'Draft',
  hod_comments text,
  reviewed_by uuid references staff(id),
  reviewed_at timestamptz,
  submitted_at timestamptz,
  ai_generated boolean default false,
  created_at timestamptz default now()
);

create table question_bank (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references staff(id),
  subject_id uuid references subjects(id),
  class_id uuid references classes(id),
  topic text,
  question_text text not null,
  question_type question_type,
  difficulty difficulty_level,
  marks int default 1,
  options text,
  correct_answer text,
  marking_scheme text,
  term_id uuid references terms(id),
  ai_generated boolean default false,
  created_at timestamptz default now()
);

-- ========== ATTENDANCE ==========
create table attendance (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) not null,
  date date not null,
  status attendance_status default 'Present',
  recorded_by uuid references staff(id),
  notes text,
  sms_sent boolean default false,
  created_at timestamptz default now(),
  unique(student_id, date)
);

-- ========== EXAMS / RESULTS ==========
create table exams (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  exam_type exam_type,
  class_id uuid references classes(id),
  term_id uuid references terms(id),
  start_date date,
  end_date date,
  out_of int default 100,
  status exam_status default 'Upcoming'
);

create table exam_results (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) not null,
  exam_id uuid references exams(id) not null,
  subject_id uuid references subjects(id) not null,
  marks_obtained numeric(6,2),
  grade text,
  points int,
  position int,
  teacher_comment text,
  entered_by uuid references staff(id),
  unique(student_id, exam_id, subject_id)
);

-- Grade auto-computation (Kenya MoE scale) via trigger
create or replace function compute_grade_points()
returns trigger as $$
begin
  if new.marks_obtained is null then
    new.grade := null; new.points := null; return new;
  end if;
  if new.marks_obtained >= 75 then new.grade := 'A'; new.points := 12;
  elsif new.marks_obtained >= 70 then new.grade := 'A-'; new.points := 11;
  elsif new.marks_obtained >= 65 then new.grade := 'B+'; new.points := 10;
  elsif new.marks_obtained >= 60 then new.grade := 'B'; new.points := 9;
  elsif new.marks_obtained >= 55 then new.grade := 'B-'; new.points := 8;
  elsif new.marks_obtained >= 50 then new.grade := 'C+'; new.points := 7;
  elsif new.marks_obtained >= 45 then new.grade := 'C'; new.points := 6;
  elsif new.marks_obtained >= 40 then new.grade := 'C-'; new.points := 5;
  elsif new.marks_obtained >= 35 then new.grade := 'D+'; new.points := 4;
  elsif new.marks_obtained >= 30 then new.grade := 'D'; new.points := 3;
  elsif new.marks_obtained >= 25 then new.grade := 'D-'; new.points := 2;
  else new.grade := 'E'; new.points := 1;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_compute_grade
before insert or update of marks_obtained on exam_results
for each row execute function compute_grade_points();

-- ========== FEES ==========
create table fee_structure (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id),
  term_id uuid references terms(id),
  fee_category fee_category,
  amount numeric(12,2) not null,
  is_mandatory boolean default true,
  description text
);

create table fee_payments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) not null,
  term_id uuid references terms(id) not null,
  amount numeric(12,2) not null,
  payment_method payment_method,
  pesapal_order_id text,
  mpesa_reference text,
  receipt_number text unique,
  payment_date timestamptz default now(),
  fee_category fee_category,
  received_by uuid references staff(id),
  notes text,
  status payment_status default 'Confirmed'
);

-- Auto-generate receipt number RCT-YYYY-XXXXX
create sequence if not exists receipt_seq start 1;
create or replace function generate_receipt_number()
returns trigger as $$
begin
  if new.receipt_number is null then
    new.receipt_number := 'RCT-' || extract(year from now())::text || '-' || lpad(nextval('receipt_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_receipt_number
before insert on fee_payments
for each row execute function generate_receipt_number();

-- ========== NOTIFICATIONS ==========
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  recipient_type text,
  target_type text check (target_type in ('school','class','stream','student')) default 'school',
  target_id uuid, -- class_id, stream_id, or student_id depending on target_type; null when target_type='school'
  channel notification_channel,
  subject text,
  message text not null,
  sent_by uuid references staff(id),
  sent_at timestamptz,
  recipient_count int default 0,
  status notification_status default 'Draft',
  created_at timestamptz default now()
);

-- One row per phone number a notification actually went to, so Communications can show a delivery log.
create table notification_recipients (
  id uuid primary key default uuid_generate_v4(),
  notification_id uuid references notifications(id) on delete cascade,
  guardian_id uuid references guardians(id),
  phone text,
  delivery_status text default 'Sent', -- Sent / Failed (simulated unless real Africa's Talking key is set)
  created_at timestamptz default now()
);

-- ========== TIMETABLE ==========
create table timetable_slots (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  teacher_id uuid references staff(id) on delete cascade,
  stream_id uuid references streams(id) on delete set null,
  subject_id uuid references subjects(id) on delete set null,
  term_id uuid references terms(id),
  title text not null,
  description text,
  color text default 'blue', -- one of: blue, orange, green, red, purple, yellow, pink, teal
  day_of_week int check (day_of_week between 1 and 7), -- 1=Monday .. 7=Sunday
  start_time time not null,
  end_time time not null,
  room text
);

-- One editable "Weekly Schedule" title per teacher (defaults applied in the UI if no row exists)
create table timetable_settings (
  teacher_id uuid primary key references staff(id) on delete cascade,
  title text not null default 'Weekly Schedule'
);

-- ========== LIBRARY ==========
create table books (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  title text not null,
  author text,
  isbn text,
  category text,
  total_copies int not null default 1,
  available_copies int not null default 1
);

create table book_borrowings (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references books(id) on delete cascade,
  student_id uuid references students(id),
  borrowed_date date not null default current_date,
  due_date date,
  returned_date date,
  status text not null default 'Borrowed' check (status in ('Borrowed','Returned','Overdue','Lost')),
  recorded_by uuid references staff(id)
);

-- Snapshot of which class/stream a student belonged to at the end of each term, taken at
-- promotion time. Exam results and attendance don't need this (they're naturally tied to the
-- exam's own class, or to a date, not the student's current class) — but fee calculations
-- depend on class+term, so this lets past-term fee figures stay correct after a promotion.
create table student_class_history (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  class_id uuid references classes(id),
  stream_id uuid references streams(id),
  term_id uuid references terms(id),
  created_at timestamptz default now()
);
alter table schools enable row level security;
alter table profiles enable row level security;
alter table academic_years enable row level security;
alter table terms enable row level security;
alter table classes enable row level security;
alter table streams enable row level security;
alter table staff enable row level security;
alter table students enable row level security;
alter table guardians enable row level security;
alter table student_guardians enable row level security;
alter table subjects enable row level security;
alter table teacher_subjects enable row level security;
alter table lesson_plans enable row level security;
alter table schemes_of_work enable row level security;
alter table question_bank enable row level security;
alter table attendance enable row level security;
alter table exams enable row level security;
alter table exam_results enable row level security;
alter table fee_structure enable row level security;
alter table fee_payments enable row level security;
alter table notifications enable row level security;
alter table student_class_history enable row level security;
alter table notification_recipients enable row level security;
alter table timetable_slots enable row level security;
alter table timetable_settings enable row level security;
alter table books enable row level security;
alter table book_borrowings enable row level security;

-- Helper: fetch requester's school_id and role from profiles
create or replace function my_school_id() returns uuid as $$
  select school_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function my_role() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function my_staff_id() returns uuid as $$
  select staff_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function my_guardian_id() returns uuid as $$
  select guardian_id from profiles where id = auth.uid();
$$ language sql stable security definer;

-- These bypass RLS internally (owned by an elevated role), which is what breaks the
-- students <-> student_guardians circular policy reference below. Without this, Postgres
-- raises "infinite recursion detected in policy for relation students".
create or replace function my_children_ids() returns setof uuid as $$
  select student_id from student_guardians where guardian_id = my_guardian_id();
$$ language sql stable security definer;

create or replace function my_children_class_ids() returns setof uuid as $$
  select distinct s.class_id from students s
  join student_guardians sg on sg.student_id = s.id
  where sg.guardian_id = my_guardian_id();
$$ language sql stable security definer;

create or replace function student_belongs_to_my_school(sid uuid) returns boolean as $$
  select exists(select 1 from students where id = sid and school_id = my_school_id());
$$ language sql stable security definer;

-- Same-school policy for most tables (principal/teacher see their school's data)
create policy "same school read" on schools for select using (id = my_school_id());
create policy "schools staff update" on schools for update using (
  id = my_school_id() and my_role() in ('principal','deputy_principal','super_admin')
);
create policy "profiles same school" on profiles for select using (school_id = my_school_id());
create policy "profiles self update" on profiles for update using (id = auth.uid());

create policy "academic_years same school" on academic_years for all using (school_id = my_school_id());
create policy "classes same school" on classes for all using (school_id = my_school_id());
create policy "subjects same school" on subjects for all using (school_id = my_school_id());
create policy "staff same school" on staff for all using (school_id = my_school_id());

-- Students/guardians: staff (any role) at the same school can read; parents restricted to their own children
create policy "students staff read" on students for all using (
  school_id = my_school_id() and my_role() <> 'parent'
);
create policy "students parent read" on students for select using (
  my_role() = 'parent' and id in (select my_children_ids())
);

-- Lesson plans / schemes: teacher sees own; principal/hod see school-wide (simplified for MVP: same school)
create policy "lesson_plans teacher own" on lesson_plans for all using (
  teacher_id = my_staff_id() or my_role() in ('principal','deputy_principal','hod')
);
create policy "schemes teacher own" on schemes_of_work for all using (
  teacher_id = my_staff_id() or my_role() in ('principal','deputy_principal','hod')
);
create policy "question_bank teacher own" on question_bank for all using (
  teacher_id = my_staff_id() or my_role() in ('principal','deputy_principal','hod')
);

-- Attendance: teachers/principal read-write for their school; parents read their child's
create policy "attendance staff" on attendance for all using (
  student_id in (select id from students where school_id = my_school_id()) and my_role() <> 'parent'
);
create policy "attendance parent read" on attendance for select using (
  my_role() = 'parent' and student_id in (select my_children_ids())
);

-- Exams / results
create policy "exams staff" on exams for all using (school_id = my_school_id() and my_role() <> 'parent');
create policy "exams parent read" on exams for select using (
  my_role() = 'parent' and class_id in (select my_children_class_ids())
);
create policy "exam_results staff" on exam_results for all using (
  student_id in (select id from students where school_id = my_school_id()) and my_role() <> 'parent'
);
create policy "exam_results parent read" on exam_results for select using (
  my_role() = 'parent' and student_id in (select my_children_ids())
);

-- Fees
create policy "fee_structure staff" on fee_structure for all using (
  class_id in (select id from classes where school_id = my_school_id()) and my_role() <> 'parent'
);
create policy "fee_payments staff" on fee_payments for all using (
  student_id in (select id from students where school_id = my_school_id())
  and my_role() in ('principal','deputy_principal','bursar','super_admin')
);
create policy "fee_payments parent read" on fee_payments for select using (
  my_role() = 'parent' and student_id in (select my_children_ids())
);

create policy "notifications same school" on notifications for all using (school_id = my_school_id());

create policy "streams same school" on streams for all using (
  class_id in (select id from classes where school_id = my_school_id())
);
create policy "terms same school" on terms for all using (
  academic_year_id in (select id from academic_years where school_id = my_school_id())
);
create policy "teacher_subjects same school" on teacher_subjects for all using (
  teacher_id in (select id from staff where school_id = my_school_id())
);
create policy "guardians via student" on guardians for select using (
  id in (select guardian_id from student_guardians sg join students s on s.id = sg.student_id where s.school_id = my_school_id())
  or profile_id = auth.uid()
);
create policy "guardians staff insert" on guardians for insert with check (
  auth.uid() is not null and my_role() <> 'parent'
);
create policy "guardians staff update" on guardians for update using (
  id in (select guardian_id from student_guardians sg join students s on s.id = sg.student_id where s.school_id = my_school_id())
  and my_role() <> 'parent'
);
create policy "student_guardians same school" on student_guardians for all using (
  student_belongs_to_my_school(student_id)
);
create policy "student_class_history staff" on student_class_history for all using (
  student_id in (select id from students where school_id = my_school_id()) and my_role() <> 'parent'
);

create policy "notification_recipients staff" on notification_recipients for all using (
  notification_id in (select id from notifications where school_id = my_school_id()) and my_role() <> 'parent'
);

create policy "timetable teacher manage own" on timetable_slots for all using (
  teacher_id = my_staff_id()
) with check (
  teacher_id = my_staff_id()
);
create policy "timetable staff read" on timetable_slots for select using (
  school_id = my_school_id() and my_role() in ('principal','deputy_principal','super_admin','hod')
);
create policy "timetable parent read" on timetable_slots for select using (
  my_role() = 'parent' and stream_id in (
    select stream_id from students where id in (select my_children_ids())
  )
);
create policy "timetable_settings teacher own" on timetable_settings for all using (
  teacher_id = my_staff_id()
) with check (
  teacher_id = my_staff_id()
);
create policy "timetable_settings staff read" on timetable_settings for select using (
  my_role() in ('principal','deputy_principal','super_admin','hod')
);

create policy "books staff" on books for all using (
  school_id = my_school_id() and my_role() <> 'parent'
);

create policy "book_borrowings staff" on book_borrowings for all using (
  book_id in (select id from books where school_id = my_school_id()) and my_role() <> 'parent'
);
