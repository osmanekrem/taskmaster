import { Icon } from '@/components/ui/icon-picker';
import type { IconName } from 'lucide-react/dynamic';
import type { FieldConfig, FieldSelectOption } from '@/types/fields';

interface FieldInfoTooltipProps {
  config?: FieldConfig | null;
  options?: FieldSelectOption[] | null;
  fieldType?: string;
}

export const FieldInfoTooltipContent = ({
  config,
  options,
  fieldType,
}: FieldInfoTooltipProps) => {
  const isSelectType =
    fieldType === 'single-select' || fieldType === 'multi-select';

  return (
    <div className='flex flex-col gap-2'>
      {config?.isRequired !== undefined && (
        <div>
          <strong>Zorunlu:</strong> {config.isRequired ? 'Evet' : 'Hayır'}
        </div>
      )}
      {config?.placeholder && (
        <div>
          <strong>Placeholder:</strong> {config.placeholder}
        </div>
      )}
      {config?.description && (
        <div>
          <strong>Açıklama:</strong> {config.description}
        </div>
      )}
      {config?.minLength !== undefined && (
        <div>
          <strong>Min Uzunluk:</strong> {config.minLength}
        </div>
      )}
      {config?.maxLength !== undefined && (
        <div>
          <strong>Max Uzunluk:</strong> {config.maxLength}
        </div>
      )}
      {config?.min !== undefined && (
        <div>
          <strong>Min Değer:</strong> {config.min}
        </div>
      )}
      {config?.max !== undefined && (
        <div>
          <strong>Max Değer:</strong> {config.max}
        </div>
      )}
      {config?.granularity && (
        <div>
          <strong>Hassasiyet:</strong> {config.granularity}
        </div>
      )}
      {isSelectType && options && options.length > 0 && (
        <div>
          <strong>Seçenekler:</strong>
          <ul className='list-disc list-inside mt-1'>
            {options.map((opt) => (
              <li key={opt.id} className='flex items-center gap-2'>
                {opt.icon && (
                  <Icon name={opt.icon as IconName} className='size-3.5' />
                )}
                {opt.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
