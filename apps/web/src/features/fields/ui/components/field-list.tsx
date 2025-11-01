import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ChevronRightIcon, PlusIcon } from 'lucide-react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Link } from '@tanstack/react-router';
import { getFieldsQuery } from '@/features/fields/lib/queries';
import useAddFieldModal from '@/features/fields/hooks/use-add-field-modal';
import { Icon } from '@/components/ui/icon-picker';
import type { IconName } from 'lucide-react/dynamic';

export default function FieldList() {
  const { data } = useQuery(getFieldsQuery);
  const { open } = useAddFieldModal();
  return (
    <div className='flex flex-col w-full max-w-64 space-y-4'>
      <div className='flex justify-between items-center'>
        <h2 className='text-xl font-bold leading-tight truncate'>Alanlar</h2>
        <Button variant='outline' onClick={open}>
          <PlusIcon className='size-4' />
          Ekle
        </Button>
      </div>
      <div className='flex flex-col w-full space-y-4'>
        {data?.data?.map((field) => (
          <Item variant='outline' size='sm' key={field.id} asChild>
            <Link
              to='/admin-settings/fields/$id'
              params={{ id: field.id }}
              activeProps={{
                className: 'bg-primary/10',
              }}
              className='w-full'
            >
              <ItemMedia>
                <Icon name={(field?.icon as IconName) ?? ''} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{field.name}</ItemTitle>
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
