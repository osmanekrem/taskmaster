import { useQuery } from '@tanstack/react-query';
import { getTicketTypesQuery } from '@/features/ticket-types/lib/queries';
import { Button } from '@/components/ui/button';
import { ChevronRightIcon, PlusIcon } from 'lucide-react';
import useAddTicketTypeModal from '@/features/ticket-types/hooks/use-add-ticket-type-modal';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/ui/icon-picker';
import type { IconName } from 'lucide-react/dynamic';

export default function TicketTypeList() {
  const { data } = useQuery(getTicketTypesQuery);
  const { open } = useAddTicketTypeModal();
  return (
    <div className='flex flex-col w-full max-w-64 space-y-4'>
      <div className='flex justify-between items-center'>
        <h2 className='text-xl font-bold leading-tight truncate'>
          Bilet Türleri
        </h2>
        <Button variant='outline' onClick={open}>
          <PlusIcon className='size-4' />
          Ekle
        </Button>
      </div>
      <div className='flex flex-col w-full space-y-4'>
        {data?.data?.map((ticketType) => (
          <Item variant='outline' size='sm' key={ticketType.id} asChild>
            <Link
              to='/admin-settings/ticket-types/$id'
              params={{ id: ticketType.id }}
              activeProps={{
                className: 'bg-primary/10',
              }}
              className='w-full'
            >
              <ItemMedia>
                <Icon
                  name={(ticketType.icon as IconName) ?? ''}
                  className='size-4'
                />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{ticketType.name}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <ChevronRightIcon className='size-4' />
              </ItemActions>
            </Link>
          </Item>
        ))}
      </div>
    </div>
  );
}
