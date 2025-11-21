'use client';

import * as React from 'react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { IconName } from 'lucide-react/dynamic';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDebounceValue } from 'usehooks-ts';
import { useIconsData } from './icon-picker/use-icon-data';
import { useIconSearch } from './icon-picker/use-icon-search';
import { useIconCategorization } from './icon-picker/use-icon-categorization';
import {
  useVirtualItems,
  useCategoryIndices,
} from './icon-picker/use-virtual-items';
import { IconRenderer } from './icon-picker/icon-renderer';
import { IconsColumnSkeleton } from './icon-picker/icons-skeleton';
import { CategoryButtons } from './icon-picker/category-buttons';
import { VirtualContent } from './icon-picker/virtual-content';
import type { IconData } from './icon-picker/types';

export type { IconData } from './icon-picker/types';
export { Icon } from './icon-picker/icon';
export type { IconName } from 'lucide-react/dynamic';

interface IconPickerProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof PopoverTrigger>,
    'onSelect' | 'onOpenChange'
  > {
  value?: IconName;
  defaultValue?: IconName;
  onValueChange?: (value: IconName) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  triggerPlaceholder?: string;
  iconsList?: IconData[];
  categorized?: boolean;
  modal?: boolean;
}

const IconPicker = React.forwardRef<
  React.ComponentRef<typeof PopoverTrigger>,
  IconPickerProps
>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      open,
      defaultOpen,
      onOpenChange,
      children,
      searchable = true,
      searchPlaceholder = 'Search for an icon...',
      triggerPlaceholder = 'Select an icon',
      iconsList,
      categorized = true,
      modal = false,
      ...props
    },
    ref,
  ) => {
    const [selectedIcon, setSelectedIcon] = useState<IconName | undefined>(
      defaultValue,
    );
    const [isOpen, setIsOpen] = useState(defaultOpen || false);
    const [search, setSearch] = useDebounceValue('', 100);
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const parentRef = useRef<HTMLDivElement>(null);

    const { icons } = useIconsData();
    const iconsToUse = useMemo(() => iconsList || icons, [iconsList, icons]);
    const filteredIcons = useIconSearch(iconsToUse, search);
    const categorizedIcons = useIconCategorization(
      filteredIcons,
      categorized,
      search,
    );
    const virtualItems = useVirtualItems(categorizedIcons);
    const categoryIndices = useCategoryIndices(virtualItems, categorizedIcons);

    const virtualizer = useVirtualizer({
      count: virtualItems.length,
      getScrollElement: () => parentRef.current,
      estimateSize: (index) =>
        virtualItems[index]?.type === 'category' ? 25 : 40,
      paddingEnd: 2,
      gap: 10,
      overscan: 5,
    });

    const handleValueChange = useCallback(
      (icon: IconName) => {
        if (value === undefined) {
          setSelectedIcon(icon);
        }
        onValueChange?.(icon);
      },
      [value, onValueChange],
    );

    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        setSearch('');
        if (open === undefined) {
          setIsOpen(newOpen);
        }
        onOpenChange?.(newOpen);

        setIsPopoverVisible(newOpen);

        if (newOpen) {
          setTimeout(() => {
            virtualizer.measure();
            setIsLoading(false);
          }, 1);
        }
      },
      [open, onOpenChange, virtualizer, setSearch],
    );

    const handleIconClick = useCallback(
      (iconName: IconName) => {
        handleValueChange(iconName);
        setIsOpen(false);
        setSearch('');
      },
      [handleValueChange, setSearch],
    );

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);

        if (parentRef.current) {
          parentRef.current.scrollTop = 0;
        }

        virtualizer.scrollToOffset(0);
      },
      [virtualizer, setSearch],
    );

    const scrollToCategory = useCallback(
      (categoryName: string) => {
        const categoryIndex = categoryIndices[categoryName];

        if (categoryIndex !== undefined && virtualizer) {
          virtualizer.scrollToIndex(categoryIndex, {
            align: 'start',
            behavior: 'smooth',
          });
        }
      },
      [categoryIndices, virtualizer],
    );

    useEffect(() => {
      if (isPopoverVisible) {
        setIsLoading(true);
        const timer = setTimeout(() => {
          setIsLoading(false);
          virtualizer.measure();
        }, 10);

        const resizeObserver = new ResizeObserver(() => {
          virtualizer.measure();
        });

        if (parentRef.current) {
          resizeObserver.observe(parentRef.current);
        }

        return () => {
          clearTimeout(timer);
          resizeObserver.disconnect();
        };
      }
    }, [isPopoverVisible, virtualizer]);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
      if (parentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
        const maxScroll = scrollHeight - clientHeight;
        const newScrollTop = Math.max(
          0,
          Math.min(maxScroll, scrollTop + e.deltaY),
        );

        if (newScrollTop !== scrollTop) {
          parentRef.current.scrollTop = newScrollTop;
        }
      }
    }, []);

    return (
      <Popover
        open={open ?? isOpen}
        onOpenChange={handleOpenChange}
        modal={modal}
      >
        <PopoverTrigger ref={ref} asChild {...props}>
          {children || (
            <Button size='icon' variant='outline'>
              {value || selectedIcon ? (
                <IconRenderer name={(value || selectedIcon)!} />
              ) : (
                triggerPlaceholder
              )}
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className='w-64 p-2'>
          {searchable && (
            <Input
              placeholder={searchPlaceholder}
              onChange={handleSearchChange}
              className='mb-2'
            />
          )}
          <CategoryButtons
            categorizedIcons={categorizedIcons}
            searchQuery={search}
            categorized={categorized}
            onCategoryClick={scrollToCategory}
          />
          <div
            ref={parentRef}
            className='max-h-60 overflow-auto overscroll-contain'
            style={{ scrollbarWidth: 'thin' }}
            onWheel={handleWheel}
          >
            {isLoading ? (
              <IconsColumnSkeleton />
            ) : (
              <VirtualContent
                virtualItems={virtualItems}
                categorizedIcons={categorizedIcons}
                filteredIcons={filteredIcons}
                virtualizer={virtualizer}
                onIconClick={handleIconClick}
              />
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);
IconPicker.displayName = 'IconPicker';

export { IconPicker };
