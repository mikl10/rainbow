import { Box, AccentColorProvider } from '@/design-system';
import React from 'react';
import { ButtonPressAnimation } from '../animations';
import LinearGradient from 'react-native-linear-gradient';
import { globalColors } from '@/design-system/color/palettes';
import { deviceUtils } from '@/utils';
import { IS_IOS } from '@/env';
import ConditionalWrap from 'conditional-wrap';

// (device width - (horizontal inset * 2 + padding between cards)) / # of cards in row
export const SquareCardHeight = (deviceUtils.dimensions.width - 60) / 2;

interface GenericCardProps {
  type: 'square' | 'stretch';
  gradient?: string[];
  children: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  color?: string;
  testID?: string;
}

export const GenericCard = ({
  children,
  disabled = false,
  type,
  gradient = ['transparent', 'transparent'],
  onPress,
  color,
  testID,
}: GenericCardProps) => (
  <ConditionalWrap
    condition={!!onPress}
    wrap={(children: React.ReactNode) => (
      <ButtonPressAnimation
        disabled={disabled}
        onPress={onPress}
        scaleTo={0.96}
        overflowMargin={50}
      >
        {children}
      </ButtonPressAnimation>
    )}
  >
    <AccentColorProvider color={color ?? globalColors.grey100}>
      <Box
        background={color ? 'accent' : 'surfacePrimaryElevated'}
        as={LinearGradient}
        colors={gradient}
        end={{ x: 1, y: 0 }}
        start={{ x: 0, y: 0.5 }}
        width={type === 'square' ? { custom: SquareCardHeight } : 'full'}
        height={
          type === 'square'
            ? {
                custom: SquareCardHeight,
              }
            : undefined
        }
        borderRadius={24}
        style={{ flex: IS_IOS ? 0 : undefined }}
        shadow={color ? '18px accent' : '18px'}
        padding="20px"
        testID={testID}
      >
        {children}
      </Box>
    </AccentColorProvider>
  </ConditionalWrap>
);
