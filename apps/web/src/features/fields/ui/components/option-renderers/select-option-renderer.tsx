import {
  SelectFormElement,
  type SelectOption,
} from '@/components/type-form-element';

interface SelectOptionRendererProps {
  option: any;
  optionsData: any[];
  onChangeOption: (optionId: string, value: any) => void;
  mapSelectOptions?: (options: any[]) => SelectOption[];
}

const GRANULARITY_OPTIONS: SelectOption[] = [
  {
    id: 'day',
    name: 'Gün',
    fieldOptionId: '',
    order: 0,
    icon: '',
  },
  {
    id: 'hour',
    name: 'Saat',
    fieldOptionId: '',
    order: 1,
    icon: '',
  },
  {
    id: 'minute',
    name: 'Dakika',
    fieldOptionId: '',
    order: 2,
    icon: '',
  },
  {
    id: 'second',
    name: 'Saniye',
    fieldOptionId: '',
    order: 3,
    icon: '',
  },
];

export const SelectOptionRenderer = ({
  option,
  optionsData,
  onChangeOption,
  mapSelectOptions,
}: SelectOptionRendererProps) => {
  const isDefaultOption = option.fieldTypeOption?.key === 'default-option';
  let selectOptions: SelectOption[] = [];

  if (isDefaultOption) {
    const dynamicOption = optionsData.find(
      (opt) => opt.fieldTypeOption?.key === 'is-dynamic-options',
    );
    if (dynamicOption) {
      selectOptions = dynamicOption.selectOptions || [];
    }
  } else if (option.fieldTypeOption?.key === 'granularity') {
    selectOptions = GRANULARITY_OPTIONS.map((opt) => ({
      ...opt,
      fieldOptionId: option.id,
    }));
  } else {
    selectOptions = option.selectOptions || [];
  }

  const finalOptions = mapSelectOptions
    ? mapSelectOptions(selectOptions)
    : selectOptions;

  return (
    <div className='p-4 border rounded-md flex items-center justify-between'>
      <SelectFormElement
        options={finalOptions}
        name={option.fieldTypeOption?.name || ''}
        id={option.id}
        key='fieldOption'
        value={option.value}
        onChange={(value: any) => onChangeOption(option.id, value)}
      />
    </div>
  );
};
