import type React from 'react';
import { Button } from '@/components/ui/button';

type FormApi = {
  Subscribe: (props: {
    children: (state: {
      canSubmit: boolean;
      isSubmitting: boolean;
    }) => React.ReactNode;
  }) => React.ReactNode;
};

type FormSubmitButtonProps = {
  readonly form: FormApi;
  readonly label?: string;
  readonly submittingLabel?: string;
  readonly className?: string;
  readonly disabled?: boolean;
};

export function FormSubmitButton({
  form,
  label = 'Gönder',
  submittingLabel = 'Gönderiliyor...',
  className,
  disabled,
}: FormSubmitButtonProps) {
  return (
    <form.Subscribe>
      {(state: { canSubmit: boolean; isSubmitting: boolean }) => (
        <Button
          className={className}
          disabled={disabled || !state.canSubmit || state.isSubmitting}
          type='submit'
        >
          {state.isSubmitting ? submittingLabel : label}
        </Button>
      )}
    </form.Subscribe>
  );
}
