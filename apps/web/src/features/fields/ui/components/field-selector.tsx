import { useQuery } from '@tanstack/react-query';
import { getFieldsWithDetailsQuery } from '@/features/fields/lib/queries';
import { FieldSelectorItem } from './field-selector-item';

interface FieldSelectorProps {
  readonly fields: any[];
  readonly setFields: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function FieldSelector({
  fields,
  setFields,
}: FieldSelectorProps) {
  const { data } = useQuery(getFieldsWithDetailsQuery);

  const handleToggleField = (field: any) => {
    const isSelected = fields.some((item) => item.id === field.id);
    if (isSelected) {
      setFields((prevFields) =>
        prevFields.filter((item) => item.id !== field.id),
      );
    } else {
      setFields((prevFields) => [...prevFields, field]);
    }
  };

  return (
    <div className='flex flex-col w-full space-y-2 h-full overflow-y-auto'>
      {data?.data.map((field) => {
        const isSelected = fields.some((item) => item.id === field.id);
        return (
          <FieldSelectorItem
            key={field.id}
            field={field}
            isSelected={isSelected}
            onToggle={() => handleToggleField(field)}
          />
        );
      })}
    </div>
  );
}
