import { useState, useEffect } from 'react';
import type { IconData } from './types';

export const useIconsData = () => {
  const [icons, setIcons] = useState<IconData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadIcons = async () => {
      setIsLoading(true);

      const { iconsData } = await import('../icons-data');
      if (isMounted) {
        setIcons(iconsData);
        setIsLoading(false);
      }
    };

    loadIcons();

    return () => {
      isMounted = false;
    };
  }, []);

  return { icons, isLoading };
};
