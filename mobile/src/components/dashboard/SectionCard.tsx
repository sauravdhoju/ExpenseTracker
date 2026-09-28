import type { ReactNode } from 'react';
import { View } from 'react-native';
import { spacing } from '../../constants/theme';
import { SectionTitle, Sheet } from '../ui/Sheet';

export { SectionTitle, Sheet, SheetRow } from '../ui/Sheet';

interface Props {
  title: string;
  linkLabel?: string;
  onLinkPress?: () => void;
  children: ReactNode;
}

export default function SectionCard({ title, linkLabel = 'See all', onLinkPress, children }: Props) {
  return (
    <View>
      <SectionTitle title={title} linkLabel={linkLabel} onLinkPress={onLinkPress} />
      <Sheet style={{ paddingVertical: spacing.md }}>{children}</Sheet>
    </View>
  );
}
