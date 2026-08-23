import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.env.BOUNDARY_CHECK_ROOT ?? process.cwd();
const sourceRoots = ["apps", "packages"];
const fileExtensions = new Set([".ts", ".tsx"]);
const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*from\s+)?["']([^"']+)["']/g;

const violations = [];

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "coverage") {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath));
    } else if (fileExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalize(p) {
  return p.split(path.sep).join("/");
}

function moduleNameFromFile(file) {
  const normalized = normalize(path.relative(root, file));
  const match = normalized.match(/^packages\/modules\/([^/]+)\//);
  return match?.[1] ?? null;
}

function moduleLayerFromFile(file) {
  const normalized = normalize(path.relative(root, file));
  const match = normalized.match(/^packages\/modules\/([^/]+)\/(domain|application|infrastructure|contracts)\//);
  if (!match) return null;
  return { moduleName: match[1], layer: match[2] };
}

function layerFromModuleImport(specifier) {
  const match = specifier.match(/^@tonala\/modules\/([^/]+)\/(domain|application|infrastructure|contracts)$/);
  if (!match) return null;
  return { moduleName: match[1], layer: match[2] };
}

function isSharedImport(specifier) {
  return specifier.startsWith("@tonala/shared/") || specifier === "@tonala/ui" || specifier === "@tonala/config";
}

function isProjectionPublicImport(specifier) {
  return specifier === "@tonala/shared/projections" || specifier === "@tonala/shared/projections/public";
}

function isExternalImport(specifier) {
  return !specifier.startsWith(".") && !specifier.startsWith("@tonala/");
}

function resolveRelativeImport(file, specifier) {
  if (!specifier.startsWith(".")) return null;
  const basePath = path.resolve(path.dirname(file), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx")
  ];
  return candidates.find((candidate) => normalize(candidate).startsWith(normalize(root)));
}

function checkImport(file, specifier) {
  const normalizedFile = normalize(path.relative(root, file));
  const owningModule = moduleNameFromFile(file);
  const owningLayer = moduleLayerFromFile(file);
  const moduleImport = layerFromModuleImport(specifier);
  const relativeImportLayer = resolveRelativeImport(file, specifier);
  const targetLayer = relativeImportLayer ? moduleLayerFromFile(relativeImportLayer) : moduleImport;

  if (normalizedFile.startsWith("packages/shared/projections/") && specifier.startsWith("@tonala/modules/")) {
    violations.push(`${normalizedFile}: shared/projections cannot import modules (${specifier})`);
    return;
  }

  if (normalizedFile.startsWith("packages/shared/outbox/") && specifier.startsWith("@tonala/shared/projections")) {
    violations.push(`${normalizedFile}: shared/outbox cannot import projections (${specifier})`);
    return;
  }

  if (normalizedFile.startsWith("packages/shared/") && specifier.startsWith("@tonala/modules/")) {
    violations.push(`${normalizedFile}: shared packages cannot import modules (${specifier})`);
    return;
  }

  if (
    normalizedFile.startsWith("packages/modules/") &&
    specifier.includes("shared/outbox/infrastructure")
  ) {
    violations.push(`${normalizedFile}: business modules cannot import outbox worker infrastructure (${specifier})`);
    return;
  }

  if (owningModule && moduleImport && moduleImport.moduleName !== owningModule && moduleImport.layer !== "contracts") {
    violations.push(
      `${normalizedFile}: module "${owningModule}" cannot import ${moduleImport.layer} from module "${moduleImport.moduleName}" (${specifier})`
    );
    return;
  }

  if (owningLayer && targetLayer && owningLayer.moduleName === targetLayer.moduleName) {
    if (owningLayer.layer === "domain" && ["application", "infrastructure"].includes(targetLayer.layer)) {
      violations.push(`${normalizedFile}: domain cannot import ${targetLayer.layer} (${specifier})`);
      return;
    }
    if (owningLayer.layer === "contracts" && targetLayer.layer === "infrastructure") {
      violations.push(`${normalizedFile}: contracts cannot import infrastructure (${specifier})`);
      return;
    }
  }

  if (owningLayer && targetLayer && owningLayer.moduleName !== targetLayer.moduleName && targetLayer.layer !== "contracts") {
    violations.push(
      `${normalizedFile}: module "${owningLayer.moduleName}" cannot import ${targetLayer.layer} from module "${targetLayer.moduleName}" (${specifier})`
    );
    return;
  }

  if (normalizedFile.startsWith("apps/") && moduleImport?.layer === "infrastructure") {
    violations.push(`${normalizedFile}: apps cannot import module infrastructure directly (${specifier})`);
    return;
  }

  if (normalizedFile.startsWith("apps/") && targetLayer?.layer === "infrastructure") {
    violations.push(`${normalizedFile}: apps cannot import module infrastructure directly (${specifier})`);
    return;
  }

  if (owningLayer?.layer === "domain" && /^(next|drizzle-orm|@supabase\/|pg$)/.test(specifier)) {
    violations.push(`${normalizedFile}: domain cannot depend on delivery or infrastructure package (${specifier})`);
    return;
  }

  if (
    normalizedFile.startsWith("packages/shared/outbox/application/") &&
    /^(drizzle-orm|pg$|@tonala\/shared\/database)$/.test(specifier)
  ) {
    violations.push(`${normalizedFile}: outbox application cannot depend on database infrastructure (${specifier})`);
    return;
  }

  if (
    normalizedFile.startsWith("packages/shared/projections/application/") &&
    /^(drizzle-orm|pg$|@tonala\/shared\/database|@tonala\/shared\/outbox|next|@supabase\/)/.test(specifier)
  ) {
    violations.push(`${normalizedFile}: projections application cannot depend on delivery or database infrastructure (${specifier})`);
    return;
  }

  if (
    normalizedFile.startsWith("packages/shared/outbox/contracts/") &&
    specifier.includes("/infrastructure")
  ) {
    violations.push(`${normalizedFile}: outbox contracts cannot import infrastructure (${specifier})`);
    return;
  }

  if (
    normalizedFile.startsWith("packages/shared/projections/contracts/") &&
    (specifier.includes("/infrastructure") || /^(drizzle-orm|pg$|next|@supabase\/)/.test(specifier))
  ) {
    violations.push(`${normalizedFile}: projection contracts cannot depend on infrastructure or delivery (${specifier})`);
    return;
  }

  if (
    normalizedFile.startsWith("packages/shared/database/") &&
    specifier.startsWith("@tonala/shared/projections/application")
  ) {
    violations.push(`${normalizedFile}: shared/database cannot import projections application (${specifier})`);
    return;
  }

  if (
    normalizedFile.startsWith("apps/") &&
    specifier.startsWith("@tonala/shared/projections/infrastructure")
  ) {
    violations.push(`${normalizedFile}: apps cannot import projections infrastructure directly (${specifier})`);
    return;
  }

  if (
    normalizedFile.startsWith("packages/modules/") &&
    specifier.startsWith("@tonala/shared/projections") &&
    !isProjectionPublicImport(specifier)
  ) {
    violations.push(`${normalizedFile}: modules must import projections through the public API (${specifier})`);
    return;
  }

  if (
    normalizedFile.startsWith("packages/modules/command-center/projections/") &&
    /^(next|drizzle-orm|pg$|@supabase\/|@tonala\/shared\/database|@tonala\/shared\/outbox)/.test(specifier)
  ) {
    violations.push(`${normalizedFile}: command-center projections cannot depend on delivery, database, or outbox (${specifier})`);
    return;
  }

  if (
    normalizedFile.startsWith("packages/modules/command-center/application/") &&
    specifier === "@tonala/shared/database"
  ) {
    violations.push(`${normalizedFile}: command-center application cannot access database directly (${specifier})`);
    return;
  }

  if (specifier.startsWith("@tonala/") && !moduleImport && !isSharedImport(specifier)) {
    violations.push(`${normalizedFile}: unknown internal import alias (${specifier})`);
    return;
  }

  if (!owningModule && normalizedFile.startsWith("packages/modules/") && isExternalImport(specifier)) {
    return;
  }
}

const files = [];
for (const dir of sourceRoots) {
  try {
    files.push(...await listFiles(path.join(root, dir)));
  } catch {
    // Missing roots are allowed during early scaffolding.
  }
}

for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(importPattern)) {
    checkImport(file, match[1]);
  }
}

if (violations.length > 0) {
  console.error("Module boundary violations:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}
