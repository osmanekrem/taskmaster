import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  BadgeCheckIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  TrashIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, type JSX } from 'react';
import { IconPicker, Icon, type IconName } from './ui/icon-picker';
import { iconsData } from './ui/icons-data';
import { useQuery } from '@tanstack/react-query';
import { getSelectOptionsByFieldOptionIdQuery } from '@/features/fields/lib/queries';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/ui/shadcn-io/kanban';
import FieldRendererPreview from '@/features/fields/ui/components/field-renderer-preview';
import { Textarea } from '@/components/ui/textarea';

const types: Record<string, any> = {
  boolean: BooleanFormElement,
  static_select_options: StaticSelectOptionsFormElement,
  text: TextFormElement,
  default_option: SelectFormElement,
};

export default function TypeFormElement({
  type,
  ...props
}: { type: string } & any) {
  const Component = types[type];
  if (!Component) return null;
  return <Component {...props} />;
}

export interface BooleanFormElementProps {
  value: string;
  onChange: (value: boolean) => void;
  name: string;
  id: string;
}

export function BooleanFormElement({
  value,
  onChange,
  name,
  id,
}: BooleanFormElementProps) {
  return (
    <div className='flex items-center gap-3'>
      <Checkbox
        id={id}
        checked={JSON.parse(value)}
        onCheckedChange={onChange}
      />
      <Label htmlFor={id}>{name}</Label>
    </div>
  );
}

export interface SelectOption {
  id?: string;
  name: string;
  icon: string | null;
  order: number;
  fieldOptionId: string;
}

export interface SelectOptionsFormElementProps {
  id: string;
  value: SelectOption[];
  onChange: (optionId: string, options: SelectOption[]) => void;
}

const columns = [{ id: '0', name: 'Önizleme' }];

export function StaticSelectOptionsFormElement({
  id,
  value,
  onChange,
}: SelectOptionsFormElementProps) {
  const [editingOptionIndex, setEditingOptionIndex] = useState<string | null>(
    null,
  );

  if (!value) return null;
  return (
    <div className='flex flex-col space-y-1 w-full'>
      <KanbanProvider
        columns={columns}
        data={value.map((option) => ({
          ...option,
          column: '0',
          id: option.id || `temp-${option.order}`,
        }))}
        onDataChange={(v) =>
          onChange(
            id,
            v.map((option, i) => ({
              order: i,
              fieldOptionId: option.fieldOptionId,
              name: option.name,
              icon: option.icon,
              ...(option.id.startsWith('temp-')
                ? {}
                : {
                    id: option.id,
                  }),
            })),
          )
        }
      >
        {(column) => (
          <KanbanBoard id={column.id} key={column.id}>
            <KanbanCards id={column.id}>
              {(option) => (
                <KanbanCard
                  column={column.id}
                  id={option.id}
                  key={option.id}
                  name={option.name}
                  className=' pr-4 items-center'
                >
                  <ItemMedia>
                    {editingOptionIndex === option.id ? (
                      <IconPicker
                        value={option.icon as IconName}
                        onValueChange={(e: any) => {
                          const newOptions = [...value];
                          const index = newOptions.findIndex(
                            (opt) => opt.id === option.id,
                          );
                          if (index !== -1) {
                            newOptions[index] = {
                              ...newOptions[index],
                              icon: e,
                            };
                          }
                          onChange(id, newOptions);
                        }}
                      />
                    ) : (
                      <Icon
                        className='size-9 p-2.5'
                        name={option.icon as IconName}
                      />
                    )}
                  </ItemMedia>
                  <ItemContent>
                    {editingOptionIndex === option.id ? (
                      <div className='flex flex-col space-y-2'>
                        <Input
                          value={option.name}
                          onChange={(e) => {
                            const newOptions = [...value];
                            const index = newOptions.findIndex(
                              (opt) => opt.id === option.id,
                            );
                            newOptions[index] = {
                              ...newOptions[index],
                              name: e.target.value,
                            };
                            onChange(id, newOptions);
                          }}
                        />
                      </div>
                    ) : (
                      <ItemTitle className='px-3 py-1 h-9 border border-transparent font-normal'>
                        {option.name}
                      </ItemTitle>
                    )}
                  </ItemContent>
                  <ItemActions>
                    {editingOptionIndex === option.id ? (
                      <Button
                        onClick={() => setEditingOptionIndex(null)}
                        variant='ghost'
                        className='p-1.5'
                        size='icon'
                      >
                        <SaveIcon className='size-3.5' />
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => setEditingOptionIndex(option.id)}
                          variant='ghost'
                          className='p-1.5'
                          size='icon'
                        >
                          <PencilIcon className='size-3.5' />
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => {
                        const newOptions = value.filter(
                          (opt, idx) =>
                            (opt.id || `temp-${opt.order}`) !== option.id,
                        );
                        onChange(id, newOptions);
                      }}
                      variant='ghost'
                      className='p-1.5'
                      size='icon'
                    >
                      <TrashIcon className='size-3.5' />
                    </Button>
                  </ItemActions>
                </KanbanCard>
              )}
            </KanbanCards>
          </KanbanBoard>
        )}
      </KanbanProvider>
      <Button
        variant='outline'
        size='sm'
        className='!w-full'
        onClick={() =>
          onChange(id, [
            ...value,
            {
              order: value.length + 1,
              fieldOptionId: id,
              name: `Seçenek ${value.length + 1}`,
              icon: iconsData[0].name,
            },
          ])
        }
      >
        <PlusIcon className='size-3' />
        Seçenek Ekle
      </Button>
    </div>
  );
}

export interface TextFormElementProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
  id: string;
}

export function TextFormElement({
  value,
  onChange,
  name,
  id,
}: TextFormElementProps) {
  return (
    <div className='flex flex-col items-start space-y-2 w-full'>
      <Label htmlFor={id}>{name}</Label>

      <Input
        id={id}
        type='text'
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export interface SelectFormElementProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  name: string;
  id: string;
}

export function SelectFormElement({
  value,
  onChange,
  name,
  options,
  id,
}: SelectFormElementProps) {
  return (
    <div className='flex flex-col items-start space-y-2 w-full'>
      <Label htmlFor={id}>{name}</Label>

      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Varsayılan seçenek seçin' />
        </SelectTrigger>
        <SelectContent>
          {options?.map((option) => (
            <SelectItem key={option.id} value={option.id!}>
              <div className='flex items-center gap-2'>
                <Icon
                  name={(option.icon as IconName) ?? ''}
                  className='size-4'
                />
                {option.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface ParagraphFormElementProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
  id: string;
}

export function ParagraphFormElement({
  value,
  onChange,
  name,
  id,
}: ParagraphFormElementProps) {
  return (
    <div className='flex flex-col items-start space-y-2 w-full'>
      <Label htmlFor={id}>{name}</Label>

      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
