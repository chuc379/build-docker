import { DEFAULT_WORKSPACE_LOGO } from '@/constants/DefaultWorkspaceLogo';
import { Img } from 'react-email';

const logoStyle = {
  marginBottom: '40px',
};

export const Logo = () => {
  return (
    <Img
      src={DEFAULT_WORKSPACE_LOGO}
      alt="TinaCRM logo"
      width="150"
      height="61"
      style={logoStyle}
    />
  );
};
