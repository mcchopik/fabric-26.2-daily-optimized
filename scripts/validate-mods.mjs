import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const modsDir = join(root, "mods");
const jars = readdirSync(modsDir).filter((file) => file.endsWith(".jar")).sort();
const mods = new Map();
const warnings = [];

for (const file of jars) {
  const jar = join(modsDir, file);
  execFileSync("unzip", ["-tq", jar], { stdio: "ignore" });

  let raw;
  try {
    raw = execFileSync("unzip", ["-p", jar, "fabric.mod.json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(`${file}: missing fabric.mod.json`);
  }

  let metadata;
  try {
    metadata = JSON.parse(raw);
  } catch {
    const id = raw.match(/"id"\s*:\s*"([^"]+)"/)?.[1];
    const version = raw.match(/"version"\s*:\s*"([^"]+)"/)?.[1];
    if (!id || !version) {
      throw new Error(`${file}: unreadable fabric.mod.json`);
    }
    metadata = { id, version };
    warnings.push(`${file}: metadata uses Fabric-tolerated non-strict JSON`);
  }

  if (mods.has(metadata.id)) {
    throw new Error(
      `duplicate mod id ${metadata.id}: ${mods.get(metadata.id).file}, ${file}`,
    );
  }
  mods.set(metadata.id, { file: basename(file), version: metadata.version });
}

if (mods.has("modernica") && mods.has("modernfix")) {
  throw new Error("Modernica and ModernFix cannot be installed together");
}

console.log(`Validated ${jars.length} JAR files and ${mods.size} unique mod ids.`);
for (const warning of warnings) console.warn(`Warning: ${warning}`);
