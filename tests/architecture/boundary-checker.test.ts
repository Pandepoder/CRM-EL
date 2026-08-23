import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const checkerPath = path.resolve("scripts/check-module-boundaries.mjs");

async function createFixture(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "tonala-boundaries-"));
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(root, relativePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content);
  }
  return root;
}

describe("module boundary checker", () => {
  it("allows modules to import public contracts from other modules", async () => {
    const root = await createFixture({
      "packages/modules/contacts/application/index.ts":
        'import { value } from "@tonala/modules/territory/contracts";\nexport const ok = value;\n',
      "packages/modules/territory/contracts/index.ts": "export const value = true;\n"
    });

    try {
      await expect(execFileAsync("node", [checkerPath], {
        env: { ...process.env, BOUNDARY_CHECK_ROOT: root }
      })).resolves.toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects module imports of another module infrastructure", async () => {
    const root = await createFixture({
      "packages/modules/contacts/application/index.ts":
        'import { value } from "@tonala/modules/territory/infrastructure";\nexport const bad = value;\n',
      "packages/modules/territory/infrastructure/index.ts": "export const value = true;\n"
    });

    try {
      await expect(execFileAsync("node", [checkerPath], {
        env: { ...process.env, BOUNDARY_CHECK_ROOT: root }
      })).rejects.toThrow(/cannot import infrastructure/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects domain dependencies on infrastructure packages", async () => {
    const root = await createFixture({
      "packages/modules/contacts/domain/index.ts": 'import pg from "pg";\nexport const bad = pg;\n'
    });

    try {
      await expect(execFileAsync("node", [checkerPath], {
        env: { ...process.env, BOUNDARY_CHECK_ROOT: root }
      })).rejects.toThrow(/domain cannot depend/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects shared projection imports of modules", async () => {
    const root = await createFixture({
      "packages/shared/projections/application/index.ts":
        'import { value } from "@tonala/modules/contacts/contracts";\nexport const bad = value;\n'
    });

    try {
      await expect(execFileAsync("node", [checkerPath], {
        env: { ...process.env, BOUNDARY_CHECK_ROOT: root }
      })).rejects.toThrow(/shared\/projections cannot import modules/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects projection application dependencies on database infrastructure", async () => {
    const root = await createFixture({
      "packages/shared/projections/application/index.ts":
        'import { db } from "@tonala/shared/database";\nexport const bad = db;\n'
    });

    try {
      await expect(execFileAsync("node", [checkerPath], {
        env: { ...process.env, BOUNDARY_CHECK_ROOT: root }
      })).rejects.toThrow(/projections application cannot depend/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects projection application dependencies on outbox internals", async () => {
    const root = await createFixture({
      "packages/shared/projections/application/live-runner.ts":
        'import { OutboxWorker } from "@tonala/shared/outbox";\nexport const bad = OutboxWorker;\n'
    });

    try {
      await expect(execFileAsync("node", [checkerPath], {
        env: { ...process.env, BOUNDARY_CHECK_ROOT: root }
      })).rejects.toThrow(/projections application cannot depend/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects projection application dependencies on command center", async () => {
    const root = await createFixture({
      "packages/shared/projections/application/live-runner.ts":
        'import { value } from "@tonala/modules/command-center/contracts";\nexport const bad = value;\n'
    });

    try {
      await expect(execFileAsync("node", [checkerPath], {
        env: { ...process.env, BOUNDARY_CHECK_ROOT: root }
      })).rejects.toThrow(/shared\/projections cannot import modules/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects shared outbox dependencies on projections", async () => {
    const root = await createFixture({
      "packages/shared/outbox/application/index.ts":
        'import { LiveProjectionRunner } from "@tonala/shared/projections";\nexport const bad = LiveProjectionRunner;\n'
    });

    try {
      await expect(execFileAsync("node", [checkerPath], {
        env: { ...process.env, BOUNDARY_CHECK_ROOT: root }
      })).rejects.toThrow(/shared\/outbox cannot import projections/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects command center projection dependencies on outbox or database", async () => {
    const root = await createFixture({
      "packages/modules/command-center/projections/index.ts":
        'import { Database } from "@tonala/shared/database";\nexport type Bad = Database;\n'
    });

    try {
      await expect(execFileAsync("node", [checkerPath], {
        env: { ...process.env, BOUNDARY_CHECK_ROOT: root }
      })).rejects.toThrow(/command-center projections cannot depend/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects module imports of projection internals", async () => {
    const root = await createFixture({
      "packages/modules/command-center/application/index.ts":
        'import { ProjectionRegistry } from "@tonala/shared/projections/application";\nexport const bad = ProjectionRegistry;\n'
    });

    try {
      await expect(execFileAsync("node", [checkerPath], {
        env: { ...process.env, BOUNDARY_CHECK_ROOT: root }
      })).rejects.toThrow(/modules must import projections through the public API/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects app imports of projections infrastructure", async () => {
    const root = await createFixture({
      "apps/web/src/index.ts":
        'import { value } from "@tonala/shared/projections/infrastructure";\nexport const bad = value;\n'
    });

    try {
      await expect(execFileAsync("node", [checkerPath], {
        env: { ...process.env, BOUNDARY_CHECK_ROOT: root }
      })).rejects.toThrow(/apps cannot import projections infrastructure directly/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects shared database imports of projections application", async () => {
    const root = await createFixture({
      "packages/shared/database/index.ts":
        'import { value } from "@tonala/shared/projections/application";\nexport const bad = value;\n'
    });

    try {
      await expect(execFileAsync("node", [checkerPath], {
        env: { ...process.env, BOUNDARY_CHECK_ROOT: root }
      })).rejects.toThrow(/shared\/database cannot import projections application/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
