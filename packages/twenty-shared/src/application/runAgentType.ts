export type RunAgentMessageRole = 'user' | 'assistant';

export type RunAgentMessageContentPart =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'file' | 'image';
      data: string | Uint8Array;
      mediaType?: string;
      mimeType?: string;
      filename?: string;
    };

export type RunAgentMessage = {
  role: RunAgentMessageRole;
  content: string | RunAgentMessageContentPart[];
};

export type RunAgentInput = {
  agentUniversalIdentifier: string;
  runAsWorkspaceMemberId?: string;
} & (
  | { prompt: string; messages?: never }
  | { messages: RunAgentMessage[]; prompt?: never }
);

export type RunAgentResult = {
  result: object | null;
  error: string | null;
  success: boolean;
};
