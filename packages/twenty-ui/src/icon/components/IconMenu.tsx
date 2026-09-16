import IconMenuRaw from '@assets/icons/menu.svg?react';
import { type IconComponentProps } from '@ui/icon/types/IconComponent';
import { useTheme } from '@ui/theme-constants';

type IconMenuProps = Pick<IconComponentProps, 'size'>;

export const IconMenu = (props: IconMenuProps) => {
  const theme = useTheme();
  const size = props.size ?? theme.icon.size.lg;

  return <IconMenuRaw height={size} width={size} />;
};
