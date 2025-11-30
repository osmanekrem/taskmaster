import type { FieldWithDefaults, ResolvedField, FieldConfig } from '@/types/fields';
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
import { useState, useEffect } from 'react';
import type { DateValue } from 'react-aria-components';
import UserSelector from '@/components/user-selector';
import { Checkbox } from '@/components/ui/checkbox';

interface FieldRendererProps {
  field: FieldWithDefaults | ResolvedField;
}

export default function FieldRendererPreview({ field }: FieldRendererProps) {
  const config = field.config as FieldConfig | null;
  const isRequired = config?.isRequired ?? false;
  const description = config?.description ?? '';

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

export function FieldRendererPreviewComponent({ field }: FieldRendererProps) {
  const config = field.config as FieldConfig | null;
  const placeholder = config?.placeholder ?? '';
  const defaultOption = config?.defaultOption;

  const [option, setOption] = useState<string | undefined>(defaultOption);
  const [date, setDate] = useState<DateValue | null>(null);
  const [user, setUser] = useState<string | undefined>();
  const [checked, setChecked] = useState<boolean>(false);
  const [textValue, setTextValue] = useState<string>('');
  const [numberValue, setNumberValue] = useState<string>('');

  // Reset state when field changes
  useEffect(() => {
    setOption(defaultOption);
    setDate(null);
    setUser(undefined);
    setChecked(false);
    setTextValue('');
    setNumberValue('');
  }, [field.id, defaultOption]);

  if (!field.fieldType) return null;

  // Select types
  if (field.fieldType === 'single-select' || field.fieldType === 'multi-select') {
    const options = field.options ?? [];
    return (
      <Select value={option} onValueChange={setOption}>
        <SelectTrigger className='w-[180px]'>
          <SelectValue
            placeholder={placeholder || 'Select an option'}
          ></SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.icon && <Icon name={opt.icon as IconName} className='size-4 mr-2' />}
              {opt.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Text input
  if (field.fieldType === 'text-input') {
    return (
      <Input
        type='text'
        placeholder={placeholder}
        value={textValue}
        onChange={(e) => setTextValue(e.target.value)}
        minLength={config?.minLength as number | undefined}
        maxLength={config?.maxLength as number | undefined}
      />
    );
  }

  // URL input
  if (field.fieldType === 'url-input') {
    return (
      <Input
        type='url'
        placeholder={placeholder || 'https://example.com'}
        value={textValue}
        onChange={(e) => setTextValue(e.target.value)}
        minLength={config?.minLength as number | undefined}
        maxLength={config?.maxLength as number | undefined}
      />
    );
  }

  // Email input
  if (field.fieldType === 'email-input') {
    return (
      <Input
        type='email'
        placeholder={placeholder || 'email@example.com'}
        value={textValue}
        onChange={(e) => setTextValue(e.target.value)}
        minLength={config?.minLength as number | undefined}
        maxLength={config?.maxLength as number | undefined}
      />
    );
  }

  // Textarea
  if (field.fieldType === 'text-area') {
    return (
      <Textarea
        placeholder={placeholder}
        value={textValue}
        onChange={(e) => setTextValue(e.target.value)}
        minLength={config?.minLength as number | undefined}
        maxLength={config?.maxLength as number | undefined}
      />
    );
  }

  // Number input
  if (field.fieldType === 'number-input') {
    return (
      <Input
        type='number'
        placeholder={placeholder}
        value={numberValue}
        onChange={(e) => setNumberValue(e.target.value)}
        min={config?.min as number | undefined}
        max={config?.max as number | undefined}
        step={config?.step as number | undefined}
      />
    );
  }

  // Date picker
  if (field.fieldType === 'date-picker') {
    const granularity = config?.granularity ?? 'day';
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

  // User picker
  if (field.fieldType === 'user-picker') {
    return (
      <UserSelector
        value={user}
        onChange={setUser}
        placeholder={placeholder || 'Select user'}
      />
    );
  }

  // Checkbox
  if (field.fieldType === 'checkbox') {
    return (
      <div className='flex items-center'>
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => setChecked(value === true)}
        />
      </div>
    );
  }

  return null;
}
