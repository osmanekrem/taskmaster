import { IconPicker, Icon, type IconName } from '@/components/ui/icon-picker';
import { Button } from '@/components/ui/button';

interface TicketTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TicketTypeIconSelect({
  value,
  onChange,
}: TicketTypeSelectProps) {
  return (
    <IconPicker
      value={value as IconName}
      onValueChange={(newValue) => onChange(newValue)}
      triggerPlaceholder='İkon seç'
      searchPlaceholder='İkon ara...'
    >
      <Button type='button' variant='outline' className='w-full justify-start'>
        {value ? (
          <>
            <Icon name={value as IconName} className='mr-2 h-4 w-4' />
            {value}
          </>
        ) : (
          'İkon seç'
        )}
      </Button>
    </IconPicker>
  );
}
