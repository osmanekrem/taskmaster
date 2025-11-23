import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ErrorFallbackProps {
  readonly error: Error;
  readonly resetErrorBoundary?: () => void;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  return (
    <div className='flex items-center justify-center min-h-screen p-4'>
      <div className='max-w-md w-full space-y-4'>
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>Bir hata oluştu</AlertTitle>
          <AlertDescription>
            {error.message || 'Beklenmeyen bir hata meydana geldi.'}
          </AlertDescription>
        </Alert>
        {resetErrorBoundary && (
          <div className='flex gap-2'>
            <Button
              onClick={resetErrorBoundary}
              variant='outline'
              className='flex-1'
            >
              Tekrar Dene
            </Button>
            <Button
              onClick={() => (window.location.href = '/')}
              variant='default'
              className='flex-1'
            >
              Ana Sayfaya Dön
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
