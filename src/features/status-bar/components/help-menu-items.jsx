import { isElectron, openExternal } from 'utils/electron';

export const HelpMenuItemsLabel = ({ url, name }) => {
  const navigate = () => {
    if (isElectron()) openExternal(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  return <div onClick={navigate}>{name}</div>;
};
