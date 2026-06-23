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
