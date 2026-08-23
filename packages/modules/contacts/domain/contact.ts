import { DomainError } from "@tonala/shared/errors";
import { type EntityId } from "@tonala/shared/kernel";

export const ContactStatus = {
  Active: "active"
} as const;

export type ContactStatus = (typeof ContactStatus)[keyof typeof ContactStatus];

export type DisplayName = string & { readonly __brand: "DisplayName" };

export type Contact = Readonly<{
  contactId: EntityId;
  displayName: DisplayName;
  phoneNumber: string | null;
  status: ContactStatus;
  createdByUserId: EntityId;
  createdAt: Date;
  version: 1;
}>;

export const displayNameMaxLength = 120;

export function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function createDisplayName(value: string): DisplayName {
  const normalized = normalizeDisplayName(value);
  if (normalized.length === 0) {
    throw new DomainError({
      code: "contact_display_name_required",
      message: "Contact displayName is required.",
      publicMessage: "Contact name is required."
    });
  }
  if (normalized.length > displayNameMaxLength) {
    throw new DomainError({
      code: "contact_display_name_too_long",
      message: `Contact displayName exceeds ${displayNameMaxLength} characters.`,
      publicMessage: "Contact name is too long.",
      diagnostic: { maxLength: displayNameMaxLength }
    });
  }
  return normalized as DisplayName;
}

export function createMinimalContact(input: {
  readonly contactId: EntityId;
  readonly displayName: string;
  readonly phoneNumber?: string | null;
  readonly createdByUserId: EntityId;
  readonly createdAt: Date;
}): Contact {
  return {
    contactId: input.contactId,
    displayName: createDisplayName(input.displayName),
    phoneNumber: input.phoneNumber?.trim() || null,
    status: ContactStatus.Active,
    createdByUserId: input.createdByUserId,
    createdAt: input.createdAt,
    version: 1
  };
}
