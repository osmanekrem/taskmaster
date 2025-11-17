import { useQuery } from '@tanstack/react-query';
import { getTicketTypesQuery } from '@/features/ticket-types/lib/queries';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { TicketIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useAddTicketTypeModal from '@/features/ticket-types/hooks/use-add-ticket-type-modal';

export default function TicketTypesIndex() {
  const { data } = useQuery(getTicketTypesQuery);
  const { open } = useAddTicketTypeModal();

  const hasData = data?.data && data.data.length > 0;

  return (
    <Empty className='h-full'>
      <EmptyHeader>
        <EmptyMedia variant='icon'>
          <TicketIcon className='size-6' />
        </EmptyMedia>
        {hasData ? (
          <>
            <EmptyTitle>Bir bilet türü seçin</EmptyTitle>
            <EmptyDescription>
              Detaylarını görmek için soldaki listeden bir bilet türü seçin.
            </EmptyDescription>
          </>
        ) : (
          <>
            <EmptyTitle>Henüz bilet türü eklenmemiş</EmptyTitle>
            <EmptyDescription>
              İlk bilet türünüzü ekleyerek başlayın. Bilet türleri,
              projelerinizde farklı iş akışları ve özellikler tanımlamanıza
              olanak tanır.
            </EmptyDescription>
          </>
        )}
      </EmptyHeader>
      {!hasData && (
        <EmptyContent>
          <Button onClick={open}>Bilet Türü Ekle</Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
