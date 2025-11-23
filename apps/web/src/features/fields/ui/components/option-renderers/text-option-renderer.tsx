import { TextFormElement } from '@/components/type-form-element';
import type { FieldOption } from '@/types/fields';

interface TextOptionRendererProps {
  option: FieldOption;
  onChangeOption: (optionId: string, value: string) => void;
}

export const TextOptionRenderer = ({
  option,
  onChangeOption,
}: TextOptionRendererProps) => {
  return (
    <div className='p-4 border rounded-md flex items-center justify-between'>
      <TextFormElement
        name={option.fieldTypeOption?.name || ''}
        id={option.id}
        value={option.value}
        onChange={(value: string) => onChangeOption(option.id, value)}
      />
    </div>
  );
};
