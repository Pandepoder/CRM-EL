export type InboxConversationDTO = {
  id: string;
  contactId?: string | null;
  channel: string;
  externalId: string;
  status: string;
  assignedToUserId?: string | null;
  lastMessageAt: Date;
  createdAt: Date;
  
  // Joins
  contactName?: string | null;
  contactPhone?: string | null;
  assignedToName?: string | null;
};

export type InboxMessageDTO = {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  content: string;
  status: string;
  sentByUserId?: string | null;
  createdAt: Date;
};

export type ReceiveMessageCommand = {
  channel: string;
  externalId: string;
  content: string;
};

export type SendMessageCommand = {
  conversationId: string;
  content: string;
  sentByUserId: string;
};
