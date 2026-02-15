import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const contractSource = readFileSync('contracts/openapi/padel-contract.yaml', 'utf8');
const expectedHash = createHash('sha256').update(contractSource).digest('hex');

const generatedHash = readFileSync('contracts/generated/contract-hash.txt', 'utf8').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).at(-1) ?? ''; 
const tsContent = readFileSync('src/contracts/generated/contractModels.ts', 'utf8');
const swiftContent = readFileSync('ios-native/PadelNative/Services/Generated/ContractModels.swift', 'utf8');

const failures = [];

if (generatedHash !== expectedHash) {
  failures.push('contracts/generated/contract-hash.txt is stale. Run npm run contract:generate.');
}
if (!tsContent.includes(`CONTRACT_SCHEMA_HASH = "${expectedHash}"`)) {
  failures.push('TypeScript generated contract models are stale.');
}
if (!swiftContent.includes(`static let hash = "${expectedHash}"`)) {
  failures.push('Swift generated contract models are stale.');
}

const highRiskChecks = [
  ['Auth has refresh-token flow', /refresh_token/],
  ['Schedule votes support slot preferences', /slot_preferences/],
  ['Match supports 1v1 mode', /1v1/],
  ['Match supports 2v2 mode', /2v2/],
];

for (const [name, regex] of highRiskChecks) {
  if (!regex.test(contractSource)) {
    failures.push(`High-risk parity check failed: ${name}.`);
  }
}

if (failures.length > 0) {
  console.error('Contract parity checks failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Contract parity checks passed.');
