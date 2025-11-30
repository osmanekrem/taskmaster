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
import { CheckIcon, ChevronDownIcon, SearchIcon } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group';
import { useEffect, useId, useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './ui/command';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface UserSelectorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}

export default function UserSelector({ value, onChange, placeholder = "Kullanıcı seçiniz" }: UserSelectorProps) {
const id = useId();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const { data, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery(getUsersInfiniteQuery('name', search, 10));

  const hasMore = hasNextPage && !isFetchingNextPage;

  const dataToUse = data?.pages.flatMap((page) => page?.users || []) as User[];

  useEffect(() => {
    if (value) {
      const user = dataToUse?.find((user) => user.id === value);
      if (user && !selectedUser) {
        setSelectedUser(user);
      }
    }
  }, [value, dataToUse]);
  useEffect(() => {
    onChange(selectedUser?.id);
  }, [selectedUser, onChange]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between border-input bg-background px-3 h-11 font-normal outline-offset-0 outline-none hover:bg-background focus-visible:outline-[3px]"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {selectedUser
                ? (
                  <div className="flex items-center gap-2">
                    <UserAvatar user={selectedUser} />
                    <span className="truncate">{selectedUser.name}</span>
                  </div>
                )
                : placeholder}
            </span>
            <ChevronDownIcon
              size={16}
              className="shrink-0 text-muted-foreground/80"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput placeholder="Kullanıcı ara..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>Kullanıcı bulunamadı.</CommandEmpty>
              <CommandGroup>
                {dataToUse?.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={(currentValue) => {
                      setSelectedUser(currentValue === selectedUser?.id ? undefined : user)
                      setOpen(false)
                    }}
                  >
                    <UserAvatar user={user} />
                    <span className="truncate">{user.name}</span>
                    {selectedUser?.id === user.id && (
                      <CheckIcon size={16} className="ml-auto" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
  );
}
