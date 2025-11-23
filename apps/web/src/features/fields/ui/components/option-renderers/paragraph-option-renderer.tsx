import { ParagraphFormElement } from '@/components/type-form-element';
import type { FieldOption } from '@/types/fields';

interface ParagraphOptionRendererProps {
  option: FieldOption;
  onChangeOption: (optionId: string, value: string) => void;
}

export const ParagraphOptionRenderer = ({
  option,
  onChangeOption,
}: ParagraphOptionRendererProps) => {
  return (
    <div className='p-4 border rounded-md'>
      <ParagraphFormElement
        value={option.value}
        name={option.fieldTypeOption?.name || ''}
        id={option.id}
        onChange={(value: string) => onChangeOption(option.id, value)}
      />
    </div>
  );
};
