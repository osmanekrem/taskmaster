import {
  BooleanFormElement,
  ParagraphFormElement,
  SelectFormElement,
  StaticSelectOptionsFormElement,
  TextFormElement,
} from '@/components/type-form-element';
import { Button } from '@/components/ui/button';
import { Fragment, useEffect, useState } from 'react';
import type {
  SaveSelectOptionsRequest,
  UpdateFieldOptionValueRequest,
} from '../../../fields/lib/mutations';
import type { IssueTypeFieldWithDetails } from '../../../fields/types';

interface CustomizeFieldFormProps {
  options?: IssueTypeFieldWithDetails['fieldOptions'];
  updateFieldOptionValue: (data: UpdateFieldOptionValueRequest) => void;
  saveSelectOptions: (data: SaveSelectOptionsRequest) => void;
}

export default function CustomizeFieldFormIssueType({
  options,
  updateFieldOptionValue,
  saveSelectOptions,
}: CustomizeFieldFormProps) {
  const [optionsData, setOptionsData] = useState(options || []);

  const [originalOptionsData, setOriginalOptionsData] = useState<any>({});
  const [selectOptionsData, setSelectOptionsData] = useState<any>({});
  const [isUpdated, setIsUpdated] = useState(false);
  const [optionsChanged, setOptionsChanged] = useState(false);

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
      (option) => option.fieldTypeOption.key === 'is-dynamic-options',
    );
    if (dynamicOption && JSON.parse(dynamicOption.value) === false) {
      const selectOptions = selectOptionsData[dynamicOption.id] || [];
      saveSelectOptions({
        fieldOptionId: dynamicOption.id,
        options: selectOptions.map((option: any) => ({
          fieldOptionId: dynamicOption.id,
          name: option.name,
          icon: option.icon,
          order: option.order,
          id: option.id,
        })),
      });
    }

    setIsUpdated(false);
    setOptionsChanged(false);
  };

  const onChangeOption = (optionId: string, newValue: any) => {
    setOptionsData((prevOptions) =>
      prevOptions.map((option) =>
        option.id === optionId ? { ...option, value: newValue } : option,
      ),
    );
  };

  const onChangeSelectOptions = (optionId: string, newOptions: any[]) => {
    setSelectOptionsData((prev: any) => ({
      ...prev,
      [optionId]: newOptions,
    }));
  };
  useEffect(() => {
    setOptionsData(options || []);
    if (
      options?.some(
        (option) => option.fieldTypeOption.key === 'is-dynamic-options',
      )
    ) {
      const selectOptionsMap: any = {};
      options
        .filter((opt) => opt.fieldTypeOption.key === 'is-dynamic-options')
        .forEach((option: any) => {
          selectOptionsMap[option.id] = option.selectOptions?.filter(
            (selectOption: any) => selectOption.fieldOptionId === option.id,
          );
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
  }, [optionsData]);

  useEffect(() => {
    const dynamicOption = optionsData.find(
      (option) => option.fieldTypeOption.key === 'is-dynamic-options',
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
  }, [selectOptionsData, optionsData, options]);

  return (
    <>
      <div className='flex flex-col w-full flex-1 min-h-0 space-y-4 overflow-y-auto'>
        {optionsData.map((option) => {
          switch (option.fieldTypeOption.type) {
            case 'boolean':
              const isDynamicSelectOptions =
                option.fieldTypeOption.key === 'is-dynamic-options';
              return (
                <Fragment key={option.id}>
                  <div className='p-4 border rounded-md flex items-center justify-between'>
                    <BooleanFormElement
                      id={option.id}
                      name={option.fieldTypeOption?.name}
                      value={option.value}
                      onChange={(value: any) =>
                        onChangeOption(option.id, value)
                      }
                    />
                  </div>
                  {isDynamicSelectOptions &&
                    (JSON.parse(option.value) === true ? (
                      <></>
                    ) : (
                      <StaticSelectOptionsFormElement
                        onChange={onChangeSelectOptions}
                        key={'issueTypeFieldOptionId'}
                        value={selectOptionsData[option.id]}
                        id={option.id}
                      />
                    ))}
                </Fragment>
              );
            case 'text':
              return (
                <div
                  key={option.id}
                  className='p-4 border rounded-md flex items-center justify-between'
                >
                  <TextFormElement
                    name={option.fieldTypeOption.name}
                    id={option.id}
                    value={option.value}
                    onChange={(value: any) => onChangeOption(option.id, value)}
                  />
                </div>
              );
            case 'select':
              const isDefaultOption =
                option.fieldTypeOption.key === 'default-option';
              let options: IssueTypeFieldWithDetails['fieldOptions'][number]['selectOptions'] =
                [];
              if (isDefaultOption) {
                const dynamicOption = optionsData.find(
                  (opt) => opt.fieldTypeOption.key === 'is-dynamic-options',
                );
                if (dynamicOption) {
                  options = dynamicOption.selectOptions;
                }
              } else if (option.fieldTypeOption.key === 'granularity') {
                options = [
                  {
                    id: 'day',
                    name: 'Gün',
                    issueTypeFieldOptionId: option.id,
                    order: 0,
                    icon: '',
                  },
                  {
                    id: 'hour',
                    name: 'Saat',
                    issueTypeFieldOptionId: option.id,
                    order: 1,
                    icon: '',
                  },
                  {
                    id: 'minute',
                    name: 'Dakika',
                    issueTypeFieldOptionId: option.id,
                    order: 2,
                    icon: '',
                  },
                  {
                    id: 'second',
                    name: 'Saniye',
                    issueTypeFieldOptionId: option.id,
                    order: 3,
                    icon: '',
                  },
                ];
              } else {
                options = option.selectOptions || [];
              }
              return (
                <div
                  key={option.id}
                  className='p-4 border rounded-md flex items-center justify-between'
                >
                  <SelectFormElement
                    options={options.map((option) => ({
                      id: option.id,
                      name: option.name,
                      icon: option.icon,
                      order: option.order,
                      issueTypeFieldOptionId: option.issueTypeFieldOptionId,
                    }))}
                    name={option.fieldTypeOption.name}
                    id={option.id}
                    value={option.value}
                    onChange={(value: any) => onChangeOption(option.id, value)}
                  />
                </div>
              );

            case 'paragraph':
              return (
                <div key={option.id} className='p-4 border rounded-md'>
                  <ParagraphFormElement
                    value={option.value}
                    name={option.fieldTypeOption.name}
                    id={option.id}
                    onChange={(value: any) => onChangeOption(option.id, value)}
                  />
                </div>
              );
            case 'number':
              break;
            default:
              return null;
          }
        })}
      </div>
      {(isUpdated || optionsChanged) && (
        <p className='text-sm text-warning'>
          Dikkat: Alan seçeneklerinde değişiklik yaptınız, ancak bu
          değişiklikler kaydedilmedi.
        </p>
      )}

      <Button
        disabled={!(isUpdated || optionsChanged)}
        onClick={onSave}
        className='w-full'
      >
        Değişiklikleri Kaydet
      </Button>
    </>
  );
}
