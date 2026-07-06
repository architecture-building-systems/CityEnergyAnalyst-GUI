import { useEffect } from 'react';

import routes from 'constants/routes.json';
import useNavigationStore from 'stores/navigationStore';
import Loading from 'components/Loading';
import { useIsValidUser, useUserQuery } from 'stores/useUserQuery';
import { useFetchServerLimits } from 'stores/serverStore';
import { isElectron } from 'utils/electron';

const UserCheckGate = ({ children }) => {
  const { data: userInfo, isLoading } = useUserQuery();
  const isValidUser = useIsValidUser();
  const fetchServerLimits = useFetchServerLimits();

  const { push } = useNavigationStore();

  useEffect(() => {
    // Wait for userInfo to be loaded
    // Also not fetch server limits if Electron or localuser
    if (isElectron() || !isValidUser) return;

    if (!userInfo?.onboarded) {
      // Redirect to onboarding page
      push(routes.ONBOARDING);
    } else if (window.location.pathname === routes.ONBOARDING) {
      // Redirect to project page
      push(routes.PROJECT);
    }
    fetchServerLimits();
  }, [userInfo, isValidUser, fetchServerLimits, push]);

  if (isLoading) return <Loading />;

  return children;
};

export default UserCheckGate;
