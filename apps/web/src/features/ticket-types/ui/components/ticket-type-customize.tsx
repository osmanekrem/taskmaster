import FieldRendererPreview from '@/features/fields/ui/components/field-renderer-preview';
import * as Sortable from '@/components/ui/sortable';
import { GripVertical, PencilIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
} from '@/components/ui/item';
import useCustomizeFieldModal from '../../hooks/use-customize-field-modal';
import type { FieldWithDefaults, FieldConfig, FieldSelectOption } from '@/types/fields';

// Extended field type that includes issue type specific overrides
interface IssueTypeFieldState extends FieldWithDefaults {
  configOverride?: FieldConfig;
  optionsOverride?: FieldSelectOption[];
}

interface TicketTypeCustomizeProps {
  fields: IssueTypeFieldState[];
  setFields: React.Dispatch<React.SetStateAction<IssueTypeFieldState[]>>;
  id: string;
}

// Merge field with its overrides for display
function getMergedField(field: IssueTypeFieldState): FieldWithDefaults {
  const baseConfig = (field.config as FieldConfig) ?? {};
  const baseOptions = (field.options as FieldSelectOption[]) ?? [];
  
  return {
    ...field,
    config: { ...baseConfig, ...field.configOverride },
    options: field.optionsOverride ?? baseOptions,
  };
}

export default function TicketTypeCustomize({
  fields,
  setFields,
}: TicketTypeCustomizeProps) {
  const { open } = useCustomizeFieldModal();
  return (
    <Sortable.Root
      value={fields}
      onValueChange={setFields}
      getItemValue={(field) => field.id}
      orientation='vertical'
    >
      <Sortable.Content>
        {fields.map((field) => (
          <Sortable.Item key={field.id} value={field.id}>
            <Item>
              <ItemMedia>
                <Sortable.ItemHandle asChild>
                  <Button variant='ghost' size='icon' className='size-8'>
                    <GripVertical className='h-4 w-4' />
                  </Button>
                </Sortable.ItemHandle>
              </ItemMedia>
              <ItemContent>
                <FieldRendererPreview key={field.id} field={getMergedField(field)} />
              </ItemContent>
              <ItemActions>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-8'
                  onClick={() => open(field.id)}
                >
                  <PencilIcon className='h-4 w-4' />
                </Button>
              </ItemActions>
            </Item>
          </Sortable.Item>
        ))}
      </Sortable.Content>
      <Sortable.Overlay>
        {(activeItem) => {
          const field = fields.find((field) => field.id === activeItem.value);

          if (!field) return null;

          return <OverlayItem field={field} />;
        }}
      </Sortable.Overlay>
    </Sortable.Root>
  );
}

interface OverlayItemProps {
  field: IssueTypeFieldState;
}

function OverlayItem({ field }: OverlayItemProps) {
  return (
    <Item className='bg-muted bg-muted/50'>
      <ItemMedia>
        <Button variant='ghost' size='icon' className='size-8'>
          <GripVertical className='h-4 w-4' />
        </Button>
      </ItemMedia>
      <ItemContent>
        <FieldRendererPreview field={getMergedField(field)} />
      </ItemContent>
    </Item>
  );
}
