import { useCanUseAi } from '@/ai/hooks/useCanUseAi';
import { useHasAccessTokenPair } from '@/auth/hooks/useHasAccessTokenPair';
import { SettingsProtectedRouteWrapper } from '@/settings/components/SettingsProtectedRouteWrapper';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { PermissionFlagType } from '~/generated-metadata/graphql';

jest.mock('@/ai/hooks/useCanUseAi', () => ({
  useCanUseAi: jest.fn(),
}));

jest.mock('@/auth/hooks/useHasAccessTokenPair', () => ({
  useHasAccessTokenPair: jest.fn(),
}));

jest.mock('@/settings/roles/hooks/useHasPermissionFlag', () => ({
  useHasPermissionFlag: jest.fn(),
}));

jest.mock('@/workspace/hooks/useIsFeatureEnabled', () => ({
  useIsFeatureEnabled: jest.fn(),
}));

const renderAiSettingsRoute = () =>
  render(
    <MemoryRouter initialEntries={[getSettingsPath(SettingsPath.AI)]}>
      <Routes>
        <Route
          element={
            <SettingsProtectedRouteWrapper
              settingsPermission={PermissionFlagType.AI_SETTINGS}
              requiresAiEntitlement
            />
          }
        >
          <Route
            path={getSettingsPath(SettingsPath.AI)}
            element={<div>AI settings</div>}
          />
        </Route>
        <Route
          path={getSettingsPath(SettingsPath.ProfilePage)}
          element={<div>Profile settings</div>}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('SettingsProtectedRouteWrapper', () => {
  beforeEach(() => {
    (useHasAccessTokenPair as jest.Mock).mockReturnValue(true);
    (useHasPermissionFlag as jest.Mock).mockReturnValue(true);
    (useIsFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useCanUseAi as jest.Mock).mockReturnValue(true);
  });

  it('allows AI settings with the AI_AGENT entitlement', () => {
    renderAiSettingsRoute();

    expect(screen.getByText('AI settings')).toBeInTheDocument();
  });

  it('redirects direct AI settings access without the entitlement', () => {
    (useCanUseAi as jest.Mock).mockReturnValue(false);

    renderAiSettingsRoute();

    expect(screen.getByText('Profile settings')).toBeInTheDocument();
  });
});
