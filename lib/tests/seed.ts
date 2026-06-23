import type { EligibilityTestInput } from "./types";

/**
 * Starting test cases (Notion §"Eligibility tests"). Used to seed the
 * `eligibility_tests` table (see supabase/setup.sql) and as the in-memory
 * fallback when Supabase isn't configured. Each case asserts the four outcome
 * values the engine should produce against the seed registry.
 */
export const SEED_TESTS: EligibilityTestInput[] = [
  {
    name: "Happy Path — Serviceable",
    payer_group: "Cigna",
    plan_type: "Commercial",
    plan_structure: "PPO",
    service_state: "WA",
    expected: {
      serviceable: "Yes",
      pre_auth_required: "No",
      referral_required: "No",
      preventative_coverage: "Yes",
    },
    notes:
      "Cigna has a broad wildcard rule. Tests simple matching with a clear yes.",
  },
  {
    name: "California — Referral Required",
    payer_group: "Aetna",
    plan_type: "Commercial",
    plan_structure: "PPO",
    service_state: "CA",
    expected: {
      serviceable: "Yes",
      pre_auth_required: "No",
      referral_required: "CA Referral",
      preventative_coverage: "Yes",
    },
    notes:
      'Aetna Commercial PPO is serviceable, but the CA wildcard rule overrides referral to "CA Referral". Tests state-specific rule layering.',
  },
  {
    name: "Blocked State — Not Serviceable",
    payer_group: "Aetna",
    plan_type: "Commercial",
    plan_structure: "PPO",
    service_state: "OH",
    expected: {
      serviceable: "No",
      pre_auth_required: "No",
      referral_required: "No",
      preventative_coverage: "No",
    },
    notes:
      "Ohio is in the global blocked-states list. Even though Aetna PPO is normally serviceable, the state block overrides. Tests rule priority/specificity.",
  },
];
