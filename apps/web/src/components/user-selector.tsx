import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from './ui/select';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getUsersInfiniteQuery } from '@/features/user-management/lib/queries';
import InfiniteScroll from './ui/infinite-scroll';
import UserAvatar from './user-avatar';
import type { User } from '@/lib/auth-client';

interface UserSelectorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export default function UserSelector({ value, onChange }: UserSelectorProps) {
  const { data, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery(getUsersInfiniteQuery('name', '', 10));

  const hasMore = hasNextPage && !isFetchingNextPage;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className='w-full'>
        <SelectValue placeholder='Select a user' />
      </SelectTrigger>
      <SelectContent>
        <InfiniteScroll
          isLoading={isPending}
          hasMore={hasMore}
          next={() => fetchNextPage()}
        >
          {data?.pages
            .flatMap((page) => page?.users as User[])
            .map((user) => (
              <SelectItem key={user?.id} value={user?.id}>
                <div className='flex items-center gap-2'>
                  <UserAvatar user={user} className='w-10 h-10' />
                  <span>
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
              </SelectItem>
            ))}
        </InfiniteScroll>
      </SelectContent>
    </Select>
  );
}
