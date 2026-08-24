import type { Result} from "@tonala/shared/kernel";
import { ok, err } from "@tonala/shared/kernel";
import type { Database} from "@tonala/shared/database";
import { schema } from "@tonala/shared/database";
import type { ReceiveMessageCommand, SendMessageCommand } from "../contracts/index.js";
import { eq } from "drizzle-orm";

export class InboxApplication {
  constructor(
    private readonly db: Database
  ) {}

  async receiveMessage(command: ReceiveMessageCommand): Promise<Result<string>> {
    return this.db.transaction(async (tx) => {
      let conv = await tx.query.inboxConversations.findFirst({
        where: eq(schema.inboxConversations.externalId, command.externalId)
      });

      if (!conv) {
        // TODO: Phone is encrypted with random IV AES-256-GCM. 
        // To find by phone, we need to add a deterministic `phone_hash` column to the `contacts` table.
        // For now, we leave contactId as null.
        const contact = null;

        const [newConv] = await tx.insert(schema.inboxConversations).values({
          channel: command.channel,
          externalId: command.externalId,
          contactId: null,
          lastMessageAt: new Date()
        }).returning();
        if (!newConv) throw new Error("Failed to create conversation");
        conv = newConv;
      } else {
        await tx.update(schema.inboxConversations)
          .set({ lastMessageAt: new Date(), status: "open" })
          .where(eq(schema.inboxConversations.id, conv.id));
      }

      await tx.insert(schema.inboxMessages).values({
        conversationId: conv.id,
        direction: "inbound",
        content: command.content,
      });

      return ok(conv.id);
    });
  }

  async sendMessage(command: SendMessageCommand): Promise<Result<string>> {
    return this.db.transaction(async (tx) => {
      const [msg] = await tx.insert(schema.inboxMessages).values({
        conversationId: command.conversationId,
        direction: "outbound",
        content: command.content,
        sentByUserId: command.sentByUserId
      }).returning();
      if (!msg) throw new Error("Failed to send message");

      await tx.update(schema.inboxConversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(schema.inboxConversations.id, command.conversationId));

      return ok(msg.id);
    });
  }
}
