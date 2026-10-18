import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

let envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*["']?(.*?)["']?\s*$/);
    if (match) {
      envVars[match[1]] = match[2];
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("[Keep-Alive Test] Testing connection to Supabase...");
console.log(`[Keep-Alive Test] URL: ${supabaseUrl}`);

if (!supabaseUrl || !supabaseKey) {
  console.error("[Keep-Alive Test] Missing SUPABASE URL or KEY in .env");
  process.exit(1);
}

const pingUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/profiles?select=id&limit=1`;
const startTime = Date.now();

try {
  const response = await fetch(pingUrl, {
    method: "GET",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  const durationMs = Date.now() - startTime;
  const status = response.status;
  const body = await response.text();

  if (response.ok) {
    console.log(`[Keep-Alive Test] ✅ SUCCESS! Supabase responded with HTTP ${status} in ${durationMs}ms`);
    console.log(`[Keep-Alive Test] Response body: ${body}`);
  } else {
    console.error(`[Keep-Alive Test] ❌ FAILED! HTTP ${status}: ${body}`);
    process.exit(1);
  }
} catch (error) {
  console.error("[Keep-Alive Test] ❌ Network error:", error);
  process.exit(1);
}
