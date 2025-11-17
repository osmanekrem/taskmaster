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
    <div className='flex flex-col w-full max-w-48 space-y-4'>
      <div className='flex justify-between items-center'>
        <h2 className='text-lg font-semibold leading-tight truncate'>
          Bilet Türleri
        </h2>
      </div>
      <Button variant='outline' onClick={open} className='w-full'>
        <PlusIcon className='size-4' />
        Ekle
      </Button>
      <div className='flex flex-col w-full space-y-2.5 overflow-y-auto'>
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
                <ItemTitle className='text-sm font-medium leading-tight truncate'>
                  {ticketType.name}
                </ItemTitle>
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
