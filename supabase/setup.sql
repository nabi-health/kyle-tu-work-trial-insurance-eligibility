-- Insurance eligibility registry schema.
-- Each row is one eligibility rule; fields mirror registry.json.

create extension if not exists "pgcrypto";

create table if not exists rules (
  id                    uuid primary key default gen_random_uuid(),
  payer_group           text not null default '*',
  payer_id              text not null default '*',
  plan_type             text not null default '*',
  group_number          text not null default '*',
  plan_structure        text not null default '*',
  service_state         text not null default '*',
  serviceable           text not null default 'Needs Review',
  pre_auth_required     text not null default 'Needs Review',
  referral_required     text not null default 'Needs Review',
  preventative_coverage text not null default 'Needs Review',
  last_verified         text not null default '',
  verified_by           text not null default '',
  notes                 text not null default '',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Common filter columns for the rules table / coverage matrix.
create index if not exists rules_payer_group_idx on rules (payer_group);
create index if not exists rules_plan_structure_idx on rules (plan_structure);

-- Audit log (who changed what, when) — nice-to-have, wired by the repository.
create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  rule_id    uuid,
  action     text not null check (action in ('create', 'update', 'delete')),
  actor      text not null default 'ops',
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_rule_id_idx on audit_log (rule_id);
create index if not exists audit_log_created_at_idx on audit_log (created_at desc);

-- Keep updated_at fresh on every write.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rules_set_updated_at on rules;
create trigger rules_set_updated_at
  before update on rules
  for each row execute function set_updated_at();

-- Row-level security: allow the publishable/anon key full access.
-- (Internal ops tool; the publishable key is intended to be public. Tighten
--  with real auth + per-role policies for production.)
alter table rules enable row level security;
drop policy if exists "public access" on rules;
create policy "public access" on rules for all to anon, authenticated using (true) with check (true);

alter table audit_log enable row level security;
drop policy if exists "public access" on audit_log;
create policy "public access" on audit_log for all to anon, authenticated using (true) with check (true);

grant all on rules to anon, authenticated;
grant all on audit_log to anon, authenticated;

-- Seed from registry.json (53 rules). Idempotent: clears first.
delete from rules;
insert into rules (payer_group, payer_id, plan_type, group_number, plan_structure, service_state, serviceable, pre_auth_required, referral_required, preventative_coverage, last_verified, verified_by, notes) values
  ('*', '*', '*', '*', '*', 'OH,TN,OK,AL,UT,IA,KS,MS,AR,NE,SD,ND,MT,PA,IL,FL,NC,GA,MO,MN,MD,KY,SC,LA,NV,ME,DC,RI,NM,DE,ID', 'No', 'No', 'No', 'No', '', '', ''),
  ('*', '*', '*', '*', '*', 'CA', '*', '*', 'CA Referral', '*', '', '', ''),
  ('*', '*', '*', '*', 'EPO', 'CA,TX', 'No', 'No', 'No', 'No', '', '', ''),
  ('*', '*', 'Medicaid', '*', '*', '*', 'No', 'No', 'No', 'No', '', '', ''),
  ('Kaiser', '94134,94135,KSRCN,100173', '*', '*', 'HMO', 'CA', 'Needs Review', 'Yes', 'CA Referral', 'Yes', '', '', 'We are not able to initiate authorizations for out of state Kaiser HMO plans. Their portal does not allow for it. The client needs to contact their PCP and request an authorization be faxed to us.'),
  ('Aetna', '60054', 'Commercial', '*', 'PPO', '*', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('Aetna Whole Health Puget Sound', '42172', '*', '*', 'EPO', '*', 'No', 'No', 'No', 'No', '', '', ''),
  ('Regence BlueShield', 'RGBLS', 'Commercial', '*', 'PPO', '*', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('United Healthcare', '87726', 'Commercial', '*', 'PPO', '*', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('Cigna', '62308', '*', '*', '*', '*', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('Meritain', '60054,64157', 'Commercial', '*', 'PPO', '*', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('Aetna WA Medicare Advantage', '60054', 'Medicare', '*', '*', 'WA', 'Yes', 'No', 'Yes', 'Yes', 'October 31, 2025', '', ''),
  ('Sound Health & Wellness Trust', '91136', 'Commercial', '*', '*', 'WA', 'Yes', 'No', 'Yes', 'Unknown', '', '', ''),
  ('Aetna Whole Health Puget Sound', '91136', 'Commercial', '*', 'EPO', 'WA', 'No', 'No', 'Yes', 'No', '', '', ''),
  ('BCBS Regence', 'RGBLS', 'Commercial', '*', '*', '*', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('BCBS Premera', 'WABLC', 'Commercial', '*', '*', '*', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('BCBS Medicare Advantage', '66006', 'Medicare', '*', '*', '*', 'Needs Review', 'No', 'Yes', 'Unknown', '', '', ''),
  ('Puget Sound Electrical Workers Trust', '91136', 'Commercial', '*', '*', 'WA', 'Yes', 'No', 'No', 'Yes', 'April 1, 2025', '', ''),
  ('BCBS Alabama', '00510BC', 'Commercial', '*', '*', 'AL', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('BCBS Arizona', '53589', 'Commercial', '*', '*', 'AZ', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('Anthem BCBS CA', '040', 'Commercial', '*', '*', '*', 'Needs Review', 'No', 'No', 'Yes', '', '', ''),
  ('Anthem BCBS CA', '040', '*', '275958P700', '*', '*', 'Needs Review', 'No', 'Yes', 'Yes', '', '', ''),
  ('BCBS Hawaii', '100937', 'Commercial', '*', '*', 'HI', 'Yes', 'Yes', 'No', 'Yes', 'July 1, 2025', '', ''),
  ('BCBS Kansas', 'KSBLS', 'Commercial', '*', '*', 'KS', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('BCBS MA', 'MABLS', 'Commercial', '*', '*', 'MA', 'Yes', 'No', 'No', 'Unknown', 'January 9, 2026', 'NM', 'Preventive policy only shows coverage for Adults who are overweight or obese, and have additional cardiovascular risk factors, and/or abnormal blood glucose. For peds and adolescents it only mentions obesity.'),
  ('BCBS Minnesota', 'MNBLS', 'Commercial', '*', '*', 'MN', 'Yes', 'No', 'No', 'Yes', 'August 24, 2021', '', ''),
  ('BCBS North Carolina', 'NCBLS', 'Commercial', '*', '*', 'NC', 'Yes', 'No', 'No', 'Yes', 'January 27, 2026', '', 'May have 6 visit limit (does not apply to Blue Options plan through Epic Games-no visit limit for them). NM'),
  ('BCBS OR', 'ORBLS', 'Commercial', '*', '*', 'OR', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('Regence BCBS OR', '00851', 'Commercial', '*', '*', 'OR', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('BCBS of Texas', 'TXBLS', 'Commercial', '*', '*', 'TX', 'Needs Review', 'No', 'No', 'No', 'July 1, 2024', '', 'Cannot see American Airlines BCBS TX'),
  ('Cigna', '62308', 'Commercial', '*', '*', 'WA', 'Yes', 'No', 'No', 'Yes', 'March 1, 2025', '', ''),
  ('Cigna Medicare Advantage', '86033', 'Medicare', '*', '*', 'WA', 'No', 'No', 'No', 'No', 'March 1, 2025', '', ''),
  ('First Choice Health', '91131', 'Commercial', '*', 'PPO', 'WA', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('PacificSource', '93029', 'Commercial', '*', '*', 'WA', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('Kaiser Permanente PPO', '91051', 'Commercial', '*', 'PPO', 'CA,CO,DC,GA,HI,MD,OR,VA,WA', 'Needs Review', 'No', 'No', 'Yes', '', '', ''),
  ('Kaiser Permanente HMO Commercial', '91051', 'Commercial', '*', 'HMO', 'CA,CO,DC,GA,HI,MD,OR,VA,WA', 'Needs Review', 'Yes', 'Yes', 'Yes', '', '', ''),
  ('Kaiser Permanente Medicare Advantage', '91051', 'Medicare', '*', 'HMO', 'CA,CO,DC,GA,HI,MD,OR,VA,WA', 'Needs Review', 'Yes', 'Yes', 'Yes', '', '', ''),
  ('Kaiser Permanente Anchor Medicare Advantage', '91051', 'Medicare', '*', 'HMO', 'CA,CO,DC,GA,HI,MD,OR,VA,WA', 'No', 'Yes', 'Yes', 'Yes', '', '', ''),
  ('Medicare', 'WAMCR', 'Medicare', '*', '*', 'WA', 'Needs Review', 'No', 'Yes', 'Unknown', '', '', ''),
  ('Premera', 'WABLC', 'Commercial', '*', '*', 'WA', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('Lifewise of WA', '91049', 'Commercial', '*', '*', 'WA', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('Lifewise Assurance Co', '93095', 'Commercial', '*', '*', 'WA', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('Premera Individual Plans', '00430', 'Individual', '*', 'EPO', 'WA', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('Regence Group Administrators', 'RGA01', 'Commercial', '*', '*', '*', 'Yes', 'No', 'No', 'Yes', 'October 1, 2024', '', ''),
  ('Health Management Admin', 'HMA01', 'Commercial', '*', '*', '*', 'Yes', 'No', 'No', 'Yes', 'October 1, 2024', '', ''),
  ('Bridgespan', 'BRIDG', 'Commercial', '*', '*', '*', 'Needs Review', 'No', 'No', 'Yes', 'October 1, 2024', '', ''),
  ('Asuris', '93221', 'Commercial', '*', '*', '*', 'Needs Review', 'No', 'No', 'Yes', 'October 1, 2024', '', ''),
  ('GEHA', '06603,44054', 'Commercial', '*', '*', '*', 'Yes', 'No', 'No', 'Yes', 'October 6, 2025', '', ''),
  ('United Healthcare Medicare Advantage', '87726', 'Medicare', '*', '*', '*', 'Needs Review', 'No', 'Yes', 'No', 'January 2, 2026', '', 'Most UHC Med Adv plans follow medicare guidelines- need PCP referral and DM or CKD dx'),
  ('Kaiser', '*', 'Commercial', '*', 'HMO', 'CA', 'No', 'No', 'No', 'No', '', '', ''),
  ('Aetna', '*', 'Commercial', '*', 'PPO', 'WA', 'Yes', 'No', 'No', 'Yes', '', '', ''),
  ('Oxford (UnitedHealthcare/Oxford)', '06111', 'Commercial', '*', 'PPO', 'WA', 'Yes', 'No', 'No', 'Needs Review', '', '', ''),
  ('Oxford (UnitedHealthcare/Oxford) Liberty Network', '06111', 'Commercial', '*', 'EPO', 'WA', 'Needs Review', 'Needs Review', 'Needs Review', 'Needs Review', 'December 5, 2025', 'Nikki M', 'We are OON w/Liberty Network. May still have OON benefits available. Needs review.');

-- ----------------------------------------------------------------------------
-- Assistant chat history. One row per saved conversation, scoped by user name.
-- (This tool has no real auth — the user's name is the editable identity, the
--  same one stamped as `verified_by` on rule saves.) `messages` is the full
--  ChatMessage[] transcript as JSON.
-- ----------------------------------------------------------------------------
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

drop trigger if exists assistant_chats_set_updated_at on assistant_chats;
create trigger assistant_chats_set_updated_at
  before update on assistant_chats
  for each row execute function set_updated_at();

alter table assistant_chats enable row level security;
drop policy if exists "public access" on assistant_chats;
create policy "public access" on assistant_chats for all to anon, authenticated using (true) with check (true);

grant all on assistant_chats to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Eligibility tests. Saved input → expected-output cases, re-run against the
-- live registry whenever a rule changes. The four inputs mirror the checker;
-- the four expected_* columns are the asserted outcomes.
-- ----------------------------------------------------------------------------
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

drop trigger if exists eligibility_tests_set_updated_at on eligibility_tests;
create trigger eligibility_tests_set_updated_at
  before update on eligibility_tests
  for each row execute function set_updated_at();

alter table eligibility_tests enable row level security;
drop policy if exists "public access" on eligibility_tests;
create policy "public access" on eligibility_tests for all to anon, authenticated using (true) with check (true);

grant all on eligibility_tests to anon, authenticated;

-- Seed the starting test cases (idempotent: clears first, like rules above).
delete from eligibility_tests;
insert into eligibility_tests
  (name, payer_group, plan_type, plan_structure, service_state,
   expected_serviceable, expected_pre_auth_required, expected_referral_required, expected_preventative_coverage, notes) values
  ('Happy Path — Serviceable', 'Cigna', 'Commercial', 'PPO', 'WA', 'Yes', 'No', 'No', 'Yes', 'Cigna has a broad wildcard rule. Tests simple matching with a clear yes.'),
  ('California — Referral Required', 'Aetna', 'Commercial', 'PPO', 'CA', 'Yes', 'No', 'CA Referral', 'Yes', 'Aetna Commercial PPO is serviceable, but the CA wildcard rule overrides referral to "CA Referral". Tests state-specific rule layering.'),
  ('Blocked State — Not Serviceable', 'Aetna', 'Commercial', 'PPO', 'OH', 'No', 'No', 'No', 'No', 'Ohio is in the global blocked-states list. Even though Aetna PPO is normally serviceable, the state block overrides. Tests rule priority/specificity.');
