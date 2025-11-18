import { useCallback } from 'react';
import type { VirtualItem } from './use-virtual-items';
import type { CategorizedIcon } from './use-icon-categorization';
import type { IconData } from './types';
import type { IconName } from 'lucide-react/dynamic';
import type { VirtualItem as TanStackVirtualItem } from '@tanstack/react-virtual';
import { IconRenderer } from './icon-renderer';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VirtualContentProps {
  virtualItems: VirtualItem[];
  categorizedIcons: CategorizedIcon[];
  filteredIcons: IconData[];
  virtualizer: any;
  onIconClick: (iconName: IconName) => void;
}

export const VirtualContent = ({
  virtualItems,
  categorizedIcons,
  filteredIcons,
  virtualizer,
  onIconClick,
}: VirtualContentProps) => {
  const renderIcon = useCallback(
    (icon: IconData) => (
      <TooltipProvider key={icon.name}>
        <Tooltip>
          <TooltipTrigger
            className={cn(
              'p-2 rounded-md border hover:bg-foreground/10 transition',
              'flex items-center justify-center',
            )}
            onClick={() => onIconClick(icon.name as IconName)}
          >
            <IconRenderer name={icon.name as IconName} />
          </TooltipTrigger>
          <TooltipContent>
            <p>{icon.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
    [onIconClick],
  );

  if (filteredIcons.length === 0) {
    return <div className='text-center text-gray-500'>No icon found</div>;
  }

  return (
    <div
      className='relative w-full overscroll-contain'
      style={{
        height: `${virtualizer.getTotalSize()}px`,
      }}
    >
      {virtualizer.getVirtualItems().map((virtualItem: TanStackVirtualItem) => {
        const item = virtualItems[virtualItem.index];

        if (!item) return null;

        const itemStyle = {
          position: 'absolute' as const,
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualItem.size}px`,
          transform: `translateY(${virtualItem.start}px)`,
        };

        if (item.type === 'category') {
          return (
            <div
              key={virtualItem.key}
              style={itemStyle}
              className='top-0 bg-background z-10'
            >
              <h3 className='font-medium text-sm capitalize'>
                {categorizedIcons[item.categoryIndex].name}
              </h3>
              <div className='h-[1px] bg-foreground/10 w-full' />
            </div>
          );
        }

        return (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            style={itemStyle}
          >
            <div className='grid grid-cols-5 gap-2 w-full'>
              {item.icons!.map(renderIcon)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
