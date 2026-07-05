import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
// L2 real behavior proof: calls the actual loadSessionLogs function
// with malformed timestamps and shows the NaN guard in action.
// No vitest / mock framework. Real fs, real function, real output.
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSessionLogs } from "../../src/infra/session-cost-usage";

const root = mkdtempSync(join(tmpdir(), "openclaw-pr99418-"));
const sessionsDir = join(root, "agents", "main", "sessions");
mkdirSync(sessionsDir, { recursive: true });

const sessionFile = join(sessionsDir, "sess-proof.jsonl");

// Session file with: 1 malformed timestamp, 1 valid timestamp
const lines = [
  JSON.stringify({
    type: "message",
    timestamp: "not-a-valid-date-string",
    message: { role: "user", content: "bad timestamp entry" },
  }),
  JSON.stringify({
    type: "message",
    timestamp: "2026-02-21T17:47:00.000Z",
    message: { role: "assistant", content: "valid timestamp entry" },
  }),
];

writeFileSync(sessionFile, lines.join("\n"), "utf-8");

console.log("========== L2 REAL BEHAVIOR PROOF — PR #99418 ==========");
console.log("Function: loadSessionLogs (actual runtime, no mocks)");
console.log("");

console.log("--- Session file contents ---");
console.log(lines.join("\n"));
console.log("");

console.log("--- Calling loadSessionLogs ---");
const logs = await loadSessionLogs({ sessionFile });

console.log(`Entries returned: ${logs?.length ?? "null"}`);
console.log("");

if (logs) {
  for (const [i, entry] of logs.entries()) {
    console.log(`Entry ${i}:`);
    console.log(`  role:      ${entry.role}`);
    console.log(`  content:   ${entry.content}`);
    console.log(`  timestamp: ${entry.timestamp} (type: ${typeof entry.timestamp})`);
    console.log(`  isFinite:  ${Number.isFinite(entry.timestamp)}`);
    console.log("");
  }
}

// Verify: malformed → 0, valid → > 0
const malformed = logs?.[0]?.timestamp;
const valid = logs?.[1]?.timestamp;
console.log("--- Verification ---");
console.log(
  `Malformed timestamp → ${malformed} (expected 0): ${malformed === 0 ? "✅ PASS" : "❌ FAIL"}`,
);
console.log(
  `Valid timestamp     → ${valid} (expected > 0): ${typeof valid === "number" && valid > 0 ? "✅ PASS" : "❌ FAIL"}`,
);

// Cleanup
rmSync(root, { recursive: true, force: true });
console.log("");
console.log("Cleanup done. Evidence collected from real function call.");
