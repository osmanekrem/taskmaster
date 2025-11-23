import { useState, useEffect } from 'react';
import type {
  SaveSelectOptionsRequest,
  UpdateFieldOptionValueRequest,
} from '../mutations';
import type { FieldOption, SelectOptionsMap } from '@/types/fields';

interface UseCustomizeFieldFormProps {
  options?: FieldOption[];
  updateFieldOptionValue: (data: UpdateFieldOptionValueRequest) => void;
  saveSelectOptions: (data: SaveSelectOptionsRequest) => void;
}

export const useCustomizeFieldForm = ({
  options,
  updateFieldOptionValue,
  saveSelectOptions,
}: UseCustomizeFieldFormProps) => {
  const [optionsData, setOptionsData] = useState<FieldOption[]>(options || []);
  const [originalOptionsData, setOriginalOptionsData] =
    useState<SelectOptionsMap>({});
  const [selectOptionsData, setSelectOptionsData] = useState<SelectOptionsMap>(
    {},
  );
  const [isUpdated, setIsUpdated] = useState(false);
  const [optionsChanged, setOptionsChanged] = useState(false);

  const onChangeOption = (
    optionId: string,
    newValue: string | boolean | number,
  ) => {
    setOptionsData((prevOptions) =>
      prevOptions.map((option) =>
        option.id === optionId
          ? { ...option, value: String(newValue) }
          : option,
      ),
    );
  };

  const onChangeSelectOptions = (
    optionId: string,
    newOptions: FieldOption['selectOptions'],
  ) => {
    if (!newOptions) return;
    setSelectOptionsData((prev: SelectOptionsMap) => ({
      ...prev,
      [optionId]: newOptions,
    }));
  };

  const onSave = () => {
    optionsData.forEach((option) => {
      updateFieldOptionValue({
        fieldOptionId: option.id,
        value:
          typeof option.value === 'string'
            ? option.value
            : JSON.stringify(option.value),
      });
    });

    const dynamicOption = optionsData.find(
      (option) => option.fieldTypeOption?.key === 'is-dynamic-options',
    );
    if (dynamicOption && JSON.parse(dynamicOption.value) === false) {
      const selectOptions = selectOptionsData[dynamicOption.id] || [];
      saveSelectOptions({
        fieldOptionId: dynamicOption.id,
        options: selectOptions.map((option) => ({
          fieldOptionId: dynamicOption.id,
          name: option.name,
          icon: option.icon || undefined,
          order: option.order,
          id: option.id,
        })),
      });
    }

    setIsUpdated(false);
    setOptionsChanged(false);
  };

  useEffect(() => {
    setOptionsData(options || []);
    if (
      options?.some(
        (option) => option.fieldTypeOption?.key === 'is-dynamic-options',
      )
    ) {
      const selectOptionsMap: SelectOptionsMap = {};
      options
        .filter((opt) => opt.fieldTypeOption?.key === 'is-dynamic-options')
        .forEach((option) => {
          if (option.selectOptions) {
            selectOptionsMap[option.id] = option.selectOptions.filter(
              (selectOption) => selectOption.fieldOptionId === option.id,
            );
          }
        });
      setSelectOptionsData(selectOptionsMap);
      setOriginalOptionsData(selectOptionsMap);
    }

    setIsUpdated(false);
  }, [options]);

  useEffect(() => {
    if (
      JSON.stringify(
        optionsData.map((option) => ({
          ...option,
          value:
            typeof option.value === 'string'
              ? option.value
              : JSON.stringify(option.value),
        })),
      ) !== JSON.stringify(options)
    ) {
      setIsUpdated(true);
    } else {
      setIsUpdated(false);
    }
  }, [optionsData, options]);

  useEffect(() => {
    const dynamicOption = optionsData.find(
      (option) => option.fieldTypeOption?.key === 'is-dynamic-options',
    );
    if (dynamicOption && JSON.parse(dynamicOption.value) === false) {
      const originalSelectOptions = originalOptionsData || {};
      const currentSelectOptions = selectOptionsData[dynamicOption.id] || [];
      if (
        JSON.stringify(currentSelectOptions) !==
        JSON.stringify(originalSelectOptions[dynamicOption.id] || [])
      ) {
        setOptionsChanged(true);
      } else {
        setOptionsChanged(false);
      }
    }
  }, [selectOptionsData, optionsData, options, originalOptionsData]);

  return {
    optionsData,
    selectOptionsData,
    isUpdated,
    optionsChanged,
    onChangeOption,
    onChangeSelectOptions,
    onSave,
  };
};
