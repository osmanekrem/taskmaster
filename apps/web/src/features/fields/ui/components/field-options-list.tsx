import type { SelectOption } from '@/types';
import {
  BooleanOptionRenderer,
  TextOptionRenderer,
  SelectOptionRenderer,
  ParagraphOptionRenderer,
} from './option-renderers';
import type { FieldOption, SelectOptionsMap } from '@/types/fields';

interface FieldOptionsListProps {
  optionsData: FieldOption[];
  selectOptionsData: SelectOptionsMap;
  onChangeOption: (optionId: string, value: string | boolean | number) => void;
  onChangeSelectOptions: (
    optionId: string,
    options: FieldOption['selectOptions'],
  ) => void;
  mapSelectOptions?: (options: SelectOption[]) => SelectOption[];
}

export const FieldOptionsList = ({
  optionsData,
  selectOptionsData,
  onChangeOption,
  onChangeSelectOptions,
  mapSelectOptions,
}: FieldOptionsListProps) => {
  return (
    <div className='flex flex-col w-full flex-1 min-h-0 space-y-4 overflow-y-auto'>
      {optionsData.map((option) => {
        switch (option.fieldTypeOption?.type) {
          case 'boolean':
            return (
              <BooleanOptionRenderer
                key={option.id}
                option={option}
                selectOptionsData={selectOptionsData}
                onChangeOption={onChangeOption}
                onChangeSelectOptions={onChangeSelectOptions}
              />
            );
          case 'text':
            return (
              <TextOptionRenderer
                key={option.id}
                option={option}
                onChangeOption={onChangeOption}
              />
            );
          case 'select':
            return (
              <SelectOptionRenderer
                key={option.id}
                option={option}
                optionsData={optionsData}
                onChangeOption={onChangeOption}
                mapSelectOptions={mapSelectOptions}
              />
            );
          case 'paragraph':
            return (
              <ParagraphOptionRenderer
                key={option.id}
                option={option}
                onChangeOption={onChangeOption}
              />
            );
          case 'number':
            return null;
          default:
            return null;
        }
      })}
    </div>
  );
};
