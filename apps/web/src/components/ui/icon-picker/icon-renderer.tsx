import * as React from 'react';
import type { IconName } from 'lucide-react/dynamic';
import { Icon } from './icon';

export const IconRenderer = React.memo(({ name }: { name: IconName }) => {
  return <Icon name={name} />;
});
IconRenderer.displayName = 'IconRenderer';
