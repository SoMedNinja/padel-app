import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const tokenFile = path.join(rootDir, 'design/tokens.json');

const raw = await readFile(tokenFile, 'utf8');
const tokens = sortKeys(JSON.parse(raw));

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

const webThemeOutput = `/* AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n * Note for non-coders: this web theme is generated from design/tokens.json\n * so changing one token file updates web + iOS together.\n */\n\nimport { createTheme } from '@mui/material/styles';\nimport { designTokens } from './generated/designTokens';\n\nconst semantic = designTokens.color.semantic;\nconst radius = designTokens.radius;\nconst typographyScale = designTokens.typography.scale;\nconst typographyWeight = designTokens.typography.weight;\n\nconst theme = createTheme({\n  palette: {\n    primary: {\n      main: semantic.primary,\n      dark: semantic.primaryStrong,\n      contrastText: semantic.onPrimary,\n    },\n    secondary: {\n      main: semantic.secondary,\n    },\n    success: {\n      main: semantic.success,\n    },\n    warning: {\n      main: semantic.warning,\n    },\n    info: {\n      main: semantic.info,\n    },\n    background: {\n      default: semantic.background,\n      paper: semantic.surface,\n    },\n    text: {\n      primary: semantic.textPrimary,\n      secondary: semantic.textSecondary,\n    },\n    divider: semantic.borderSubtle,\n  },\n  shape: {\n    borderRadius: radius.lg,\n  },\n  typography: {\n    fontFamily: designTokens.typography.fontFamily,\n    h1: {\n      fontSize: \`${'${typographyScale.display / 16}'}rem\`,\n      fontWeight: typographyWeight.extrabold,\n      letterSpacing: '-0.02em',\n    },\n    h2: {\n      fontSize: \`${'${typographyScale.title / 16}'}rem\`,\n      fontWeight: typographyWeight.bold,\n      letterSpacing: '-0.01em',\n    },\n    h3: {\n      fontSize: \`${'${typographyScale.section / 16}'}rem\`,\n      fontWeight: typographyWeight.bold,\n    },\n    body1: {\n      fontSize: \`${'${typographyScale.bodyLarge / 16}'}rem\`,\n    },\n    body2: {\n      fontSize: \`${'${typographyScale.body / 16}'}rem\`,\n    },\n    caption: {\n      fontSize: \`${'${typographyScale.caption / 16}'}rem\`,\n    },\n    button: {\n      textTransform: 'none',\n      fontWeight: typographyWeight.semibold,\n    },\n  },\n  components: {\n    MuiButton: {\n      styleOverrides: {\n        root: {\n          borderRadius: radius.md,\n          padding: \`${'${designTokens.spacing.sm}'}px ${'${designTokens.spacing.lg}'}px\`,\n        },\n        containedPrimary: {\n          boxShadow: '0 6px 16px rgba(211, 47, 47, 0.24)',\n        },\n      },\n    },\n    MuiCard: {\n      styleOverrides: {\n        root: {\n          borderRadius: radius.xl,\n          boxShadow: '0 5px 10px rgba(0, 0, 0, 0.08)',\n          border: \`1px solid ${'${semantic.borderSubtle}'}\`,\n        },\n      },\n    },\n    MuiPaper: {\n      styleOverrides: {\n        root: {\n          borderRadius: radius.xl,\n        },\n      },\n    },\n    MuiChip: {\n      styleOverrides: {\n        root: {\n          borderRadius: radius.pill,\n          fontWeight: typographyWeight.bold,\n        },\n      },\n    },\n    MuiAlert: {\n      styleOverrides: {\n        root: {\n          borderRadius: radius.lg,\n        },\n      },\n    },\n  },\n});\n\nexport default theme;\n`;

const swiftOutput = `// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n// Note for non-coders: iOS reads shared design tokens from this generated file.\n\nimport SwiftUI\n\nenum DesignTokens {\n    enum Colors {\n${Object.entries(color)
  .map(([key, value]) => `        static let ${camel(key)} = \"${value}\"`)
  .join('\n')}\n    }\n\n    enum Spacing {\n${Object.entries(spacing)
  .map(([key, value]) => `        static let ${camel(key)}: CGFloat = ${value}`)
  .join('\n')}\n    }\n\n    enum Radius {\n${Object.entries(radius)
  .map(([key, value]) => `        static let ${camel(key)}: CGFloat = ${value}`)
  .join('\n')}\n    }\n\n    enum Typography {\n${Object.entries(typography.scale)
  .map(([key, value]) => `        static let ${camel(key)}: CGFloat = ${value}`)
  .join('\n')}\n    }\n}\n`;

await mkdir(path.join(rootDir, 'src/generated'), { recursive: true });
await mkdir(path.join(rootDir, 'ios-native/PadelNative/Theme'), { recursive: true });

await writeFile(path.join(rootDir, 'src/generated/designTokens.ts'), tsOutput, 'utf8');
await writeFile(path.join(rootDir, 'src/generated/design-tokens.css'), `${cssLines.join('\n')}\n`, 'utf8');
await writeFile(path.join(rootDir, 'src/theme.ts'), webThemeOutput, 'utf8');
await writeFile(path.join(rootDir, 'ios-native/PadelNative/Theme/GeneratedDesignTokens.swift'), swiftOutput, 'utf8');

console.log('Generated deterministic web and iOS token artifacts from design/tokens.json');

function kebab(input) {
  return input.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function camel(input) {
  return input[0].toLowerCase() + input.slice(1);
}

function sortKeys(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
      }, {});
  }

  return value;
}
