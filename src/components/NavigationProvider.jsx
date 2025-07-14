import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import useNavigationStore from 'stores/navigationStore';

const NavigationProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const setNavigation = useNavigationStore((state) => state.setNavigation);
  const setLocation = useNavigationStore((state) => state.setLocation);

  useEffect(() => {
    setNavigation(navigate, location);
  }, [navigate, location, setNavigation]);

  useEffect(() => {
    setLocation(location);
  }, [location, setLocation]);

  return children;
};

export default NavigationProvider;
