import { Skeleton } from '@/components/ui/skeleton';

export const IconsColumnSkeleton = () => {
  return (
    <div className='flex flex-col gap-2 w-full'>
      <Skeleton className='h-4 w-1/2 rounded-md' />
      <div className='grid grid-cols-5 gap-2 w-full'>
        {Array.from({ length: 40 }).map((_, i) => (
          <Skeleton key={i} className='h-10 w-10 rounded-md' />
        ))}
      </div>
    </div>
  );
};
