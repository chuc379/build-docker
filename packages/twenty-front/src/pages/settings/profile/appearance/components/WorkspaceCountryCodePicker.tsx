import { useMutation } from '@apollo/client/react';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';

import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { useInvalidateMetadataStore } from '@/metadata-store/hooks/useInvalidateMetadataStore';
import { useHasPermissionFlag } from '@/settings/roles/hooks/useHasPermissionFlag';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { Select } from '@/ui/input/components/Select';
import { useCountries } from '@/ui/input/components/internal/hooks/useCountries';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import {
  PermissionFlagType,
  UpdateWorkspaceDocument,
} from '~/generated-metadata/graphql';
import { logError } from '~/utils/logError';

export const WorkspaceCountryCodePicker = () => {
  const { t } = useLingui();
  const countries = useCountries();
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const setCurrentWorkspace = useSetAtomState(currentWorkspaceState);
  const { enqueueErrorSnackBar } = useSnackBar();
  const { invalidateMetadataStore } = useInvalidateMetadataStore();
  const hasWorkspacePermission = useHasPermissionFlag(
    PermissionFlagType.WORKSPACE,
  );
  const [updateWorkspaceCountryCode, { loading: isUpdating }] = useMutation(
    UpdateWorkspaceDocument,
  );

  const options = useMemo(
    () =>
      [...countries]
        .sort((countryA, countryB) =>
          countryA.countryName.localeCompare(countryB.countryName),
        )
        .map((country) => ({
          label: `${country.countryName} (${country.countryCode})`,
          value: country.countryCode,
          searchKeywords: `${country.countryName} ${country.countryCode} +${country.callingCode}`,
        })),
    [countries],
  );

  const handleChange = async (countryCode: string) => {
    try {
      const result = await updateWorkspaceCountryCode({
        variables: { input: { workspaceCountryCode: countryCode } },
      });

      const savedCountryCode =
        result.data?.updateWorkspace.workspaceCountryCode;

      if (!savedCountryCode) {
        throw new Error('Workspace region was not saved');
      }

      setCurrentWorkspace((workspace) =>
        workspace === null
          ? null
          : { ...workspace, workspaceCountryCode: savedCountryCode },
      );
      invalidateMetadataStore();
    } catch (error) {
      logError(error);
      enqueueErrorSnackBar({
        apolloError: error instanceof Error ? error : new Error(String(error)),
      });
    }
  };

  const selectedCountryCode = currentWorkspace?.workspaceCountryCode ?? '';

  return (
    <Select<string>
      dropdownId="workspace-region"
      label={t`Region`}
      dropdownWidthAuto
      fullWidth
      withSearchInput
      emptyOption={{
        label: t`Select a region`,
        value: '',
      }}
      value={selectedCountryCode}
      options={options}
      onChange={handleChange}
      disabled={isUpdating || !hasWorkspacePermission}
    />
  );
};
