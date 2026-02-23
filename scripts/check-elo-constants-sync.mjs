import { readFileSync } from 'node:fs';

const canonicalPath = 'src/shared/elo/constants.ts';
const weeklySummaryPath = 'supabase/functions/weekly-summary/shared_elo/constants.ts';

const canonical = parseConstants(canonicalPath);
const weeklySummary = parseConstants(weeklySummaryPath);

const canonicalKeys = Object.keys(canonical).sort();
const weeklySummaryKeys = Object.keys(weeklySummary).sort();

const failures = [];

if (canonicalKeys.join('|') !== weeklySummaryKeys.join('|')) {
  failures.push('The two ELO constants files export different constant names.');
}

for (const key of canonicalKeys) {
  if (!(key in weeklySummary)) continue;
  if (canonical[key] !== weeklySummary[key]) {
    failures.push(
      `${key} is out of sync: canonical=${canonical[key]} vs weekly-summary=${weeklySummary[key]}`
    );
  }
}

if (failures.length > 0) {
  console.error('ELO constants sync check failed.');
  // Note for non-coders: this tells us exactly what drifted so we can fix one source quickly.
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('ELO constants are in sync between runtime and weekly-summary contexts.');

function parseConstants(path) {
  const content = readFileSync(path, 'utf8');
  const map = {};

  const exportConstRegex = /^export const\s+([A-Z0-9_]+)\s*=\s*([^;]+);$/gm;
  let match = exportConstRegex.exec(content);

  while (match) {
    const [, name, rawValue] = match;
    map[name] = normalizeValue(rawValue.trim());
    match = exportConstRegex.exec(content);
  }

  return map;
}

function normalizeValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}
