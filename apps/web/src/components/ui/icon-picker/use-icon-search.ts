import { useMemo } from 'react';
import Fuse from 'fuse.js';
import type { IconData } from './types';

export const useIconSearch = (icons: IconData[], searchQuery: string) => {
  const fuseInstance = useMemo(() => {
    return new Fuse(icons, {
      keys: ['name', 'tags', 'categories'],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: true,
    });
  }, [icons]);

  const filteredIcons = useMemo(() => {
    if (searchQuery.trim() === '') {
      return icons;
    }

    const results = fuseInstance.search(searchQuery.toLowerCase().trim());
    return results.map((result) => result.item);
  }, [searchQuery, icons, fuseInstance]);

  return filteredIcons;
};
