import { useQuery } from '@tanstack/react-query';
import { getFieldsQuery } from '@/features/fields/lib/queries';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { TextCursorInputIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAddFieldModal from '@/features/fields/hooks/use-add-field-modal';

export default function FieldsIndex() {
  const { data } = useQuery(getFieldsQuery);
  const { open } = useAddFieldModal();

  const hasData = data?.data && data.data.length > 0;

  return (
    <Empty className='h-full'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <TextCursorInputIcon className='size-6' />
        </EmptyMedia>
        {hasData ? (
          <>
            <EmptyTitle>Bir alan seçin</EmptyTitle>
            <EmptyDescription>
              Detaylarını görmek için soldaki listeden bir alan seçin.
            </EmptyDescription>
          </>
        ) : (
          <>
            <EmptyTitle>Henüz alan eklenmemiş</EmptyTitle>
            <EmptyDescription>
              İlk alanınızı ekleyerek başlayın. Alanlar, bilet türlerinize özel
              özellikler eklemenize olanak tanır.
            </EmptyDescription>
          </>
        )}
      </EmptyHeader>
      {!hasData && (
        <EmptyContent>
          <Button onClick={open}>Alan Ekle</Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
