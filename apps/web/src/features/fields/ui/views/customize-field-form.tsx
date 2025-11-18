import { Button } from '@/components/ui/button';
import type { RouterOutput } from '@/utils/trpc';
import type {
  SaveSelectOptionsRequest,
  UpdateFieldOptionValueRequest,
} from '../../lib/mutations';
import { useCustomizeFieldForm } from '../../lib/hooks/use-customize-field-form';
import { FieldOptionsList } from '../components/field-options-list';

type FieldOptions =
  RouterOutput['fields']['getFieldsWithDetails']['data'][number]['options'][number];

interface CustomizeFieldFormProps {
  options?: FieldOptions[];
  updateFieldOptionValue: (data: UpdateFieldOptionValueRequest) => void;
  saveSelectOptions: (data: SaveSelectOptionsRequest) => void;
}

export default function CustomizeFieldForm({
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

  return (
    <>
      <FieldOptionsList
        optionsData={optionsData}
        selectOptionsData={selectOptionsData}
        onChangeOption={onChangeOption}
        onChangeSelectOptions={onChangeSelectOptions}
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
