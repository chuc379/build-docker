type EmailAddress = string | string[];

export type SendMessageInput = {
  body: string;
  subject: string;
  fromHandle?: string;
  to: EmailAddress;
  cc?: EmailAddress;
  bcc?: EmailAddress;
  html: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType: string;
    cid?: string;
  }[];
  inReplyTo?: string;
  threadExternalId?: string;
  references?: string[];
};
