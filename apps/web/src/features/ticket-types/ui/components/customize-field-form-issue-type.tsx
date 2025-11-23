import { Button } from '@/components/ui/button';
import type {
  SaveSelectOptionsRequest,
  UpdateFieldOptionValueRequest,
} from '../../../fields/lib/mutations';
import type { FieldWithDetails } from '../../../fields/types';
import { useCustomizeFieldForm } from '../../../fields/lib/hooks/use-customize-field-form';
import { FieldOptionsList } from '../../../fields/ui/components/field-options-list';
import type { SelectOption } from '@/components/type-form-element';

interface CustomizeFieldFormProps {
  options?: FieldWithDetails['options'];
  updateFieldOptionValue: (data: UpdateFieldOptionValueRequest) => void;
  saveSelectOptions: (data: SaveSelectOptionsRequest) => void;
}

export default function CustomizeFieldFormIssueType({
  options,
  updateFieldOptionValue,
  saveSelectOptions,
}: CustomizeFieldFormProps) {
  const {
    optionsData,
    selectOptionsData,
    isUpdated,
    optionsChanged,
    onChangeOption,
    onChangeSelectOptions,
    onSave,
  } = useCustomizeFieldForm({
    options,
    updateFieldOptionValue,
    saveSelectOptions,
  });

  const mapSelectOptions = (options: SelectOption[]): SelectOption[] => {
    return options.map((option) => ({
      id: option.id,
      name: option.name,
      icon: option.icon,
      order: option.order,
      fieldOptionId: option.fieldOptionId,
    }));
  };

  return (
    <>
      <FieldOptionsList
        optionsData={optionsData}
        selectOptionsData={selectOptionsData}
        onChangeOption={onChangeOption}
        onChangeSelectOptions={onChangeSelectOptions}
        mapSelectOptions={mapSelectOptions}
      />
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
