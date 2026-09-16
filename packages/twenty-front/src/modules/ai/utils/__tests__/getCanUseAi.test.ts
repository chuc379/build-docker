import { getCanUseAi } from '@/ai/utils/getCanUseAi';
import { BillingEntitlementKey } from '~/generated-metadata/graphql';

describe('getCanUseAi', () => {
  it('allows AI when billing is disabled', () => {
    expect(
      getCanUseAi({
        isBillingEnabled: false,
        billingEntitlements: undefined,
      }),
    ).toBe(true);
  });

  it('blocks AI when billing is enabled without entitlements', () => {
    expect(
      getCanUseAi({
        isBillingEnabled: true,
        billingEntitlements: undefined,
      }),
    ).toBe(false);
  });

  it('blocks AI when the AI_AGENT entitlement is disabled', () => {
    expect(
      getCanUseAi({
        isBillingEnabled: true,
        billingEntitlements: [
          { key: BillingEntitlementKey.AI_AGENT, value: false },
        ],
      }),
    ).toBe(false);
  });

  it('allows AI when the AI_AGENT entitlement is enabled', () => {
    expect(
      getCanUseAi({
        isBillingEnabled: true,
        billingEntitlements: [
          { key: BillingEntitlementKey.AI_AGENT, value: true },
        ],
      }),
    ).toBe(true);
  });

  it('does not use an unrelated entitlement to allow AI', () => {
    expect(
      getCanUseAi({
        isBillingEnabled: true,
        billingEntitlements: [{ key: BillingEntitlementKey.SSO, value: true }],
      }),
    ).toBe(false);
  });
});
