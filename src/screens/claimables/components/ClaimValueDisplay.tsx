import React from 'react';
import { ChainId } from '@/chains/types';
import RainbowCoinIcon from '@/components/coin-icon/RainbowCoinIcon';
import { Bleed, Box, globalColors, Text, TextShadow, useColorMode } from '@/design-system';
import { useTheme } from '@/theme';
import { View } from 'react-native';
import { IS_IOS } from '@/env';
import { ShimmerAnimation } from '@/components/animations';

export function ClaimValueDisplay({
  chainId,
  iconUrl,
  nativeValueDisplay,
  symbol,
}: {
  chainId?: ChainId;
  iconUrl?: string;
  nativeValueDisplay?: string;
  symbol?: string;
}) {
  const { isDarkMode } = useColorMode();
  const theme = useTheme();

  return (
    <Bleed vertical={{ custom: 4.5 }}>
      {chainId && symbol ? (
        <Box alignItems="center" flexDirection="row" gap={8} justifyContent="center">
          <View
            style={
              IS_IOS && isDarkMode
                ? {
                    shadowColor: globalColors.grey100,
                    shadowOpacity: 0.2,
                    shadowOffset: { height: 4, width: 0 },
                    shadowRadius: 6,
                  }
                : {}
            }
          >
            <RainbowCoinIcon size={40} icon={iconUrl} chainId={chainId} symbol={symbol} theme={theme} colors={undefined} />
          </View>
          {nativeValueDisplay ? (
            <TextShadow blur={12} color={globalColors.grey100} shadowOpacity={0.1} y={4}>
              <Text align="center" color="label" size="44pt" weight="black">
                {nativeValueDisplay}
              </Text>
            </TextShadow>
          ) : (
            <Box
              width={{ custom: 200 }}
              height={{ custom: 31 }}
              borderRadius={20}
              style={{ backgroundColor: isDarkMode ? 'rgba(245, 248, 255, 0.04)' : 'rgba(9, 17, 31, 0.02)' }}
            >
              <ShimmerAnimation color="#FFFFFF" enabled width={248} />
            </Box>
          )}
        </Box>
      ) : (
        <Box
          width={{ custom: 248 }}
          height={{ custom: 40 }}
          borderRadius={20}
          style={{ backgroundColor: isDarkMode ? 'rgba(245, 248, 255, 0.04)' : 'rgba(9, 17, 31, 0.02)' }}
        >
          <ShimmerAnimation color="#FFFFFF" enabled width={248} />
        </Box>
      )}
    </Bleed>
  );
}
