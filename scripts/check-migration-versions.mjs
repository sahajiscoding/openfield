import { readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();

if (files.length === 0) {
  throw new Error("No Supabase migrations found.");
}

const allowedLegacy = new Set(["001", "002", "003", "004"]);
const versions = [];

for (const file of files) {
  const version = file.split("_", 1)[0];

  if (!allowedLegacy.has(version) && !/^\d{14}$/.test(version)) {
    throw new Error(
      `Invalid migration version "${version}" in ${file}. Use a 14-digit UTC timestamp for every new migration.`,
    );
  }

  versions.push(version);
}

const duplicates = versions.filter(
  (version, index) => versions.indexOf(version) !== index,
);

if (duplicates.length > 0) {
  throw new Error(
    `Duplicate migration versions detected: ${[...new Set(duplicates)].join(", ")}`,
  );
}

console.log(`Validated Supabase migration versions: ${versions.join(", ")}`);
