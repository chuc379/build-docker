import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { billingState } from '@/client-config/states/billingState';
import { getCanUseAi } from '@/ai/utils/getCanUseAi';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export const useCanUseAi = (): boolean => {
  const billing = useAtomStateValue(billingState);
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);

  return getCanUseAi({
    isBillingEnabled: billing?.isBillingEnabled ?? false,
    billingEntitlements: currentWorkspace?.billingEntitlements,
  });
};
