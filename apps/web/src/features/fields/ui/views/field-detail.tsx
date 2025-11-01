import { useParams } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { PencilIcon } from 'lucide-react';
import useEditFieldModal from '@/features/fields/hooks/use-edit-field-modal';
import EditFieldModal from '@/features/fields/ui/components/edit-field-modal';
import DeleteFieldButton from '@/features/fields/ui/components/delete-field-button';
import { Route } from '@/routes/__protected/__admin/admin-settings/fields/$id';
import {
  BooleanFormElement,
  ParagraphFormElement,
  SelectFormElement,
  type SelectOption,
  StaticSelectOptionsFormElement,
  TextFormElement,
} from '@/components/type-form-element';
import { Fragment, useEffect, useState } from 'react';
import { getFieldWithDetailsQuery } from '@/features/fields/lib/queries';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  saveSelectOptionsMutation,
  updateFieldOptionValueMutation,
} from '@/features/fields/lib/mutations';
import { Icon } from '@/components/ui/icon-picker';
import type { IconName } from 'lucide-react/dynamic';

export default function FieldDetail() {
  const { id } = useParams({ from: Route.id });
  const { data } = useQuery(getFieldWithDetailsQuery(id));
  const { open } = useEditFieldModal();
  const saveSelectOptions = useMutation(saveSelectOptionsMutation);
  const updateFieldOptionValue = useMutation(updateFieldOptionValueMutation);

  const [optionsData, setOptionsData] = useState(data?.data?.options || []);

  const [originalOptionsData, setOriginalOptionsData] = useState<any>({});
  const [selectOptionsData, setSelectOptionsData] = useState<any>({});
  const [isUpdated, setIsUpdated] = useState(false);
  const [optionsChanged, setOptionsChanged] = useState(false);

  const onSave = () => {
    optionsData.forEach((option) => {
      updateFieldOptionValue.mutate({
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
      saveSelectOptions.mutate({
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
    if (!data) return;
    setOptionsData(data?.data?.options || []);
    if (
      data?.data?.options?.some(
        (option) => option.fieldTypeOption.key === 'is-dynamic-options',
      )
    ) {
      const selectOptionsMap: any = {};
      data?.data?.options
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
  }, [data]);

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
      ) !== JSON.stringify(data?.data?.options)
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
  }, [selectOptionsData, optionsData, data]);

  return (
    <div className='flex flex-col w-full h-full space-y-4'>
      <EditFieldModal />
      <div className='flex justify-between items-center'>
        <h2 className='text-xl font-bold leading-tight flex items-center gap-2 truncate'>
          <Icon name={(data?.data?.icon as IconName) ?? ''} />
          {data?.data?.name}
        </h2>

        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={() => open(id)}>
            <PencilIcon className='size-4' />
            Düzenle
          </Button>
          <DeleteFieldButton id={id} />
        </div>
      </div>
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
              let options: SelectOption[] = [];
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
                    fieldOptionId: option.id,
                    order: 0,
                    icon: '',
                  },
                  {
                    id: 'hour',
                    name: 'Saat',
                    fieldOptionId: option.id,
                    order: 1,
                    icon: '',
                  },
                  {
                    id: 'minute',
                    name: 'Dakika',
                    fieldOptionId: option.id,
                    order: 2,
                    icon: '',
                  },
                  {
                    id: 'second',
                    name: 'Saniye',
                    fieldOptionId: option.id,
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
                    options={options}
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
    </div>
  );
}
