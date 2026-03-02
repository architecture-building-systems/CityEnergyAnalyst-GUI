import { useEffect } from 'react';
import { useToolFormStore } from '../stores/tool-form-store';

const useDescriptionAutoHide = (setHeaderCollapsed) => {
  const activeKey = useToolFormStore((state) => state.activeKey);

  useEffect(() => {
    if (activeKey.length > 0) {
      setHeaderCollapsed(true);
    }
  }, [activeKey, setHeaderCollapsed]);
};

export default useDescriptionAutoHide;
