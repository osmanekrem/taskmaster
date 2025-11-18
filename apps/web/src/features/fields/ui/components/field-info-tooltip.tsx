import { Icon } from '@/components/ui/icon-picker';
import type { IconName } from 'lucide-react/dynamic';

interface FieldInfoTooltipProps {
  options: Array<{
    id: string;
    value: string;
    fieldTypeOption: {
      key: string;
      name: string;
      type: string;
    };
    selectOptions: Array<{
      id: string;
      name: string;
      icon: string | null | undefined;
    }>;
  }>;
}

export const FieldInfoTooltipContent = ({ options }: FieldInfoTooltipProps) => {
  return (
    <>
      {options.map((option) => {
        const isStaticSelect =
          option.fieldTypeOption.key === 'is-dynamic-options' &&
          option.value === 'false';

        const displayValue =
          option.fieldTypeOption.type === 'boolean'
            ? option.value === 'true'
              ? 'Evet'
              : 'Hayır'
            : option.value;

        return (
          <div key={option.id} className='mt-2'>
            <strong>{option.fieldTypeOption.name}:</strong> {displayValue}
            {isStaticSelect && option.selectOptions.length > 0 && (
              <div className='mt-1'>
                <strong>Seçenekler:</strong>
                <ul className='list-disc list-inside'>
                  {option.selectOptions.map((selectOption) => (
                    <li
                      key={selectOption.id}
                      className='flex items-center gap-2'
                    >
                      <Icon
                        name={(selectOption.icon as IconName) || ''}
                        className='size-3.5'
                      />
                      {selectOption.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
