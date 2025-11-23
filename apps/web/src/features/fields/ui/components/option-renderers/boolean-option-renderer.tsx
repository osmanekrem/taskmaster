import { Fragment } from 'react';
import {
  BooleanFormElement,
  StaticSelectOptionsFormElement,
} from '@/components/type-form-element';
import type { FieldOption, SelectOptionsMap } from '@/types/fields';

interface BooleanOptionRendererProps {
  option: FieldOption;
  selectOptionsData: SelectOptionsMap;
  onChangeOption: (optionId: string, value: string | boolean | number) => void;
  onChangeSelectOptions: (optionId: string, options: FieldOption['selectOptions']) => void;
}

export const BooleanOptionRenderer = ({
  option,
  selectOptionsData,
  onChangeOption,
  onChangeSelectOptions,
}: BooleanOptionRendererProps) => {
  const isDynamicSelectOptions =
    option.fieldTypeOption?.key === 'is-dynamic-options';

  return (
    <Fragment>
      <div className='p-4 border rounded-md flex items-center justify-between'>
        <BooleanFormElement
          id={option.id}
          name={option.fieldTypeOption?.name}
          value={option.value}
          onChange={(value: boolean) => onChangeOption(option.id, value)}
        />
      </div>
      {isDynamicSelectOptions &&
        (JSON.parse(option.value) === true ? null : (
          <StaticSelectOptionsFormElement
            onChange={onChangeSelectOptions}
            dataKey='fieldOptionId'
            value={selectOptionsData[option.id]}
            id={option.id}
          />
        ))}
    </Fragment>
  );
};
