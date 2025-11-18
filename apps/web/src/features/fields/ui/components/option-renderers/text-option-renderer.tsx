import { TextFormElement } from '@/components/type-form-element';

interface TextOptionRendererProps {
  option: any;
  onChangeOption: (optionId: string, value: any) => void;
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
        onChange={(value: any) => onChangeOption(option.id, value)}
      />
    </div>
  );
};
