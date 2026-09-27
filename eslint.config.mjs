import js from "@eslint/js";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
  {
    // docs/ no es codigo del proyecto: guarda informes y los scripts sueltos que
    // los acompanan, que no siguen (ni deben seguir) las reglas del monorepo.
    //
    // scripts/local/ tampoco: son pruebas y datos simulados que nunca se versionan
    // (estan excluidos de git). Sin esto, escribir un script de prueba con fetch o
    // FormData rompe `pnpm lint` con "no-undef" y parece que el fallo es del repo.
    ignores: ["node_modules/**", "outputs/**", "output/**", "work/**", "coverage/**", "dist/**", "docs/**", "scripts/local/**", "apps/*/public/**", "apps/**/.next/**", "apps/**/next-env.d.ts"]
  },
  js.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly"
      }
    }
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        allowDefaultProject: ["drizzle.config.ts", "vitest.config.ts"],
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          "vars": "all",
          "varsIgnorePattern": "^_",
          "args": "after-used",
          "argsIgnorePattern": "^_"
        }
      ],
      "no-console": ["warn", { "allow": ["warn", "error"] }]
    },
    plugins: {
      "unused-imports": unusedImports
    }
  },
  {
    files: ["scripts/**/*.cjs", "scripts/**/*.js"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        __filename: "readonly"
      }
    },
    rules: {
      "no-console": "off",
      "no-undef": "off"
    }
  },
  {
    files: ["scripts/**/*.ts", "scripts/**/*.js"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/unbound-method": "off"
    }
  },
  {
    // El registro estructurado es el único sitio de la aplicación que escribe en la consola a
    // propósito, en cualquier nivel: todo lo demás pasa por `registrar` y `registrarError`.
    files: ["apps/web/src/lib/registro.ts"],
    rules: {
      "no-console": "off"
    }
  }
);
