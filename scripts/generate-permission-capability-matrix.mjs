import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, 'docs/permissions-capability-matrix.json');

const source = JSON.parse(await readFile(sourcePath, 'utf8'));
const capabilities = ['notifications', 'background_refresh', 'biometric_passkey', 'calendar'];
const states = ['allowed', 'blocked', 'limited', 'action_needed'];
const locales = ['sv', 'en'];

const webLocale = source.default_locale_by_client.web;
const iosLocale = source.default_locale_by_client.ios;

const tsOutput = buildTsOutput({ source, capabilities, states, locales, webLocale });
const swiftOutput = buildSwiftOutput({ source, capabilities, states, locales, webLocale, iosLocale });

await mkdir(path.join(rootDir, 'src/shared'), { recursive: true });
await mkdir(path.join(rootDir, 'ios-native/PadelNative/Models'), { recursive: true });

await writeFile(path.join(rootDir, 'src/shared/permissionCapabilityMatrix.ts'), tsOutput, 'utf8');
await writeFile(path.join(rootDir, 'ios-native/PadelNative/Models/SharedPermissionsState.swift'), swiftOutput, 'utf8');

console.log('Generated shared permission capability matrix artifacts for web and iOS.');

function buildTsOutput({ source, capabilities, states, locales, webLocale }) {
  const matrixByLocale = Object.fromEntries(locales.map((locale) => [locale, buildLocaleMatrix(source, capabilities, states, locale)]));
  const capabilityLabelsByLocale = Object.fromEntries(
    capabilities.map((capability) => [capability, source.capabilities[capability].title])
  );

  const webCapabilityLabels = Object.fromEntries(
    capabilities.map((capability) => [capability, source.capabilities[capability].title[webLocale]])
  );

  return `/* AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n * Note for non-coders: this file is generated from docs/permissions-capability-matrix.json\n * so web and iOS use the same permission wording source.\n */\n\nimport { PermissionCapabilityMatrix, PermissionCapability, SharedPermissionState } from "../types/permissions";\n\nexport const SUPPORTED_PERMISSION_COPY_LOCALES = ${JSON.stringify(source.supported_locales)} as const;\nexport type PermissionCopyLocale = (typeof SUPPORTED_PERMISSION_COPY_LOCALES)[number];\n\nexport const DEFAULT_PERMISSION_LOCALE_BY_CLIENT = ${JSON.stringify(source.default_locale_by_client, null, 2)} as const;\n\nexport const SHARED_PERMISSION_STATE_LABELS_BY_LOCALE = ${JSON.stringify(source.state_labels, null, 2)} as const;\n\nexport const SHARED_PERMISSION_CAPABILITY_LABELS_BY_LOCALE = ${JSON.stringify(capabilityLabelsByLocale, null, 2)} as const;\n\nexport const SHARED_PERMISSION_CAPABILITY_MATRIX_BY_LOCALE = ${JSON.stringify(matrixByLocale, null, 2)} as const;\n\nexport const SHARED_PERMISSION_PLATFORM_DIFFERENCES_BY_LOCALE = ${JSON.stringify(source.platform_differences, null, 2)} as const;\n\n// Note for non-coders:\n// Existing web screens default to Swedish. These constants keep old imports working.\nexport const SHARED_PERMISSION_CAPABILITY_MATRIX: PermissionCapabilityMatrix = ${JSON.stringify(buildLocaleMatrix(source, capabilities, states, webLocale), null, 2)};\n\nexport const SHARED_PERMISSION_PLATFORM_DIFFERENCES = SHARED_PERMISSION_PLATFORM_DIFFERENCES_BY_LOCALE[DEFAULT_PERMISSION_LOCALE_BY_CLIENT.web];\n\nexport const SHARED_PERMISSION_STATE_LABELS: Record<SharedPermissionState, string> = SHARED_PERMISSION_STATE_LABELS_BY_LOCALE[DEFAULT_PERMISSION_LOCALE_BY_CLIENT.web];\n\nexport const SHARED_PERMISSION_CAPABILITY_LABELS: Record<PermissionCapability, string> = ${JSON.stringify(webCapabilityLabels, null, 2)};\n`;
}

