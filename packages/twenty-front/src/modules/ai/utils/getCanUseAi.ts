import {
  BillingEntitlementKey,
  type BillingEntitlement,
} from '~/generated-metadata/graphql';

export const getCanUseAi = ({
  isBillingEnabled,
  billingEntitlements,
}: {
  isBillingEnabled: boolean;
  billingEntitlements: Pick<BillingEntitlement, 'key' | 'value'>[] | undefined;
}): boolean =>
  !isBillingEnabled ||
  billingEntitlements?.some(
    ({ key, value }) => key === BillingEntitlementKey.AI_AGENT && value,
  ) === true;
