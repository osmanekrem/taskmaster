import { Moon, Sun, ChevronsUpDownIcon, MonitorIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

interface ModeToggleProps {
  size?: 'icon' | 'default';
  className?: string;
  variant?:
    | 'default'
    | 'outline'
    | 'ghost'
    | 'link'
    | 'destructive'
    | 'secondary';
}

export function ModeToggle({
  size = 'icon',
  className,
  variant = 'outline',
}: ModeToggleProps) {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Sun
            className={cn(
              'h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90',
              size === 'icon' && 'size-4',
            )}
          />
          <Moon
            className={cn(
              'absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0',
              size === 'icon' && 'size-4',
            )}
          />
          <span className='sr-only'>Toggle theme</span>
          {size === 'default' && (
            <span className='text-sm font-medium'>
              {theme === 'light'
                ? 'Açık Mod'
                : theme === 'dark'
                  ? 'Koyu Mod'
                  : 'Sistem'}
            </span>
          )}
          <span className='sr-only'>Toggle theme</span>
          {size === 'default' && (
            <ChevronsUpDownIcon className='size-4 ml-auto' />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' side='right'>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className='size-4' />
          Açık Mod
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className='size-4' />
          Koyu Mod
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <MonitorIcon className='size-4' />
          Sistem
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
