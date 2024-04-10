import React from 'react';
import { StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { Network } from '@/networks/types';
import { borders, fonts } from '@/styles';
import { ThemeContextProps } from '@/theme';

import { FastFallbackCoinIconImage } from '../asset-list/RecyclerAssetList2/FastComponents/FastFallbackCoinIconImage';
import { FastChainBadge } from '../asset-list/RecyclerAssetList2/FastComponents/FastCoinBadge';
import { TokenColors } from '@/graphql/__generated__/metadata';
import FallbackIcon from './FallbackIcon';

const fallbackTextStyles: TextStyle = {
  fontFamily: fonts.family.SFProRounded,
  fontWeight: fonts.weight.bold as any,
  letterSpacing: fonts.letterSpacing.roundedTight,
  marginBottom: 0.5,
  textAlign: 'center',
};

const fallbackIconStyle = (size: number): ViewStyle => ({
  ...borders.buildCircleAsObject(size),
  position: 'absolute',
});

export default React.memo(function RainbowCoinIcon({
  size = 40,
  icon,
  network,
  symbol,
  theme,
  colors,
  ignoreBadge,
  fallbackColor,
  badgeXPosition,
  badgeYPosition,
}: {
  size?: number;
  icon?: string;
  network: Network;
  symbol: string;
  theme: ThemeContextProps;
  fallbackColor?: string;
  colors?: TokenColors;
  ignoreBadge?: boolean;
  badgeXPosition?: number;
  badgeYPosition?: number;
}) {
  const fallbackIconColor = colors?.primary || colors?.fallback || fallbackColor || theme.colors.purpleUniswap;

  const shadowColor = theme.isDarkMode ? theme.colors.shadow : colors?.primary || colors?.fallback || theme.colors.shadow;

  return (
    <View style={sx.container}>
      <FastFallbackCoinIconImage network={network} icon={icon} shadowColor={shadowColor} symbol={symbol} theme={theme} size={size}>
        {() => (
          <FallbackIcon
            color={fallbackIconColor}
            height={size}
            style={fallbackIconStyle(size)}
            symbol={symbol}
            textStyles={fallbackTextStyles}
            width={size}
          />
        )}
      </FastFallbackCoinIconImage>

      {!ignoreBadge && network && <FastChainBadge network={network} theme={theme} />}
    </View>
  );
});

const sx = StyleSheet.create({
  container: {
    elevation: 6,
    overflow: 'visible',
  },
  reactCoinIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  withShadow: {
    elevation: 6,
    shadowOffset: {
      height: 4,
      width: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
