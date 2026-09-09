import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

function revision() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try { return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); }
  catch { return "unknown"; }
}

mkdirSync("dist", { recursive: true });
writeFileSync("dist/version.json", `${JSON.stringify({ revision: revision(), builtAt: new Date().toISOString() })}\n`);
