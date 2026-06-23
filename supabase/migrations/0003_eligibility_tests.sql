-- Eligibility tests: saved input → expected-output cases, re-run against the
-- live registry whenever a rule changes. The four columns mirror the checker
-- inputs; the four expected_* columns are the asserted outcomes.

create table if not exists eligibility_tests (
  id                             uuid primary key default gen_random_uuid(),
  name                           text not null default '',
  payer_group                    text not null default '',
  plan_type                      text not null default '',
  plan_structure                 text not null default '',
  service_state                  text not null default '',
  expected_serviceable           text not null default '',
  expected_pre_auth_required     text not null default '',
  expected_referral_required     text not null default '',
  expected_preventative_coverage text not null default '',
  notes                          text not null default '',
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);

create index if not exists eligibility_tests_created_at_idx
  on eligibility_tests (created_at);

-- Reuses set_updated_at() from 0001_init.sql.
drop trigger if exists eligibility_tests_set_updated_at on eligibility_tests;
create trigger eligibility_tests_set_updated_at
  before update on eligibility_tests
  for each row execute function set_updated_at();

alter table eligibility_tests enable row level security;
drop policy if exists "public access" on eligibility_tests;
create policy "public access" on eligibility_tests for all to anon, authenticated using (true) with check (true);

grant all on eligibility_tests to anon, authenticated;

-- Seed the starting test cases — only when the table is empty, so re-running the
-- migration never clobbers tests authored in the app.
insert into eligibility_tests
  (name, payer_group, plan_type, plan_structure, service_state,
   expected_serviceable, expected_pre_auth_required, expected_referral_required, expected_preventative_coverage, notes)
select * from (values
  ('Happy Path — Serviceable', 'Cigna', 'Commercial', 'PPO', 'WA',
   'Yes', 'No', 'No', 'Yes',
   'Cigna has a broad wildcard rule. Tests simple matching with a clear yes.'),
  ('California — Referral Required', 'Aetna', 'Commercial', 'PPO', 'CA',
   'Yes', 'No', 'CA Referral', 'Yes',
   'Aetna Commercial PPO is serviceable, but the CA wildcard rule overrides referral to "CA Referral". Tests state-specific rule layering.'),
  ('Blocked State — Not Serviceable', 'Aetna', 'Commercial', 'PPO', 'OH',
   'No', 'No', 'No', 'No',
   'Ohio is in the global blocked-states list. Even though Aetna PPO is normally serviceable, the state block overrides. Tests rule priority/specificity.')
) as seed
where not exists (select 1 from eligibility_tests);
