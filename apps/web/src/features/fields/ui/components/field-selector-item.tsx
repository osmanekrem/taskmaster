import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon-picker';
import type { IconName } from 'lucide-react/dynamic';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { FieldInfoTooltipContent } from './field-info-tooltip';
import type { FieldWithDetails } from '@/features/fields/types';

interface FieldSelectorItemProps {
  field: FieldWithDetails;
  isSelected: boolean;
  onToggle: () => void;
}

export const FieldSelectorItem = ({
  field,
  isSelected,
  onToggle,
}: FieldSelectorItemProps) => {
  return (
    <Item
      size='sm'
      variant='outline'
      className={cn(isSelected ? 'bg-primary/10' : '', ' select-none')}
    >
      <ItemMedia>
        {field.icon && (
          <Icon className='size-4' name={field.icon as IconName} />
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{field.name}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <Tooltip>
          <TooltipTrigger>
            <Icon className='size-4' name={'info'} />
          </TooltipTrigger>
          <TooltipContent className='p-4'>
            <FieldInfoTooltipContent options={field.options} />
          </TooltipContent>
        </Tooltip>
        <Button
          variant='ghost'
          className='p-1.5'
          onClick={onToggle}
          aria-label={isSelected ? 'Remove field' : 'Add field'}
        >
          <Icon className='size-4' name={isSelected ? 'minus' : 'plus'} />
        </Button>
      </ItemActions>
    </Item>
  );
};
