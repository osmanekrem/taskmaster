import { ParagraphFormElement } from '@/components/type-form-element';

interface ParagraphOptionRendererProps {
  option: any;
  onChangeOption: (optionId: string, value: any) => void;
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
        onChange={(value: any) => onChangeOption(option.id, value)}
      />
    </div>
  );
};
