import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const tokenFile = path.join(rootDir, 'design/tokens.json');

const raw = await readFile(tokenFile, 'utf8');
const tokens = JSON.parse(raw);

const color = tokens.color.semantic;
const spacing = tokens.spacing;
const radius = tokens.radius;
const typography = tokens.typography;

const tsOutput = `/* AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n * Note for non-coders: this TypeScript file is generated from design/tokens.json\n * so web and iOS can share one visual language.\n */\n\nexport const designTokens = ${JSON.stringify(tokens, null, 2)} as const;\n`;

const cssLines = [
  '/* AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. */',
  '/* Note for non-coders: these CSS variables are generated from design/tokens.json. */',
  ':root {',
  ...Object.entries(color).map(([key, value]) => `  --color-${kebab(key)}: ${value};`),
  ...Object.entries(spacing).map(([key, value]) => `  --space-${kebab(key)}: ${value}px;`),
  ...Object.entries(radius).map(([key, value]) => `  --radius-${kebab(key)}: ${value}px;`),
  ...Object.entries(typography.scale).map(([key, value]) => `  --font-size-${kebab(key)}: ${value}px;`),
  `  --font-family-base: ${typography.fontFamily};`,
  '}'
];

const swiftOutput = `// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n// Note for non-coders: iOS reads shared design tokens from this generated file.\n\nimport SwiftUI\n\nenum DesignTokens {\n    enum Colors {\n${Object.entries(color).map(([key, value]) => `        static let ${camel(key)} = \"${value}\"`).join('\n')}\n    }\n\n    enum Spacing {\n${Object.entries(spacing).map(([key, value]) => `        static let ${camel(key)}: CGFloat = ${value}`).join('\n')}\n    }\n\n    enum Radius {\n${Object.entries(radius).map(([key, value]) => `        static let ${camel(key)}: CGFloat = ${value}`).join('\n')}\n    }\n\n    enum Typography {\n${Object.entries(typography.scale).map(([key, value]) => `        static let ${camel(key)}: CGFloat = ${value}`).join('\n')}\n    }\n}\n`;

await mkdir(path.join(rootDir, 'src/generated'), { recursive: true });
await mkdir(path.join(rootDir, 'ios-native/PadelNative/Theme'), { recursive: true });

await writeFile(path.join(rootDir, 'src/generated/designTokens.ts'), tsOutput, 'utf8');
await writeFile(path.join(rootDir, 'src/generated/design-tokens.css'), `${cssLines.join('\n')}\n`, 'utf8');
await writeFile(path.join(rootDir, 'ios-native/PadelNative/Theme/GeneratedDesignTokens.swift'), swiftOutput, 'utf8');

console.log('Generated web and iOS token artifacts from design/tokens.json');

function kebab(input) {
  return input.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function camel(input) {
  return input[0].toLowerCase() + input.slice(1);
}
