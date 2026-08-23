import { type Brand, err, ok, type Result } from "@tonala/shared/kernel";

import { InvalidProjectionName, InvalidProjectionVersion } from "./errors.js";

export type ProjectionName = Brand<string, "ProjectionName">;
export type ProjectionVersion = Brand<string, "ProjectionVersion">;

export type ProjectionIdentity = Readonly<{
  projectionName: ProjectionName;
  projectionVersion: ProjectionVersion;
}>;

export const ProjectionMode = {
  Live: "live",
  Rebuild: "rebuild"
} as const;

export type ProjectionMode = (typeof ProjectionMode)[keyof typeof ProjectionMode];

export const ProjectionStatus = {
  Active: "active",
  Rebuilding: "rebuilding",
  Paused: "paused",
  Failed: "failed",
  Deprecated: "deprecated"
} as const;

export type ProjectionStatus = (typeof ProjectionStatus)[keyof typeof ProjectionStatus];

const projectionNamePattern = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const projectionVersionPattern = /^v[1-9][0-9]*$/;
const maxProjectionNameLength = 64;

export function createProjectionName(value: string): Result<ProjectionName, InvalidProjectionName> {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return err(new InvalidProjectionName("Projection name cannot be empty."));
  }
  if (trimmed.length > maxProjectionNameLength) {
    return err(new InvalidProjectionName(`Projection name cannot exceed ${maxProjectionNameLength} characters.`));
  }
  if (!projectionNamePattern.test(trimmed)) {
    return err(new InvalidProjectionName("Projection name must be lowercase snake_case."));
  }
  return ok(trimmed as ProjectionName);
}

export function createProjectionVersion(value: string): Result<ProjectionVersion, InvalidProjectionVersion> {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return err(new InvalidProjectionVersion("Projection version cannot be empty."));
  }
  if (!projectionVersionPattern.test(trimmed)) {
    return err(new InvalidProjectionVersion("Projection version must use v followed by a positive integer."));
  }
  return ok(trimmed as ProjectionVersion);
}

export function createProjectionIdentity(input: {
  readonly projectionName: ProjectionName;
  readonly projectionVersion: ProjectionVersion;
}): ProjectionIdentity {
  return {
    projectionName: input.projectionName,
    projectionVersion: input.projectionVersion
  };
}

export function projectionIdentityKey(identity: ProjectionIdentity): string {
  return `${identity.projectionName}:${identity.projectionVersion}`;
}

export function compareProjectionIdentity(left: ProjectionIdentity, right: ProjectionIdentity): number {
  return projectionIdentityKey(left).localeCompare(projectionIdentityKey(right));
}

export function projectionConsumerName(identity: ProjectionIdentity): string {
  return `projection.${identity.projectionName}.${identity.projectionVersion}`;
}
