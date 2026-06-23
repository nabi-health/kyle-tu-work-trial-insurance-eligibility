// Seed the Supabase `rules` table from registry.json.
// Usage: npm run seed   (reads .env.local for NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const here = dirname(fileURLToPath(import.meta.url));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and a Supabase key in .env.local.",
  );
  process.exit(1);
}

const registry = JSON.parse(
  await readFile(join(here, "..", "registry.json"), "utf8"),
);

const db = createClient(url, key, { auth: { persistSession: false } });

console.log(`Seeding ${registry.length} rules…`);

// Replace existing seed contents so re-running is idempotent.
const { error: delError } = await db
  .from("rules")
  .delete()
  .neq("id", "00000000-0000-0000-0000-000000000000");
if (delError) {
  console.error("Failed clearing table:", delError.message);
  process.exit(1);
}

const { error } = await db.from("rules").insert(registry);
if (error) {
  console.error("Insert failed:", error.message);
  process.exit(1);
}

console.log("✓ Seed complete.");
