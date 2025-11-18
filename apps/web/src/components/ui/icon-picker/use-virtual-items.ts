import { useMemo } from 'react';
import type { CategorizedIcon } from './use-icon-categorization';

export interface VirtualItem {
  type: 'category' | 'row';
  categoryIndex: number;
  rowIndex?: number;
  icons?: CategorizedIcon['icons'];
}

export const useVirtualItems = (
  categorizedIcons: CategorizedIcon[],
): VirtualItem[] => {
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];

    categorizedIcons.forEach((category, categoryIndex) => {
      items.push({ type: 'category', categoryIndex });

      const rows = [];
      for (let i = 0; i < category.icons.length; i += 5) {
        rows.push(category.icons.slice(i, i + 5));
      }

      rows.forEach((rowIcons, rowIndex) => {
        items.push({
          type: 'row',
          categoryIndex,
          rowIndex,
          icons: rowIcons,
        });
      });
    });

    return items;
  }, [categorizedIcons]);

  return virtualItems;
};

export const useCategoryIndices = (
  virtualItems: VirtualItem[],
  categorizedIcons: CategorizedIcon[],
): Record<string, number> => {
  const categoryIndices = useMemo(() => {
    const indices: Record<string, number> = {};

    virtualItems.forEach((item, index) => {
      if (item.type === 'category') {
        indices[categorizedIcons[item.categoryIndex].name] = index;
      }
    });

    return indices;
  }, [virtualItems, categorizedIcons]);

  return categoryIndices;
};
