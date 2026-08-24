import { eq, desc } from "drizzle-orm";
import type { Database} from "@tonala/shared/database";
import { schema } from "@tonala/shared/database";
import type { InboxConversationDTO, InboxMessageDTO } from "../contracts/index.js";

export class DrizzleInboxRepository {
  constructor(private readonly db: Database) {}

  async getConversations(): Promise<InboxConversationDTO[]> {
    const rows = await this.db.select({
      conv: schema.inboxConversations,
      contact: schema.contacts,
      user: schema.userProfiles
    })
    .from(schema.inboxConversations)
    .leftJoin(schema.contacts, eq(schema.inboxConversations.contactId, schema.contacts.id))
    .leftJoin(schema.userProfiles, eq(schema.inboxConversations.assignedToUserId, schema.userProfiles.id))
    .orderBy(desc(schema.inboxConversations.lastMessageAt));

    return rows.map(r => ({
      id: r.conv.id,
      contactId: r.conv.contactId,
      channel: r.conv.channel,
      externalId: r.conv.externalId,
      status: r.conv.status,
      assignedToUserId: r.conv.assignedToUserId,
      lastMessageAt: r.conv.lastMessageAt,
      createdAt: r.conv.createdAt,
      contactName: r.contact?.displayName ?? null,
      contactPhone: r.contact?.phone ?? null,
      assignedToName: r.user?.displayName ?? null
    }));
  }

  async getMessages(conversationId: string): Promise<InboxMessageDTO[]> {
    const messages = await this.db.query.inboxMessages.findMany({
      where: eq(schema.inboxMessages.conversationId, conversationId),
      orderBy: [schema.inboxMessages.createdAt]
    });
    return messages as InboxMessageDTO[];
  }
}
