import { infiniteQueryOptions, mutationOptions } from '@tanstack/react-query';
import { queryClient, trpc } from '@/utils/trpc';
import { authClient, type User } from '@/lib/auth-client';
import { createUser, deleteUser, editUser } from './actions';
import { toast } from 'sonner';
import type {
  CreateUserSchema,
  GetUsersRequestSchema,
} from '@taskmaster/validation';
import { handleError } from '@/lib/errors';
import { userKeys } from '@/lib/queries/query-keys';

export const getUserQuery = (userId: string) =>
  trpc.user.getUserById.queryOptions({ userId });

export const getUsersPaginatedQuery = (data: GetUsersRequestSchema) =>
  trpc.user.getUsersPaginated.queryOptions(data);

export const getUsersInfiniteQuery = (
  searchField: 'name' | 'email',
  searchValue: string,
  limit: number = 10,
  searchOperator: 'contains' | 'starts_with' | 'ends_with' = 'contains',
) =>
  infiniteQueryOptions({
    queryKey: userKeys.infinite({
      searchField,
      searchValue,
      limit,
      searchOperator,
    }),
    queryFn: async ({ pageParam }) => {
      const response = await authClient.admin.listUsers({
        query: {
          limit,
          offset: pageParam,
          searchField,
          searchValue,
          searchOperator,
        },
      });
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      const currentOffset = allPages.length * limit;
      return currentOffset < lastPage.total ? currentOffset : undefined;
    },
    initialPageParam: 0,
  });

export const deleteUserQuery = (userId: string) =>
  mutationOptions({
    mutationFn: () => {
      return deleteUser({ userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.setQueryData(
        userKeys.paginated(),
        (oldData: { data: { users: User[]; total: number } } | undefined) => {
          if (!oldData || !oldData.data) return { data: [], total: 0 };
          const updatedUsers = oldData.data.users.filter(
            (user) => user.id !== userId,
          );
          return {
            data: { users: updatedUsers, total: oldData.data.total - 1 },
          };
        },
      );

      toast.success('Kullanıcı başarıyla silindi');
    },
    onError: (error) => {
      handleError(error);
    },
  });

export const createUserQuery = mutationOptions({
  mutationFn: (data: CreateUserSchema) => {
    return createUser(data);
  },
  onSuccess: (user) => {
    queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    queryClient.setQueryData(
      userKeys.paginated(),
      (oldData: { data: { users: User[]; total: number } } | undefined) => {
        if (!oldData || !oldData.data) return { data: [user], total: 1 };
        return {
          data: {
            users: [...oldData.data.users, user.user],
            total: oldData.data.total + 1,
          },
        };
      },
    );
    toast.success('Kullanıcı başarıyla oluşturuldu');
  },
});

export const editUserQuery = (userId: string) =>
  mutationOptions({
    mutationFn: editUser,
    onSuccess: () => {
      toast.success('Kullanıcı başarıyla düzenlendi');
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error) => {
      handleError(error);
    },
  });
