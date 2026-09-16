import { AiChatErrorRenderer } from '@/ai/components/AiChatErrorRenderer';
import { AgentMessageRole } from '@/ai/constants/AgentMessageRole';
import { useRetryChatMessage } from '@/ai/hooks/useRetryChatMessage';
import { agentChatDisplayedThreadState } from '@/ai/states/agentChatDisplayedThreadState';
import { agentChatErrorComponentFamilyState } from '@/ai/states/agentChatErrorComponentFamilyState';
import { agentChatIsStreamingComponentFamilyState } from '@/ai/states/agentChatIsStreamingComponentFamilyState';
import { agentChatMessageComponentFamilySelector } from '@/ai/states/selectors/agentChatMessageComponentFamilySelector';
import { agentChatMessageIdsComponentSelector } from '@/ai/states/selectors/agentChatMessageIdsComponentSelector';
import { useAtomComponentFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilySelectorValue';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { useAtomComponentSelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentSelectorValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { styled } from '@linaria/react';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledErrorWrapper = styled.div`
  padding-top: ${themeCssVariables.spacing[3]};
`;

export const AiChatErrorUnderMessageList = () => {
  const { retryChatMessage } = useRetryChatMessage();
  const agentChatDisplayedThread = useAtomStateValue(
    agentChatDisplayedThreadState,
  );
  const agentChatError = useAtomComponentFamilyStateValue(
    agentChatErrorComponentFamilyState,
    { threadId: agentChatDisplayedThread },
  );
  const agentChatIsStreaming = useAtomComponentFamilyStateValue(
    agentChatIsStreamingComponentFamilyState,
    { threadId: agentChatDisplayedThread },
  );

  const agentChatMessageIds = useAtomComponentSelectorValue(
    agentChatMessageIdsComponentSelector,
  );

  const lastMessageId = agentChatMessageIds.at(-1);
  const agentChatMessage = useAtomComponentFamilySelectorValue(
    agentChatMessageComponentFamilySelector,
    { messageId: lastMessageId },
  );

  // Show under the list when the last bubble is the user prompt (no partial
  // assistant yet). If a partial assistant is last, AiChatMessage shows it.
  const showError =
    isDefined(agentChatError) &&
    !agentChatIsStreaming &&
    agentChatMessage?.role === AgentMessageRole.USER;

  if (!showError) {
    return null;
  }

  return (
    <StyledErrorWrapper>
      <AiChatErrorRenderer error={agentChatError} onRetry={retryChatMessage} />
    </StyledErrorWrapper>
  );
};
