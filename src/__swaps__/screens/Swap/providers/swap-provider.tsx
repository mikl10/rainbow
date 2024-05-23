import React, { createContext, useContext, ReactNode } from 'react';
import { StyleProp, TextStyle, TextInput } from 'react-native';
import {
  AnimatedRef,
  SharedValue,
  runOnUI,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { SwapAssetType, inputKeys } from '@/__swaps__/types/swap';
import { INITIAL_SLIDER_POSITION, SLIDER_COLLAPSED_HEIGHT, SLIDER_HEIGHT, SLIDER_WIDTH } from '@/__swaps__/screens/Swap/constants';
import { useAnimatedSwapStyles } from '@/__swaps__/screens/Swap/hooks/useAnimatedSwapStyles';
import { useSwapTextStyles } from '@/__swaps__/screens/Swap/hooks/useSwapTextStyles';
import { useSwapNavigation, NavigationSteps } from '@/__swaps__/screens/Swap/hooks/useSwapNavigation';
import { useSwapInputsController } from '@/__swaps__/screens/Swap/hooks/useSwapInputsController';
import { ExtendedAnimatedAssetWithColors, ParsedSearchAsset } from '@/__swaps__/types/assets';
import { useSwapWarning } from '@/__swaps__/screens/Swap/hooks/useSwapWarning';
import { useSwapGas } from '@/__swaps__/screens/Swap/hooks/useSwapGas';
import { useSwapSettings } from '@/__swaps__/screens/Swap/hooks/useSwapSettings';
import { CrosschainQuote, Quote, QuoteError } from '@rainbow-me/swaps';
import { swapsStore } from '@/state/swaps/swapsStore';
import { isSameAsset, parseSearchAsset } from '@/__swaps__/utils/assets';
import { parseAssetAndExtend } from '@/__swaps__/utils/swaps';
import { ChainId } from '@/__swaps__/types/chains';
import { logger } from '@/logger';
import { userAssetsStore } from '@/state/assets/userAssets';

interface SwapContextType {
  isFetching: SharedValue<boolean>;
  isQuoteStale: SharedValue<number>;
  searchInputRef: AnimatedRef<TextInput>;

  // TODO: Combine navigation progress steps into a single shared value
  inputProgress: SharedValue<number>;
  outputProgress: SharedValue<number>;
  configProgress: SharedValue<number>;

  sliderXPosition: SharedValue<number>;
  sliderPressProgress: SharedValue<number>;

  lastTypedInput: SharedValue<inputKeys>;
  focusedInput: SharedValue<inputKeys>;

  selectedOutputChainId: SharedValue<ChainId>;
  setSelectedOutputChainId: (chainId: ChainId) => void;

  internalSelectedInputAsset: SharedValue<ExtendedAnimatedAssetWithColors | null>;
  internalSelectedOutputAsset: SharedValue<ExtendedAnimatedAssetWithColors | null>;
  setAsset: ({ type, asset }: { type: SwapAssetType; asset: ParsedSearchAsset | null }) => void;

  quote: SharedValue<Quote | CrosschainQuote | QuoteError | null>;

  SwapSettings: ReturnType<typeof useSwapSettings>;
  SwapInputsController: ReturnType<typeof useSwapInputsController>;
  AnimatedSwapStyles: ReturnType<typeof useAnimatedSwapStyles>;
  SwapTextStyles: ReturnType<typeof useSwapTextStyles>;
  SwapNavigation: ReturnType<typeof useSwapNavigation>;
  SwapWarning: ReturnType<typeof useSwapWarning>;
  SwapGas: ReturnType<typeof useSwapGas>;

  confirmButtonIcon: Readonly<SharedValue<string>>;
  confirmButtonLabel: Readonly<SharedValue<string>>;
  confirmButtonIconStyle: StyleProp<TextStyle>;
}

const SwapContext = createContext<SwapContextType | undefined>(undefined);

interface SwapProviderProps {
  children: ReactNode;
}

export const SwapProvider = ({ children }: SwapProviderProps) => {
  const isFetching = useSharedValue(false);
  const isQuoteStale = useSharedValue(0);

  const searchInputRef = useAnimatedRef<TextInput>();

  const inputProgress = useSharedValue(NavigationSteps.INPUT_ELEMENT_FOCUSED);
  const outputProgress = useSharedValue(NavigationSteps.TOKEN_LIST_FOCUSED);
  const configProgress = useSharedValue(NavigationSteps.INPUT_ELEMENT_FOCUSED);

  const sliderXPosition = useSharedValue(SLIDER_WIDTH * INITIAL_SLIDER_POSITION);
  const sliderPressProgress = useSharedValue(SLIDER_COLLAPSED_HEIGHT / SLIDER_HEIGHT);

  const lastTypedInput = useSharedValue<inputKeys>('inputAmount');
  const focusedInput = useSharedValue<inputKeys>('inputAmount');

  // NOTE: On mount let's set the initial input asset to the first user asset (aka the user asset with the largest balance)
  const INTERNAL_INITIAL_USER_ASSET = userAssetsStore.getState().userAssets.values().next().value;

  const internalSelectedInputAsset = useSharedValue<ExtendedAnimatedAssetWithColors | null>(
    parseAssetAndExtend({ asset: INTERNAL_INITIAL_USER_ASSET })
  );
  const internalSelectedOutputAsset = useSharedValue<ExtendedAnimatedAssetWithColors | null>(null);
  const selectedOutputChainId = useSharedValue<ChainId>(INTERNAL_INITIAL_USER_ASSET?.chainId ?? ChainId.mainnet);

  if (INTERNAL_INITIAL_USER_ASSET) {
    const parsedAsset = parseSearchAsset({
      assetWithPrice: undefined,
      searchAsset: INTERNAL_INITIAL_USER_ASSET,
      userAsset: INTERNAL_INITIAL_USER_ASSET,
    });
    swapsStore.setState({ inputAsset: parsedAsset });
  }

  const quote = useSharedValue<Quote | CrosschainQuote | QuoteError | null>(null);

  const SwapSettings = useSwapSettings({
    inputAsset: internalSelectedInputAsset,
  });

  const SwapGas = useSwapGas({
    inputAsset: internalSelectedInputAsset,
    outputAsset: internalSelectedOutputAsset,
  });

  const SwapInputsController = useSwapInputsController({
    focusedInput,
    lastTypedInput,
    inputProgress,
    outputProgress,
    internalSelectedInputAsset,
    internalSelectedOutputAsset,
    isFetching,
    isQuoteStale,
    sliderXPosition,
    quote,
  });

  const SwapNavigation = useSwapNavigation({
    SwapInputsController,
    inputProgress,
    outputProgress,
    configProgress,
  });

  const SwapWarning = useSwapWarning({
    SwapInputsController,
    inputAsset: internalSelectedInputAsset,
    outputAsset: internalSelectedOutputAsset,
    quote,
    sliderXPosition,
    isFetching,
    isQuoteStale,
  });

  const AnimatedSwapStyles = useAnimatedSwapStyles({
    SwapWarning,
    internalSelectedInputAsset,
    internalSelectedOutputAsset,
    inputProgress,
    outputProgress,
    configProgress,
    isFetching,
  });

  const SwapTextStyles = useSwapTextStyles({
    SwapInputsController,
    internalSelectedInputAsset,
    internalSelectedOutputAsset,
    isQuoteStale,
    focusedInput,
    inputProgress,
    outputProgress,
    sliderPressProgress,
  });

  const handleProgressNavigation = ({ type }: { type: SwapAssetType }) => {
    'worklet';

    const inputAsset = internalSelectedInputAsset.value;
    const outputAsset = internalSelectedOutputAsset.value;

    switch (type) {
      case SwapAssetType.inputAsset:
        // if there is already an output asset selected, just close both lists
        if (outputAsset) {
          inputProgress.value = NavigationSteps.INPUT_ELEMENT_FOCUSED;
          outputProgress.value = NavigationSteps.INPUT_ELEMENT_FOCUSED;
        } else {
          inputProgress.value = NavigationSteps.INPUT_ELEMENT_FOCUSED;
          outputProgress.value = NavigationSteps.TOKEN_LIST_FOCUSED;
        }
        break;
      case SwapAssetType.outputAsset:
        // if there is already an input asset selected, just close both lists
        if (inputAsset) {
          inputProgress.value = NavigationSteps.INPUT_ELEMENT_FOCUSED;
          outputProgress.value = NavigationSteps.INPUT_ELEMENT_FOCUSED;
        } else {
          inputProgress.value = NavigationSteps.TOKEN_LIST_FOCUSED;
          outputProgress.value = NavigationSteps.INPUT_ELEMENT_FOCUSED;
        }
        break;
    }
  };

  const setSelectedOutputChainId = (chainId: ChainId) => {
    swapsStore.setState({ selectedOutputChainId: chainId });
    selectedOutputChainId.value = chainId;
  };

  const setAsset = ({ type, asset }: { type: SwapAssetType; asset: ParsedSearchAsset }) => {
    const updateAssetValue = ({ type, asset }: { type: SwapAssetType; asset: ExtendedAnimatedAssetWithColors | null }) => {
      'worklet';

      switch (type) {
        case SwapAssetType.inputAsset:
          internalSelectedInputAsset.value = asset;
          break;
        case SwapAssetType.outputAsset:
          internalSelectedOutputAsset.value = asset;
          break;
      }

      handleProgressNavigation({
        type,
      });
    };

    const otherAsset = swapsStore.getState()[type === SwapAssetType.inputAsset ? SwapAssetType.outputAsset : SwapAssetType.inputAsset];

    // if we're setting the same asset as the other asset, we need to clear the other asset
    if (otherAsset && isSameAsset(otherAsset, asset)) {
      logger.debug(`[setAsset]: Swapping ${type} asset for ${type === SwapAssetType.inputAsset ? 'output' : 'input'} asset`);

      swapsStore.setState({
        [type === SwapAssetType.inputAsset ? SwapAssetType.outputAsset : SwapAssetType.inputAsset]: null,
      });

      if (type === SwapAssetType.inputAsset) {
        setSelectedOutputChainId(otherAsset.chainId);
      }

      runOnUI(updateAssetValue)({
        type: type === SwapAssetType.inputAsset ? SwapAssetType.outputAsset : SwapAssetType.inputAsset,
        asset: null,
      });
    }

    logger.debug(`[setAsset]: Setting ${type} asset to ${asset.name} on ${asset.chainId}`);

    swapsStore.setState({
      [type]: asset,
    });
    if (type === SwapAssetType.inputAsset) {
      setSelectedOutputChainId(asset.chainId);
    }
    runOnUI(updateAssetValue)({ type, asset: parseAssetAndExtend({ asset }) });
  };

  const confirmButtonIcon = useDerivedValue(() => {
    if (configProgress.value === NavigationSteps.SHOW_REVIEW) {
      return '􀎽';
    } else if (configProgress.value === NavigationSteps.SHOW_GAS) {
      return '􀆅';
    }

    if (isFetching.value) {
      return '';
    }

    const isInputZero = Number(SwapInputsController.inputValues.value.inputAmount) === 0;
    const isOutputZero = Number(SwapInputsController.inputValues.value.outputAmount) === 0;

    if (SwapInputsController.inputMethod.value !== 'slider' && (isInputZero || isOutputZero) && !isFetching.value) {
      return '';
    } else if (SwapInputsController.inputMethod.value === 'slider' && SwapInputsController.percentageToSwap.value === 0) {
      return '';
    } else {
      return '􀕹';
    }
  });

  const confirmButtonLabel = useDerivedValue(() => {
    if (configProgress.value === NavigationSteps.SHOW_REVIEW) {
      return 'Hold to Swap';
    } else if (configProgress.value === NavigationSteps.SHOW_GAS) {
      return 'Save';
    }

    if (isFetching.value) {
      return 'Fetching prices';
    }

    const isInputZero = Number(SwapInputsController.inputValues.value.inputAmount) === 0;
    const isOutputZero = Number(SwapInputsController.inputValues.value.outputAmount) === 0;

    if (SwapInputsController.inputMethod.value !== 'slider' && (isInputZero || isOutputZero) && !isFetching.value) {
      return 'Enter Amount';
    } else if (
      SwapInputsController.inputMethod.value === 'slider' &&
      (SwapInputsController.percentageToSwap.value === 0 || isInputZero || isOutputZero)
    ) {
      return 'Enter Amount';
    } else {
      return 'Review';
    }
  });

  const confirmButtonIconStyle = useAnimatedStyle(() => {
    const isInputZero = Number(SwapInputsController.inputValues.value.inputAmount) === 0;
    const isOutputZero = Number(SwapInputsController.inputValues.value.outputAmount) === 0;

    const sliderCondition =
      SwapInputsController.inputMethod.value === 'slider' &&
      (SwapInputsController.percentageToSwap.value === 0 || isInputZero || isOutputZero);
    const inputCondition = SwapInputsController.inputMethod.value !== 'slider' && (isInputZero || isOutputZero) && !isFetching.value;

    const shouldHide = sliderCondition || inputCondition;

    return {
      display: shouldHide ? 'none' : 'flex',
    };
  });

  console.log('re-rendered swap provider: ', Date.now());

  return (
    <SwapContext.Provider
      value={{
        isFetching,
        isQuoteStale,
        searchInputRef,

        inputProgress,
        outputProgress,
        configProgress,

        sliderXPosition,
        sliderPressProgress,

        lastTypedInput,
        focusedInput,

        selectedOutputChainId,
        setSelectedOutputChainId,

        internalSelectedInputAsset,
        internalSelectedOutputAsset,
        setAsset,

        quote,

        SwapSettings,
        SwapInputsController,
        AnimatedSwapStyles,
        SwapTextStyles,
        SwapNavigation,
        SwapWarning,
        SwapGas,

        confirmButtonIcon,
        confirmButtonLabel,
        confirmButtonIconStyle,
      }}
    >
      {children}
    </SwapContext.Provider>
  );
};

export const useSwapContext = () => {
  const context = useContext(SwapContext);
  if (context === undefined) {
    throw new Error('useSwap must be used within a SwapProvider');
  }
  return context;
};

export { NavigationSteps };