function buildSwiftOutput({ source, capabilities, states, locales, iosLocale }) {
  return `// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n// Note for non-coders: this file is generated from docs/permissions-capability-matrix.json\n// so iOS guidance matches the shared permission matrix source.\n\nimport Foundation\n\n// Note for non-coders:\n// These are the same four state words we also use on web so both apps describe permissions consistently.\nenum SharedPermissionState: String {\n    case allowed = "allowed"\n    case blocked = "blocked"\n    case limited = "limited"\n    case actionNeeded = "action_needed"\n\n    var label: String {\n        SharedPermissionGeneratedCopy.stateLabelsByLocale[SharedPermissionCapability.defaultLocale]?[self] ?? ""\n    }\n}\n\nstruct SharedPermissionSemanticCopy {\n    let explanation: String\n    let actionLabel: String\n}\n\nenum SharedPermissionCapability: String {\n    case notifications\n    case backgroundRefresh = "background_refresh"\n    case biometricPasskey = "biometric_passkey"\n    case calendar\n\n    static let defaultLocale: SharedPermissionCopyLocale = .${iosLocale}\n\n    var title: String {\n        SharedPermissionGeneratedCopy.capabilityTitlesByLocale[Self.defaultLocale]?[self] ?? ""\n    }\n\n    var subtitle: String {\n        SharedPermissionGeneratedCopy.capabilitySubtitlesByLocale[Self.defaultLocale]?[self] ?? ""\n    }\n\n    // Note for non-coders:\n    // This dictionary is our source of truth for each capability + state pair, including guidance and button text.\n    private static var semanticMatrix: [SharedPermissionCapability: [SharedPermissionState: SharedPermissionSemanticCopy]] {\n        SharedPermissionGeneratedCopy.semanticMatrixByLocale[defaultLocale] ?? [:]\n    }\n\n    func guidance(for state: SharedPermissionState) -> String {\n        SharedPermissionCapability.semanticMatrix[self]?[state]?.explanation ?? ""\n    }\n\n    func actionLabel(for state: SharedPermissionState) -> String {\n        SharedPermissionCapability.semanticMatrix[self]?[state]?.actionLabel ?? "Retry check"\n    }\n\n    static var platformDifferencesCopy: String {\n        SharedPermissionGeneratedCopy.platformDifferencesByLocale[defaultLocale] ?? ""\n    }\n}\n\nenum SharedPermissionCopyLocale: String {\n    case sv\n    case en\n}\n\nenum SharedPermissionGeneratedCopy {\n    static let supportedLocales: [SharedPermissionCopyLocale] = [.sv, .en]\n\n    static let stateLabelsByLocale: [SharedPermissionCopyLocale: [SharedPermissionState: String]] = [\n${locales
  .map((locale) => `        .${locale}: [\n${states
    .map((state) => `            .${swiftStateCase(state)}: ${swiftString(source.state_labels[locale][state])}`)
    .join(',\n')}\n        ]`)
  .join(',\n')}\n    ]\n\n    static let capabilityTitlesByLocale: [SharedPermissionCopyLocale: [SharedPermissionCapability: String]] = [\n${locales
  .map(
    (locale) => `        .${locale}: [\n${capabilities
      .map((capability) => `            .${swiftCapabilityCase(capability)}: ${swiftString(source.capabilities[capability].title[locale])}`)
      .join(',\n')}\n        ]`
  )
  .join(',\n')}\n    ]\n\n    static let capabilitySubtitlesByLocale: [SharedPermissionCopyLocale: [SharedPermissionCapability: String]] = [\n${locales
  .map(
    (locale) => `        .${locale}: [\n${capabilities
      .map((capability) => `            .${swiftCapabilityCase(capability)}: ${swiftString(source.capabilities[capability].subtitle[locale])}`)
      .join(',\n')}\n        ]`
  )
  .join(',\n')}\n    ]\n\n    static let semanticMatrixByLocale: [SharedPermissionCopyLocale: [SharedPermissionCapability: [SharedPermissionState: SharedPermissionSemanticCopy]]] = [\n${locales
  .map(
    (locale) => `        .${locale}: [\n${capabilities
      .map(
        (capability) => `            .${swiftCapabilityCase(capability)}: [\n${states
          .map(
            (state) => `                .${swiftStateCase(state)}: SharedPermissionSemanticCopy(\n                    explanation: ${swiftString(source.capabilities[capability].states[state].explanation[locale])},\n                    actionLabel: ${swiftString(source.capabilities[capability].states[state].action_label[locale])}\n                )`
          )
          .join(',\n')}\n            ]`
      )
      .join(',\n')}\n        ]`
  )
  .join(',\n')}\n    ]\n\n    static let platformDifferencesByLocale: [SharedPermissionCopyLocale: String] = [\n${locales.map((locale) => `        .${locale}: ${swiftString(source.platform_differences[locale])}`).join(',\n')}\n    ]\n}\n`;
}

function buildLocaleMatrix(source, capabilities, states, locale) {
  const matrix = {};

  for (const capability of capabilities) {
    matrix[capability] = {};

    for (const state of states) {
      matrix[capability][state] = {
        explanation: source.capabilities[capability].states[state].explanation[locale],
        actionLabel: source.capabilities[capability].states[state].action_label[locale],
      };
    }
  }

  return matrix;
}

function swiftStateCase(state) {
  return state === 'action_needed' ? 'actionNeeded' : state;
}

function swiftCapabilityCase(capability) {
  if (capability === 'background_refresh') return 'backgroundRefresh';
  if (capability === 'biometric_passkey') return 'biometricPasskey';
  return capability;
}

function swiftString(value) {
  return JSON.stringify(value)
    .replace(/\\u2028/g, '\\\\u2028')
    .replace(/\\u2029/g, '\\\\u2029');
}
