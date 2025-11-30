import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconPicker, Icon } from '@/components/ui/icon-picker';
import type { IconName } from 'lucide-react/dynamic';
import type { FieldSelectOption } from '@/types/fields';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useCallback } from 'react';
import * as Sortable from '@/components/ui/sortable';

// Simple ID generator
const generateId = () =>
  `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface SelectOptionsEditorProps {
  options: FieldSelectOption[];
  onChange: (options: FieldSelectOption[]) => void;
}

export default function SelectOptionsEditor({
  options,
  onChange,
}: SelectOptionsEditorProps) {
  // Sort by order for display
  const sortedOptions = [...options].sort((a, b) => a.order - b.order);

  const addOption = useCallback(() => {
    const newOption: FieldSelectOption = {
      id: generateId(),
      name: '',
      order: options.length,
    };
    onChange([...options, newOption]);
  }, [options, onChange]);

  const removeOption = useCallback(
    (id: string) => {
      const updated = options
        .filter((o) => o.id !== id)
        .map((o, index) => ({ ...o, order: index }));
      onChange(updated);
    },
    [options, onChange],
  );

  const updateOption = useCallback(
    (id: string, updates: Partial<FieldSelectOption>) => {
      const updated = options.map((o) =>
        o.id === id ? { ...o, ...updates } : o,
      );
      onChange(updated);
    },
    [options, onChange],
  );

  const handleReorder = useCallback(
    (reorderedOptions: FieldSelectOption[]) => {
      // Update order based on new positions
      const updated = reorderedOptions.map((o, index) => ({
        ...o,
        order: index,
      }));
      onChange(updated);
    },
    [onChange],
  );

  return (
    <div className='flex flex-col gap-2'>
      <Sortable.Root
        value={sortedOptions}
        onValueChange={handleReorder}
        getItemValue={(option) => option.id}
        orientation='vertical'
      >
        <Sortable.Content className='flex flex-col gap-2'>
          {sortedOptions.map((option) => (
            <Sortable.Item key={option.id} value={option.id} asChild>
              <div className='flex items-center gap-2 p-2 border rounded-md bg-background'>
                <Sortable.ItemHandle asChild>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-9 w-6 p-0 cursor-grab active:cursor-grabbing'
                  >
                    <GripVertical className='h-4 w-4' />
                  </Button>
                </Sortable.ItemHandle>

                <IconPicker
                  value={option.icon as IconName | undefined}
                  onValueChange={(value) => updateOption(option.id, { icon: value })}
                >
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-9 w-9 p-0'
                  >
                    {option.icon ? (
                      <Icon name={option.icon as IconName} className='h-4 w-4' />
                    ) : (
                      <Plus className='h-4 w-4' />
                    )}
                  </Button>
                </IconPicker>

                <Input
                  value={option.name}
                  onChange={(e) => updateOption(option.id, { name: e.target.value })}
                  placeholder='Seçenek adı...'
                  className='flex-1'
                />

                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-9 w-9 p-0 text-destructive hover:text-destructive'
                  onClick={() => removeOption(option.id)}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            </Sortable.Item>
          ))}
        </Sortable.Content>
        <Sortable.Overlay>
          {(activeItem) => {
            const option = sortedOptions.find((o) => o.id === activeItem.value);
            if (!option) return null;
            return (
              <div className='flex items-center gap-2 p-2 border rounded-md bg-muted/50 shadow-lg'>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-9 w-6 p-0'
                >
                  <GripVertical className='h-4 w-4' />
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-9 w-9 p-0'
                >
                  {option.icon ? (
                    <Icon name={option.icon as IconName} className='h-4 w-4' />
                  ) : (
                    <Plus className='h-4 w-4' />
                  )}
                </Button>
                <Input
                  value={option.name}
                  readOnly
                  className='flex-1'
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-9 w-9 p-0 text-destructive'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            );
          }}
        </Sortable.Overlay>
      </Sortable.Root>

      <Button
        type='button'
        variant='outline'
        onClick={addOption}
        className='mt-2'
      >
        <Plus className='h-4 w-4 mr-2' />
        Seçenek Ekle
      </Button>
    </div>
  );
}
