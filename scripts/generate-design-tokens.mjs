import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const tokenFile = path.join(rootDir, 'design/tokens.json');

const raw = await readFile(tokenFile, 'utf8');
const tokens = sortKeys(JSON.parse(raw));

const semantic = tokens.color.semantic;
const lightColor = semantic.light;
const darkColor = semantic.dark;
const spacing = tokens.spacing;
const radius = tokens.radius;
const typography = tokens.typography;
const elevation = tokens.elevation;
const motion = tokens.motion;
const components = tokens.components;

const tsOutput = `/* AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n * Note for non-coders: this TypeScript file is generated from design/tokens.json\n * so web and iOS can share one visual language.\n */\n\nexport const designTokens = ${JSON.stringify(tokens, null, 2)} as const;\n`;

const cssLines = [
  '/* AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. */',
  '/* Note for non-coders: these CSS variables are generated from design/tokens.json. */',
  ':root {',
  '  color-scheme: light dark;',
  ...Object.entries(lightColor).map(([key, value]) => `  --color-${kebab(key)}: ${value};`),
  ...Object.entries(spacing).map(([key, value]) => `  --space-${kebab(key)}: ${value}px;`),
  ...Object.entries(radius).map(([key, value]) => `  --radius-${kebab(key)}: ${value}px;`),
  ...Object.entries(typography.scale).map(([key, value]) => `  --font-size-${kebab(key)}: ${value}px;`),
  `  --font-family-base: ${typography.fontFamily};`,

  // Elevation
  ...Object.entries(elevation).map(([key, value]) => {
    const { x, y, blur, spread, color, opacity } = value;
    const { r, g, b } = hexToRgb(color);
    return `  --elevation-${kebab(key)}: ${x}px ${y}px ${blur}px ${spread}px rgba(${r}, ${g}, ${b}, ${opacity});`;
  }),

  // Motion
  ...Object.entries(motion.duration).map(([key, value]) => `  --motion-duration-${kebab(key)}: ${value}ms;`),
  ...Object.entries(motion.easing).map(([key, value]) => `  --motion-easing-${kebab(key)}: cubic-bezier(${value.join(', ')});`),

  // Components
  ...Object.entries(components).flatMap(([compName, props]) =>
    Object.entries(props).map(([propName, value]) => {
        let val = value;
        if (typeof value === 'number' && propName !== 'fontWeight' && propName !== 'opacity') {
            val = `${value}px`;
        }
        return `  --component-${kebab(compName)}-${kebab(propName)}: ${val};`;
    })
  ),
  '}',
  '',
  '@media (prefers-color-scheme: dark) {',
  '  :root {',
  ...Object.entries(darkColor).map(([key, value]) => `    --color-${kebab(key)}: ${value};`),
  '  }',
  '}'
];

