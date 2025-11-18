import * as React from 'react';
import { useMemo } from 'react';
import type { LucideProps, LucideIcon } from 'lucide-react';
import type { IconName } from 'lucide-react/dynamic';
import { iconsData } from '../icons-data';

interface IconProps extends Omit<LucideProps, 'ref'> {
  name: IconName;
}

export const Icon = React.forwardRef<React.ComponentRef<LucideIcon>, IconProps>(
  ({ name, ...props }, ref) => {
    const iconMemo = useMemo(() => {
      return iconsData.find((icon) => icon.name === name);
    }, [name]);

    if (!iconMemo || !iconMemo.component) {
      return null;
    }

    return <iconMemo.component {...props} ref={ref} />;
  },
);
Icon.displayName = 'Icon';
