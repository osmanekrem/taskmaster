import { useMemo } from 'react';
import type { IconData } from './types';

export interface CategorizedIcon {
  name: string;
  icons: IconData[];
}

export const useIconCategorization = (
  icons: IconData[],
  categorized: boolean,
  searchQuery: string,
): CategorizedIcon[] => {
  const categorizedIcons = useMemo(() => {
    if (!categorized || searchQuery.trim() !== '') {
      return [{ name: 'All Icons', icons }];
    }

    const categories = new Map<string, IconData[]>();

    icons.forEach((icon) => {
      if (icon.categories && icon.categories.length > 0) {
        icon.categories.forEach((category) => {
          if (!categories.has(category)) {
            categories.set(category, []);
          }
          categories.get(category)!.push(icon);
        });
      } else {
        const category = 'Other';
        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)!.push(icon);
      }
    });

    return Array.from(categories.entries())
      .map(([name, icons]) => ({ name, icons }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [icons, categorized, searchQuery]);

  return categorizedIcons;
};
