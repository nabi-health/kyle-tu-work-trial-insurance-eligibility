import { describe, expect, it } from "vitest";
import {
  looksLikeDataset,
  parseAttachmentText,
  readChatAttachmentText,
} from "./upload";

const MEMBER_CSV =
  "payer_group,plan_type,plan_structure,service_state\nAetna,Commercial,PPO,CA";
const RULE_CSV =
  "payer_group,plan_type,plan_structure,service_state,serviceable,pre_auth_required,referral_required,preventative_coverage\nAetna,Commercial,PPO,CA,Yes,No,No,Yes";

describe("parseAttachmentText kind inference", () => {
  it("treats a member-query CSV as member_queries", () => {
    const res = parseAttachmentText(MEMBER_CSV, { isJson: false });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.attachment.kind).toBe("member_queries");
      expect(res.attachment.count).toBe(1);
    }
  });

  it("treats a CSV with outcome columns as rule_rows", () => {
    const res = parseAttachmentText(RULE_CSV, { isJson: false });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.attachment.kind).toBe("rule_rows");
      expect(res.attachment.count).toBe(1);
    }
  });

  it("treats a JSON array as member_queries", () => {
    const json = JSON.stringify([
      { payer_group: "Aetna", plan_type: "Commercial", plan_structure: "PPO", service_state: "CA" },
    ]);
    const res = parseAttachmentText(json, { isJson: true });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attachment.kind).toBe("member_queries");
  });

  it("honors a forced kind override (rule CSV checked as members)", () => {
    // A rule CSV forced to member_queries still parses the four query columns.
    const res = parseAttachmentText(RULE_CSV, { isJson: false, force: "member_queries" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attachment.kind).toBe("member_queries");
  });

  it("surfaces row errors for an invalid member CSV", () => {
    const bad =
      "payer_group,plan_type,plan_structure,service_state\nAetna,Commercial,PPO,ZZ";
    const res = parseAttachmentText(bad, { isJson: false });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.rowErrors?.length).toBeGreaterThan(0);
  });
});

describe("looksLikeDataset", () => {
  it("recognizes a CSV with the query header and a data line", () => {
    expect(looksLikeDataset(MEMBER_CSV)).toBe(true);
    expect(looksLikeDataset(RULE_CSV)).toBe(true);
  });

  it("recognizes a JSON array", () => {
    expect(looksLikeDataset('[{"payer_group":"Aetna"}]')).toBe(true);
  });

  it("ignores ordinary prose", () => {
    expect(looksLikeDataset("set Aetna PPO to not serviceable in Texas")).toBe(false);
  });
});

describe("readChatAttachmentText", () => {
  it("parses pasted CSV into a member attachment", () => {
    const res = readChatAttachmentText(MEMBER_CSV);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.attachment.kind).toBe("member_queries");
  });
});
