/* eslint-disable no-nested-ternary */
import React from 'react';
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';
import { Separator, Stack } from '@/design-system';
import { useDimensions } from '@/hooks';
import { EXPANDED_INPUT_HEIGHT, FOCUSED_INPUT_HEIGHT } from '@/__swaps__/screens/Swap/constants';
import { SearchInput } from '@/__swaps__/screens/Swap/components/SearchInput';
import { TokenToSellList } from '@/__swaps__/screens/Swap/components/TokenList/TokenToSellList';
import { TokenToBuyList } from '@/__swaps__/screens/Swap/components/TokenList/TokenToBuyList';
import { useSwapContext } from '@/__swaps__/screens/Swap/providers/swap-provider';

export const TokenList = ({
  handleExitSearch,
  handleFocusSearch,
  output,
}: {
  handleExitSearch: () => void;
  handleFocusSearch: () => void;
  output?: boolean;
}) => {
  const { inputProgress, outputProgress } = useSwapContext();
  const { width: deviceWidth } = useDimensions();

  // TODO: fix this since it's referencing a shared value on the JS thread
  const isFocused = output ? outputProgress.value === 2 : inputProgress.value === 2;

  const shouldDisplayTokenListStyles = useAnimatedStyle(() => {
    return {
      opacity: interpolate(output ? outputProgress.value : inputProgress.value, [0, 1], [0, 1]),
      display: output ? (outputProgress.value > 0 ? 'flex' : 'none') : inputProgress.value > 0 ? 'flex' : 'none',
      pointerEvents: output ? (outputProgress.value > 0 ? 'auto' : 'none') : inputProgress.value > 0 ? 'auto' : 'none',
    };
  });

  return (
    <Stack>
      <Stack space="20px">
        <SearchInput handleExitSearch={handleExitSearch} handleFocusSearch={handleFocusSearch} output={output} />
        <Separator color="separatorTertiary" thickness={1} />
      </Stack>
      <Animated.ScrollView
        contentContainerStyle={{
          paddingBottom: isFocused ? EXPANDED_INPUT_HEIGHT - FOCUSED_INPUT_HEIGHT + 20 : 20,
          paddingTop: 20,
        }}
        showsVerticalScrollIndicator={false}
        style={[
          shouldDisplayTokenListStyles,
          {
            alignSelf: 'center',
            height: EXPANDED_INPUT_HEIGHT - 77,
            width: deviceWidth - 24,
          },
        ]}
      >
        {!output && <TokenToSellList />}
        {output && <TokenToBuyList />}
      </Animated.ScrollView>
    </Stack>
  );
};

export const styles = StyleSheet.create({
  textIconGlow: {
    padding: 16,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
