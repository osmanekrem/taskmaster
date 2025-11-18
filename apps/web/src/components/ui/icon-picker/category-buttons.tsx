import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { CategorizedIcon } from './use-icon-categorization';

interface CategoryButtonsProps {
  categorizedIcons: CategorizedIcon[];
  searchQuery: string;
  categorized: boolean;
  onCategoryClick: (categoryName: string) => void;
}

export const CategoryButtons = ({
  categorizedIcons,
  searchQuery,
  categorized,
  onCategoryClick,
}: CategoryButtonsProps) => {
  const buttons = useMemo(() => {
    if (!categorized || searchQuery.trim() !== '') return null;

    return categorizedIcons.map((category) => (
      <Button
        key={category.name}
        variant={'outline'}
        size='sm'
        className='text-xs'
        onClick={(e) => {
          e.stopPropagation();
          onCategoryClick(category.name);
        }}
      >
        {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
      </Button>
    ));
  }, [categorizedIcons, onCategoryClick, categorized, searchQuery]);

  if (!buttons) return null;

  return (
    <div className='flex flex-row gap-1 mt-2 overflow-x-auto pb-2'>
      {buttons}
    </div>
  );
};
