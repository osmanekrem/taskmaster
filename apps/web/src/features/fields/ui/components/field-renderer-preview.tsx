import type { FieldWithDetails } from '@/features/fields/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Icon } from '@/components/ui/icon-picker';
import type { IconName } from 'lucide-react/dynamic';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { useState } from 'react';
import type { DateValue } from 'react-aria-components';

interface fieldRendererProps {
  field: FieldWithDetails;
}

export default function FieldRendererPreview({ field }: fieldRendererProps) {
  const isRequired =
    field.options.find((option) => option.fieldTypeOption.key === 'is-required')
      ?.value === 'true';
  const description =
    field.options.find((option) => option.fieldTypeOption.key === 'description')
      ?.value || '';
  return (
    <Field>
      <FieldLabel className='flex items-center'>
        <Icon name={field.icon as IconName} className='size-4' /> {field.name}{' '}
        {isRequired && '*'}
      </FieldLabel>
      <FieldRendererPreviewComponent field={field} />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}

export function FieldRendererPreviewComponent({ field }: fieldRendererProps) {
  const placeholder =
    field.options.find((option) => option.fieldTypeOption.key === 'placeholder')
      ?.value || '';
  const isDynamicOptions = field.options.find(
    (option) => option.fieldTypeOption.key === 'is-dynamic-options',
  );
  const defaultOption =
    field.options.find(
      (option) => option.fieldTypeOption.key === 'default-option',
    )?.value || '';

  const [option, setOption] = useState<string | undefined>(defaultOption);
  const [date, setDate] = useState<DateValue | null>(null);

  if (!field.fieldType) return null;

  if (field.fieldType.component === 'single-select') {
    return (
      <Select value={option} onValueChange={setOption}>
        <SelectTrigger className='w-[180px]'>
          <SelectValue
            placeholder={placeholder || 'Select an option'}
          ></SelectValue>
        </SelectTrigger>
        <SelectContent>
          {isDynamicOptions?.selectOptions?.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              <Icon name={option.icon as IconName} className='size-4 mr-2' />
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.fieldType.component === 'text') {
    return <Input placeholder={placeholder} />;
  }

  if (field.fieldType.component === 'textarea') {
    return <Textarea placeholder={placeholder} />;
  }

  if (field.fieldType.component === 'date') {
    const granularity =
      field.options.find(
        (option) => option.fieldTypeOption.key === 'granularity',
      )?.value || 'day';
    return (
      <DatePicker
        value={date}
        onChange={setDate}
        shouldForceLeadingZeros={true}
        hourCycle={24}
        granularity={granularity as 'day' | 'hour' | 'minute' | 'second'}
      />
    );
  }

  return null;
}
