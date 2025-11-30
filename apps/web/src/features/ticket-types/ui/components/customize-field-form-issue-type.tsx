import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCallback, useState, useEffect } from 'react';
import type { FieldWithDefaults, FieldConfig, FieldSelectOption } from '@/types/fields';
import SelectOptionsEditor from '@/features/fields/ui/components/select-options-editor';

interface CustomizeFieldFormProps {
  field: FieldWithDefaults;
  configOverride?: FieldConfig;
  optionsOverride?: FieldSelectOption[];
  onUpdateOverride: (updates: {
    configOverride?: FieldConfig;
    optionsOverride?: FieldSelectOption[];
  }) => void;
}

export default function CustomizeFieldFormIssueType({
  field,
  configOverride,
  optionsOverride,
  onUpdateOverride,
}: CustomizeFieldFormProps) {
  // Merge base config with override
  const baseConfig = (field.config as FieldConfig) ?? {};
  const baseOptions = (field.options as FieldSelectOption[]) ?? [];
  
  const [config, setConfig] = useState<FieldConfig>({
    ...baseConfig,
    ...configOverride,
  });
  
  const [options, setOptions] = useState<FieldSelectOption[]>(
    optionsOverride ?? baseOptions,
  );
  
  const [hasChanges, setHasChanges] = useState(false);

  // Reset when field changes
  useEffect(() => {
    const newBaseConfig = (field.config as FieldConfig) ?? {};
    const newBaseOptions = (field.options as FieldSelectOption[]) ?? [];
    setConfig({ ...newBaseConfig, ...configOverride });
    setOptions(optionsOverride ?? newBaseOptions);
    setHasChanges(false);
  }, [field.id, field.config, field.options, configOverride, optionsOverride]);

  const updateConfig = useCallback(
    <K extends keyof FieldConfig>(key: K, value: FieldConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
      setHasChanges(true);
    },
    [],
  );

  const updateOptions = useCallback((newOptions: FieldSelectOption[]) => {
    setOptions(newOptions);
    setHasChanges(true);
  }, []);

  const handleApply = useCallback(() => {
    // Only save the override (difference from base)
    const configDiff: FieldConfig = {};
    for (const key of Object.keys(config) as (keyof FieldConfig)[]) {
      if (config[key] !== baseConfig[key]) {
        configDiff[key] = config[key];
      }
    }

    // Check if options changed
    const optionsChanged =
      JSON.stringify(options) !== JSON.stringify(baseOptions);

    onUpdateOverride({
      configOverride: Object.keys(configDiff).length > 0 ? configDiff : undefined,
      optionsOverride: optionsChanged ? options : undefined,
    });
    setHasChanges(false);
  }, [config, options, baseConfig, baseOptions, onUpdateOverride]);

  const isSelectType =
    field.fieldType === 'single-select' || field.fieldType === 'multi-select';
  const isTextType =
    field.fieldType === 'text-input' ||
    field.fieldType === 'text-area' ||
    field.fieldType === 'url-input' ||
    field.fieldType === 'email-input';
  const isNumberType = field.fieldType === 'number-input';
  const isDateType = field.fieldType === 'date-picker';

  return (
    <div className='flex flex-col gap-4'>
      <p className='text-sm text-muted-foreground'>
        Bu ayarlar yalnızca bu talep türü için geçerlidir. Temel alan ayarlarını
        değiştirmez.
      </p>

      {/* Common Options */}
      <div className='flex items-center justify-between'>
        <Label htmlFor='isRequired'>Zorunlu Alan</Label>
        <Switch
          id='isRequired'
          checked={config.isRequired ?? false}
          onCheckedChange={(checked) => updateConfig('isRequired', checked)}
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='placeholder'>Placeholder</Label>
        <Input
          id='placeholder'
          value={config.placeholder ?? ''}
          onChange={(e) => updateConfig('placeholder', e.target.value)}
          placeholder='Placeholder text...'
        />
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='description'>Açıklama</Label>
        <Textarea
          id='description'
          value={config.description ?? ''}
          onChange={(e) => updateConfig('description', e.target.value)}
          placeholder='Alan açıklaması...'
        />
      </div>

      {/* Text-specific options */}
      {isTextType && (
        <>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='minLength'>Minimum Uzunluk</Label>
            <Input
              id='minLength'
              type='number'
              value={config.minLength ?? ''}
              onChange={(e) =>
                updateConfig(
                  'minLength',
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder='0'
            />
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='maxLength'>Maksimum Uzunluk</Label>
            <Input
              id='maxLength'
              type='number'
              value={config.maxLength ?? ''}
              onChange={(e) =>
                updateConfig(
                  'maxLength',
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder='255'
            />
          </div>
        </>
      )}

      {/* Number-specific options */}
      {isNumberType && (
        <>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='min'>Minimum Değer</Label>
            <Input
              id='min'
              type='number'
              value={config.min ?? ''}
              onChange={(e) =>
                updateConfig(
                  'min',
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder='0'
            />
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='max'>Maksimum Değer</Label>
            <Input
              id='max'
              type='number'
              value={config.max ?? ''}
              onChange={(e) =>
                updateConfig(
                  'max',
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder='100'
            />
          </div>

          <div className='flex flex-col gap-2'>
            <Label htmlFor='step'>Adım</Label>
            <Input
              id='step'
              type='number'
              value={config.step ?? ''}
              onChange={(e) =>
                updateConfig(
                  'step',
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder='1'
            />
          </div>
        </>
      )}

      {/* Date-specific options */}
      {isDateType && (
        <div className='flex flex-col gap-2'>
          <Label htmlFor='granularity'>Hassasiyet</Label>
          <select
            id='granularity'
            value={config.granularity ?? 'day'}
            onChange={(e) =>
              updateConfig(
                'granularity',
                e.target.value as 'day' | 'hour' | 'minute' | 'second',
              )
            }
            className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
          >
            <option value='day'>Gün</option>
            <option value='hour'>Saat</option>
            <option value='minute'>Dakika</option>
            <option value='second'>Saniye</option>
          </select>
        </div>
      )}

      {/* Select-specific options */}
      {isSelectType && (
        <div className='flex flex-col gap-2'>
          <Label>Seçenekler (Override)</Label>
          <SelectOptionsEditor options={options} onChange={updateOptions} />
        </div>
      )}

      {hasChanges && (
        <p className='text-sm text-warning'>
          Dikkat: Değişiklikler kaydedilmedi.
        </p>
      )}

      <Button disabled={!hasChanges} onClick={handleApply} className='w-full'>
        Uygula
      </Button>
    </div>
  );
}