const webThemeOutput = `/* AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n * Note for non-coders: this web theme is generated from design/tokens.json\n * so changing one token file updates web + iOS together.\n */\n\nimport { createTheme } from '@mui/material/styles';\nimport { designTokens } from './generated/designTokens';\n\ntype ThemeMode = 'light' | 'dark';\n\nconst semantic = designTokens.color.semantic;\nconst radius = designTokens.radius;\nconst components = designTokens.components;\nconst typographyScale = designTokens.typography.scale;\nconst typographyWeight = designTokens.typography.weight;\n\nfunction buildTheme(mode: ThemeMode) {\n  const modeSemantic = semantic[mode];\n\n  return createTheme({\n    palette: {\n      mode,\n      primary: {\n        main: modeSemantic.primary,\n        dark: modeSemantic.primaryStrong,\n        contrastText: modeSemantic.onPrimary,\n      },\n      secondary: {\n        main: modeSemantic.secondary,\n      },\n      error: {\n        main: modeSemantic.error,\n      },\n      success: {\n        main: modeSemantic.success,\n      },\n      warning: {\n        main: modeSemantic.warning,\n      },\n      info: {\n        main: modeSemantic.info,\n      },\n      background: {\n        default: modeSemantic.background,\n        paper: modeSemantic.surface,\n      },\n      text: {\n        primary: modeSemantic.textPrimary,\n        secondary: modeSemantic.textSecondary,\n      },\n      divider: modeSemantic.borderSubtle,\n    },\n    shape: {\n      borderRadius: radius.lg,\n    },\n    typography: {\n      fontFamily: designTokens.typography.fontFamily,\n      h1: {\n        fontSize: \`${'${typographyScale.display / 16}'}rem\`,\n        fontWeight: typographyWeight.extrabold,\n        letterSpacing: '-0.02em',\n      },\n      h2: {\n        fontSize: \`${'${typographyScale.title / 16}'}rem\`,\n        fontWeight: typographyWeight.bold,\n        letterSpacing: '-0.01em',\n      },\n      h3: {\n        fontSize: \`${'${typographyScale.section / 16}'}rem\`,\n        fontWeight: typographyWeight.bold,\n      },\n      body1: {\n        fontSize: \`${'${typographyScale.bodyLarge / 16}'}rem\`,\n      },\n      body2: {\n        fontSize: \`${'${typographyScale.body / 16}'}rem\`,\n      },\n      caption: {\n        fontSize: \`${'${typographyScale.caption / 16}'}rem\`,\n      },\n      button: {\n        textTransform: 'none',\n        fontWeight: typographyWeight.semibold,\n      },\n    },\n    components: {\n      MuiButton: {\n        styleOverrides: {\n          root: {\n            borderRadius: radius.md,\n            padding: \`${'${designTokens.spacing.sm}'}px ${'${designTokens.spacing.lg}'}px\`,\n          },\n          containedPrimary: {\n            boxShadow: mode === 'dark' ? 'none' : '0 6px 16px rgba(211, 47, 47, 0.24)',\n          },\n        },\n      },\n      MuiCard: {\n        styleOverrides: {\n          root: {\n            borderRadius: components.card.radius,\n            boxShadow: mode === 'dark' ? 'none' : 'var(--elevation-card)',\n            border: \`1px solid ${'${modeSemantic.borderSubtle}'}\`,\n          },\n        },\n      },\n      MuiPaper: {\n        styleOverrides: {\n          root: {\n            borderRadius: radius.xl,\n          },\n        },\n      },\n      MuiChip: {\n        styleOverrides: {\n          root: {\n            borderRadius: components.chip.radius,\n            fontWeight: typographyWeight.bold,\n            height: components.chip.height,\n          },\n        },\n      },\n      MuiAlert: {\n        styleOverrides: {\n          root: {\n            borderRadius: radius.lg,\n          },\n        },\n      },\n    },\n  });\n}\n\nexport const lightTheme = buildTheme('light');\nexport const darkTheme = buildTheme('dark');\n`;

const swiftOutput = `// AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.\n// Note for non-coders: iOS reads shared design tokens from this generated file.\n\nimport SwiftUI\n\nenum DesignTokens {\n
    struct ShadowToken {
        let x: CGFloat
        let y: CGFloat
        let blur: CGFloat
        let spread: CGFloat
        let color: String
        let opacity: Double
    }

    enum Colors {\n${Object.entries(lightColor)
  .map(([key, value]) => `        static let light${pascal(key)} = "${value}"`)
  .join('\n')}\n${Object.entries(darkColor)
  .map(([key, value]) => `        static let dark${pascal(key)} = "${value}"`)
  .join('\n')}\n    }\n\n    enum Spacing {\n${Object.entries(spacing)
  .map(([key, value]) => `        static let ${camel(key)}: CGFloat = ${value}`)
  .join('\n')}\n    }\n\n    enum Radius {\n${Object.entries(radius)
  .map(([key, value]) => `        static let ${camel(key)}: CGFloat = ${value}`)
  .join('\n')}\n    }\n\n    enum Typography {\n${Object.entries(typography.scale)
  .map(([key, value]) => `        static let ${camel(key)}: CGFloat = ${value}`)
  .join('\n')}\n    }\n\n    enum Elevation {\n${Object.entries(elevation)
  .map(([key, value]) => {
      const { x, y, blur, spread, color, opacity } = value;
      return `        static let ${camel(key)} = ShadowToken(x: ${x}, y: ${y}, blur: ${blur}, spread: ${spread}, color: "${color}", opacity: ${opacity})`;
  })
  .join('\n')}\n    }\n\n    enum Motion {\n${Object.entries(motion.duration)
  .map(([key, value]) => `        static let duration${pascal(key)}: Double = ${value}`)
  .join('\n')}\n${Object.entries(motion.easing)
  .map(([key, value]) => `        static let easing${pascal(key)}: [Double] = [${value.join(', ')}]`)
  .join('\n')}\n    }\n\n    enum Components {\n${Object.entries(components)
  .map(([compName, props]) => {
      return `        enum ${pascal(compName)} {\n${
          Object.entries(props).map(([propName, value]) => {
             if (typeof value === 'string') {
                 return `            static let ${camel(propName)} = "${value}"`;
             } else {
                 return `            static let ${camel(propName)}: CGFloat = ${value}`;
             }
          }).join('\n')
      }\n        }`;
  })
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

function pascal(input) {
  return input[0].toUpperCase() + input.slice(1);
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

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}
