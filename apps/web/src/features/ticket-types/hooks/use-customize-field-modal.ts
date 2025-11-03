import { parseAsString, useQueryState } from 'nuqs';

export default function useCustomizeFieldModal() {
  const [fieldId, setFieldId] = useQueryState(
    'customize-field-modal',
    parseAsString.withOptions({ clearOnDefault: true }),
  );
  const open = (fieldId: string) => setFieldId(fieldId);
  const close = () => setFieldId('');
  return { fieldId, open, close, setFieldId };
}
