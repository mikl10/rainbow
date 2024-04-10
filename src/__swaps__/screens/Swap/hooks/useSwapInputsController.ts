import { useCallback, useMemo, useRef } from 'react';
import { SharedValue, runOnJS, runOnUI, useAnimatedReaction, useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';
import { useDebouncedCallback } from 'use-debounce';

import { ETH_COLOR, ETH_COLOR_DARK, SCRUBBER_WIDTH, SLIDER_WIDTH, snappySpringConfig } from '../constants';
import { SWAP_FEE } from '../dummyValues';
import { inputKeys, inputMethods, assets } from '../types/swap';
import {
  addCommasToNumber,
  clamp,
  clampJS,
  countDecimalPlaces,
  extractColorValueForColors,
  findNiceIncrement,
  isUnwrapEth,
  isWrapEth,
  niceIncrementFormatter,
  trimTrailingZeros,
  valueBasedDecimalFormatter,
} from '../utils/swaps';
import { ChainId, ChainName } from '../types/chains';
import { ParsedSearchAsset } from '../types/assets';
import { useColorMode } from '@/design-system';
import { isSameAssetWorklet } from '../utils/assets';
import {
  CrosschainQuote,
  ETH_ADDRESS,
  Quote,
  QuoteError,
  QuoteParams,
  Source,
  SwapType,
  getCrosschainQuote,
  getQuote,
} from '@rainbow-me/swaps';
import { chainNameFromChainIdWorklet } from '../utils/chains';
import { RainbowConfig, useRemoteConfig } from '@/model/remoteConfig';
import { useAccountSettings } from '@/hooks';
import { convertAmountToRawAmount, convertRawAmountToBalance, convertRawAmountToNativeDisplay } from '../utils/numbers';
import ethereumUtils from '@/utils/ethereumUtils';
import { FormattedExternalAsset, fetchExternalToken } from '@/resources/assets/externalAssetsQuery';

const PRICE_REFETCH_INTERVAL = 10_000;

export const DEFAULT_SLIPPAGE_BIPS = {
  [ChainId.mainnet]: 100,
  [ChainId.polygon]: 200,
  [ChainId.bsc]: 200,
  [ChainId.optimism]: 200,
  [ChainId.base]: 200,
  [ChainId.zora]: 200,
  [ChainId.arbitrum]: 200,
  [ChainId.avalanche]: 200,
  [ChainId.blast]: 200,
};

export const DEFAULT_SLIPPAGE = {
  [ChainId.mainnet]: '1',
  [ChainId.polygon]: '2',
  [ChainId.bsc]: '2',
  [ChainId.optimism]: '2',
  [ChainId.base]: '2',
  [ChainId.zora]: '2',
  [ChainId.arbitrum]: '2',
  [ChainId.avalanche]: '2',
  [ChainId.blast]: '2',
};

const slippageInBipsToString = (slippageInBips: number) => {
  'worklet';
  return (slippageInBips / 100).toString();
};

export const getDefaultSlippage = (chainId: ChainId, config: RainbowConfig) => {
  'worklet';

  const chainName = chainNameFromChainIdWorklet(chainId) as
    | ChainName.mainnet
    | ChainName.optimism
    | ChainName.polygon
    | ChainName.arbitrum
    | ChainName.base
    | ChainName.zora
    | ChainName.bsc
    | ChainName.avalanche
    | ChainName.blast;
  return slippageInBipsToString(
    (config.default_slippage_bips as unknown as { [key: string]: number })[chainName] || DEFAULT_SLIPPAGE_BIPS[chainId]
  );
};

export function useSwapInputsController({
  focusedInput,
  isFetching,
  sliderXPosition,
  handleExitSearch,
  handleInputPress,
  handleOutputPress,
  outputProgress,
}: {
  focusedInput: SharedValue<inputKeys>;
  isFetching: SharedValue<boolean>;
  sliderXPosition: SharedValue<number>;
  handleExitSearch: () => void;
  handleFocusInputSearch: () => void;
  handleFocusOutputSearch: () => void;
  handleInputPress: () => void;
  handleOutputPress: () => void;
  inputProgress: SharedValue<number>;
  outputProgress: SharedValue<number>;
}) {
  const { accountAddress: currentAddress, nativeCurrency: currentCurrency } = useAccountSettings();
  const config = useRemoteConfig();
  const { isDarkMode } = useColorMode();

  // MARK: Assets shared values
  const assetToSell = useSharedValue<ParsedSearchAsset | null>(null);
  const assetToBuy = useSharedValue<ParsedSearchAsset | null>(null);
  const assetToSellPrice = useSharedValue<number>(0);
  const assetToBuyPrice = useSharedValue<number>(0);
  const outputChainId = useSharedValue<ChainId>(ChainId.mainnet);
  const searchQuery = useSharedValue('');
  const inputThatWasChanged = useSharedValue<'inputAmount' | 'outputAmount' | undefined>(undefined);
  // MARK: Quote shared values
  const quote = useSharedValue<Quote | CrosschainQuote | QuoteError | null>(null);
  const fee = useSharedValue<number | string>(0);
  const source = useSharedValue<Source | 'auto'>('auto');

  // SETTINGS
  const slippage = useSharedValue<string>(getDefaultSlippage(assetToSell.value?.chainId || ChainId.mainnet, config));
  const flashbots = useSharedValue<boolean>(false);

  // MARK: DISPLAY VALUES
  const inputValues = useSharedValue<{ [key in inputKeys]: number | string }>({
    inputAmount: 0,
    inputNativeValue: 0,
    outputAmount: 0,
    outputNativeValue: 0,
  });
  const inputMethod = useSharedValue<inputMethods>('slider');
  const isQuoteStale = useSharedValue(0);

  // MARK: Timers / Intervals
  const spinnerTimer = useRef<NodeJS.Timeout | null>(null);
  const assetPricesTimer = useRef<NodeJS.Timeout | null>(null);
  const quoteRefetchTimer = useRef<NodeJS.Timeout | null>(null);
  const animationFrameId = useRef<number | null>(null);

  const topColor = useDerivedValue(() => {
    return extractColorValueForColors({
      colors: assetToSell.value?.colors,
      isDarkMode,
    });
  });

  const bottomColor = useDerivedValue(() => {
    return extractColorValueForColors({
      colors: assetToBuy.value?.colors,
      isDarkMode,
    });
  });

  const assetToSellSymbol = useDerivedValue(() => {
    return assetToSell.value?.symbol ?? '';
  });

  const assetToSellIconUrl = useDerivedValue(() => {
    return assetToSell.value?.icon_url ?? '';
  });

  const assetToBuySymbol = useDerivedValue(() => {
    return assetToBuy.value?.symbol ?? '';
  });

  const assetToBuyIconUrl = useDerivedValue(() => {
    return assetToBuy.value?.icon_url ?? '';
  });

  const topColorShadow = useDerivedValue(() => {
    return assetToSell.value?.colors?.shadow ?? (isDarkMode ? ETH_COLOR_DARK : ETH_COLOR);
  });

  const bottomColorShadow = useDerivedValue(() => {
    return assetToBuy.value?.colors?.shadow ?? (isDarkMode ? ETH_COLOR_DARK : ETH_COLOR);
  });

  const percentageToSwap = useDerivedValue(() => {
    return Math.round(clamp((sliderXPosition.value - SCRUBBER_WIDTH / SLIDER_WIDTH) / SLIDER_WIDTH, 0, 1) * 100) / 100;
  });

  const niceIncrement = useMemo(() => findNiceIncrement(Number(assetToSell.value?.balance.amount)), [assetToSell]);
  const incrementDecimalPlaces = useMemo(() => countDecimalPlaces(niceIncrement), [niceIncrement]);

  const formattedInputAmount = useDerivedValue(() => {
    console.log(
      inputMethod.value === 'slider' && percentageToSwap.value === 0,
      !inputValues.value.inputAmount,
      !(assetToSellPrice.value || assetToSell.value?.price?.value),
      !assetToSell.value
    );

    if (
      (inputMethod.value === 'slider' && percentageToSwap.value === 0) ||
      !inputValues.value.inputAmount ||
      !(assetToSellPrice.value || assetToSell.value?.price?.value) ||
      !assetToSell.value
    )
      return '0';
    if (inputMethod.value === 'inputAmount' || typeof inputValues.value.inputAmount === 'string') {
      return addCommasToNumber(inputValues.value.inputAmount);
    }
    if (inputMethod.value === 'outputAmount') {
      return valueBasedDecimalFormatter(
        inputValues.value.inputAmount,
        assetToSellPrice.value || Number(assetToSell.value?.price?.value),
        'up',
        -1,
        assetToSell.value?.type === 'stablecoin' ?? false,
        false
      );
    }

    return niceIncrementFormatter(
      incrementDecimalPlaces,
      Number(assetToSell.value?.balance.amount),
      assetToSellPrice.value || Number(assetToSell.value?.price?.value),
      niceIncrement,
      percentageToSwap.value,
      sliderXPosition.value
    );
  });

  const formattedInputNativeValue = useDerivedValue(() => {
    if ((inputMethod.value === 'slider' && percentageToSwap.value === 0) || !inputValues.value.inputNativeValue) {
      return '$0.00';
    }

    const nativeValue = `$${inputValues.value.inputNativeValue.toLocaleString('en-US', {
      useGrouping: true,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return nativeValue || '$0.00';
  });

  const formattedOutputAmount = useDerivedValue(() => {
    if (
      (inputMethod.value === 'slider' && percentageToSwap.value === 0) ||
      !inputValues.value.outputAmount ||
      !assetToBuy.value ||
      !assetToBuyPrice.value
    )
      return '0';

    if (inputMethod.value === 'outputAmount' || typeof inputValues.value.outputAmount === 'string') {
      return addCommasToNumber(inputValues.value.outputAmount);
    }

    return valueBasedDecimalFormatter(
      inputValues.value.outputAmount,
      assetToBuyPrice.value,
      'down',
      -1,
      assetToBuy.value?.type === 'stablecoin' ?? false,
      false
    );
  });

  const formattedOutputNativeValue = useDerivedValue(() => {
    if ((inputMethod.value === 'slider' && percentageToSwap.value === 0) || !inputValues.value.outputNativeValue) {
      return '$0.00';
    }

    const nativeValue = `$${inputValues.value.outputNativeValue.toLocaleString('en-US', {
      useGrouping: true,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return nativeValue || '$0.00';
  });

  const resetTimers = useCallback(() => {
    if (spinnerTimer.current) clearTimeout(spinnerTimer.current);
    if (animationFrameId.current !== null) cancelAnimationFrame(animationFrameId.current);
    if (quoteRefetchTimer.current) clearTimeout(quoteRefetchTimer.current);
  }, []);

  const fetchAssetPrices = async ({
    assetToSell,
    assetToBuy,
  }: {
    assetToSell: ParsedSearchAsset | null;
    assetToBuy: ParsedSearchAsset | null;
  }) => {
    const fetchPriceForAsset = async (asset: ParsedSearchAsset | null, assetType: keyof typeof assets) => {
      if (!asset) return;

      const assetWithPriceData = await fetchExternalToken({
        address: asset.address,
        network: ethereumUtils.getNetworkFromChainId(asset.chainId),
        currency: currentCurrency,
      });

      if (!assetWithPriceData) return;

      switch (assetType) {
        case 'assetToSell':
          runOnUI((asset: FormattedExternalAsset) => {
            if (asset.price.value) {
              assetToSellPrice.value = Number(asset.price.value);
            } else if (asset.native.price.amount) {
              assetToSellPrice.value = Number(asset.native.price.amount);
            }

            inputValues.value.inputNativeValue = Number(inputValues.value.inputAmount) * assetToSellPrice.value;
          })(assetWithPriceData);
          break;
        case 'assetToBuy':
          runOnUI((asset: FormattedExternalAsset) => {
            if (asset.price.value) {
              assetToBuyPrice.value = Number(asset.price.value);
            } else if (asset.native.price.amount) {
              assetToBuyPrice.value = Number(asset.native.price.amount);
            }

            inputValues.value.outputNativeValue = Number(inputValues.value.outputAmount) * assetToBuyPrice.value;
          })(assetWithPriceData);
          break;
      }
    };

    const fetchPrices = async () => {
      const promises = Object.values(assets).map(assetType => {
        fetchPriceForAsset(assetType === 'assetToSell' ? assetToSell : assetToBuy, assetType);
      });

      Promise.allSettled(promises);
    };

    if (assetPricesTimer.current) {
      clearInterval(assetPricesTimer.current);
    }

    assetPricesTimer.current = setInterval(fetchPrices, PRICE_REFETCH_INTERVAL);
  };

  // Shared function to fetch quote and update values
  const fetchAndUpdateQuote = async (amount: number) => {
    if (!assetToSell.value || !assetToBuy.value) return;

    const isCrosschainSwap = assetToSell.value.chainId !== assetToBuy.value.chainId;

    const isInputAmount = inputThatWasChanged.value === 'inputAmount';

    const quoteParams: QuoteParams = {
      source: source.value === 'auto' ? undefined : source.value,
      chainId: assetToSell.value.chainId,
      fromAddress: currentAddress,
      sellTokenAddress: assetToSell.value.isNativeAsset ? ETH_ADDRESS : assetToSell.value.address,
      buyTokenAddress: assetToBuy.value.isNativeAsset ? ETH_ADDRESS : assetToBuy.value.address,
      sellAmount: isInputAmount ? convertAmountToRawAmount(amount, assetToSell.value.decimals) : undefined,
      buyAmount: isInputAmount ? undefined : convertAmountToRawAmount(amount, assetToBuy.value.decimals),
      slippage: Number(slippage.value),
      refuel: false,
      swapType: isCrosschainSwap ? SwapType.crossChain : SwapType.normal,
      toChainId: isCrosschainSwap ? assetToBuy.value.chainId : assetToSell.value.chainId,
    };

    const updateInputValuesBasedOnQuoteWorklet = ({
      data,
      inputAmount,
      inputNativeValue,
      outputAmount,
      outputNativeValue,
      isInputAmount,
      isWrapOrUnwrapEth,
    }: {
      data: Quote | CrosschainQuote;
      inputAmount: string;
      inputNativeValue: string;
      outputAmount: string;
      outputNativeValue: string;
      isInputAmount: boolean;
      isWrapOrUnwrapEth: boolean;
    }) => {
      'worklet';
      // TODO: Need to convert big number to native value properly here...
      // example: "fee": "3672850000000000",
      fee.value = isWrapOrUnwrapEth ? '0' : data.feeInEth.toString();

      console.log({ inputAmount, inputNativeValue, outputAmount, outputNativeValue });

      console.log({
        inputAmount,
        inputNativeValue,
        outputAmount,
        outputNativeValue,
      });

      inputValues.modify(values => {
        return {
          ...values,
          inputAmount: isInputAmount ? values.inputAmount : inputAmount,
          inputNativeValue,
          outputAmount: !isInputAmount ? values.outputAmount : outputAmount,
          outputNativeValue,
        };
      });

      // sliderXPosition.value = updatedSliderPosition;
      isQuoteStale.value = 0;
      isFetching.value = false;
    };

    const updateQuoteAndSource = (data: Quote | CrosschainQuote | QuoteError) => {
      'worklet';

      // NOTE: Update quote regardless so we can display an error if necessary
      quote.value = data;
      if (!data || (data as QuoteError)?.error) {
        return;
      }

      const newData = data as Quote | CrosschainQuote;
      if (newData.source) {
        source.value = newData.source;
      }

      if (newData.fee) {
        fee.value = newData.fee.toString();
      }
    };

    const quoteResponse = (
      quoteParams.swapType === SwapType.crossChain ? await getCrosschainQuote(quoteParams) : await getQuote(quoteParams)
    ) as Quote | CrosschainQuote | QuoteError;

    console.log(JSON.stringify(quoteResponse, null, 2));

    runOnUI(updateQuoteAndSource)(quoteResponse);

    if (!quoteResponse || (quoteResponse as QuoteError)?.error) {
      return null;
    }

    const data = quoteResponse as Quote | CrosschainQuote;

    const isWrapOrUnwrapEth =
      isWrapEth({
        buyTokenAddress: data.buyTokenAddress,
        sellTokenAddress: data.sellTokenAddress,
        chainId: assetToSell.value.chainId,
      }) ||
      isUnwrapEth({
        buyTokenAddress: data.buyTokenAddress,
        sellTokenAddress: data.sellTokenAddress,
        chainId: assetToSell.value.chainId,
      });

    const outputAmount = valueBasedDecimalFormatter(
      Number(convertRawAmountToBalance(data.buyAmountMinusFees.toString(), { decimals: assetToBuy.value.decimals || 18 }).amount),
      assetToBuyPrice.value,
      'down',
      -1,
      assetToBuy.value?.type === 'stablecoin' ?? false,
      false
    );
    const outputNativeValue =
      !data.buyAmountMinusFees || !assetToBuyPrice.value
        ? '0.00'
        : convertRawAmountToNativeDisplay(
            data.buyAmountMinusFees.toString(),
            assetToBuy.value.decimals || 18,
            assetToBuyPrice.value,
            currentCurrency
          ).display.slice(1);

    const inputAmount = valueBasedDecimalFormatter(
      Number(convertRawAmountToBalance(data.sellAmount.toString(), { decimals: assetToSell.value.decimals || 18 }).amount),
      assetToSellPrice.value,
      'down',
      -1,
      assetToSell.value?.type === 'stablecoin' ?? false,
      false
    );
    const inputNativeValue =
      !data.sellAmount || !assetToSellPrice.value
        ? '0.00'
        : convertRawAmountToNativeDisplay(
            data.sellAmount.toString(),
            assetToSell.value.decimals || 18,
            assetToSellPrice.value,
            currentCurrency
          ).display.slice(1);

    runOnUI(updateInputValuesBasedOnQuoteWorklet)({
      data,
      inputAmount,
      inputNativeValue,
      outputAmount,
      outputNativeValue,
      isInputAmount,
      isWrapOrUnwrapEth,
    });
  };

  const onChangedPercentage = useDebouncedCallback((percentage: number, setStale = true) => {
    resetTimers();

    if (percentage > 0) {
      if (setStale) isQuoteStale.value = 1;

      // NOTE: assume Slider wants to use inputAmount
      inputThatWasChanged.value = 'inputAmount';

      // if (quoteRefetchTimer.current) {
      //   clearInterval(quoteRefetchTimer.current);
      // }

      // quoteRefetchTimer.current = setInterval(async () => {
      //   if (isFetching.value) return;
      //   isFetching.value = true;

      //   console.log('refetching quote');

      //   inputValues.value.inputAmount = percentage * Number(assetToSell.value?.balance.amount);
      //   await handleInputAmountLogic(percentage * Number(assetToSell.value?.balance.amount));
      // }, QUOTE_REFETCH_INTERVAL);

      // inputValues.value.inputAmount = percentage * Number(assetToSell.value?.balance.amount);
      // spinnerTimer.current = setTimeout(() => {
      //   animationFrameId.current = requestAnimationFrame(async () => {
      //     await handleInputAmountLogic(Number(inputValues.value.inputAmount));
      //   });
      // }, 600);
    } else {
      isFetching.value = false;
      isQuoteStale.value = 0;
    }

    return () => {
      resetTimers();
    };
  }, 200);

  // Refactored onTypedNumber function
  const onTypedNumber = useDebouncedCallback(async (amount: number, inputKey: inputKeys, preserveAmount = true, setStale = true) => {
    resetTimers();

    if (amount > 0) {
      if (setStale) isQuoteStale.value = 1;

      if (inputKey === 'inputAmount') {
        inputThatWasChanged.value = 'inputAmount';
        inputValues.value.inputAmount = amount;
      } else if (inputKey === 'outputAmount') {
        inputThatWasChanged.value = 'outputAmount';
        inputValues.value.outputAmount = amount;
      }
    } else {
      const resetValuesToZero = () => {
        isFetching.value = false;

        const updateWorklet = () => {
          'worklet';
          const keysToReset = ['inputAmount', 'inputNativeValue', 'outputAmount', 'outputNativeValue'];
          const updatedValues = keysToReset.reduce(
            (acc, key) => {
              const castedKey = key as keyof typeof inputValues.value;
              acc[castedKey] = castedKey === inputKey && preserveAmount ? inputValues.value[castedKey] : 0;
              return acc;
            },
            {} as Partial<typeof inputValues.value>
          );
          inputValues.modify(values => {
            return {
              ...values,
              ...updatedValues,
            };
          });
          sliderXPosition.value = withSpring(0, snappySpringConfig);
          isQuoteStale.value = 0;
        };

        runOnUI(updateWorklet)();
      };

      animationFrameId.current = requestAnimationFrame(resetValuesToZero);
    }

    return () => {
      resetTimers();
    };
  }, 400);

  const onExecuteSwap = async () => {
    if (!assetToSell.value || !assetToBuy.value || !quote.value) return;

    // console.log('executing swap');
    // const isCrosschainSwap =
    //   assetToSell.value.chainId !== assetToBuy.value.chainId;
    // const flashbotsEnabled =
    //   assetToSell.value.chainId === ChainId.mainnet ? flashbots.value : false;
    // const rapType = getSwapRapTypeByExchangeType(isCrosschainSwap);

    // console.log({ isCrosschainSwap, flashbotsEnabled, rapType });

    // const data = quote.value as Quote | CrosschainQuote;
    // const currentNetwork = ethereumUtils.getNetworkFromChainId(assetToSell.value.chainId);
    // const nonce = await getNextNonce({ address: currentAddress, network: currentNetwork });
    // const provider = await getProviderForNetwork(currentNetwork);
    // const wallet = await loadWallet(currentAddress, false, provider);

    // console.log({
    //   currentNetwork,
    //   nonce,
    //   provider,
    //   wallet,
    // });

    // if (!wallet) {
    //   // TODO: Handle error
    //   return;
    // }

    // const swapParameters: SwapActionParameters = {
    //   chainId: assetToSell.value.chainId,
    //   flashbots: flashbotsEnabled,
    //   inputAmount: data.sellAmount.toString(),
    //   outputAmount: data.buyAmount.toString(),
    //   provider,
    //   nonce,
    //   tradeDetails: data,
    //   meta: {
    //     flashbots: flashbotsEnabled,
    //     inputAsset: {
    //       ...assetToSell.value,
    //       network: ethereumUtils.getNetworkFromChainId(assetToSell.value.chainId),
    //     } as SwappableAsset,
    //     outputAsset: {
    //       ...assetToBuy.value,
    //       network: ethereumUtils.getNetworkFromChainId(assetToBuy.value.chainId),
    //     } as SwappableAsset,
    //     independentField: 'inputAmount' as SwapModalField,
    //     independentValue: '' as string,
    //     slippage: Number(slippage.value),
    //     route: data.source as Source,
    //     selectedGas: selectedGas as GasFeeParams,
    //     gasFeeParamsBySpeed: gasFeeParamsBySpeed as GasFeeParamsBySpeed,
    //   },
    // };

    // console.log(JSON.stringify(swapParameters, null, 2));

    // try {
    //   await executeRap(wallet, rapType, swapParameters, onSwapResponse);
    // } catch (error) {
    //   console.log(error);
    // }
  };

  const onChangeSearchQuery = (text: string) => {
    'worklet';
    searchQuery.value = text;
  };

  const onSelectAsset = (parsedAsset: ParsedSearchAsset, assetType: assets) => {
    'worklet';
    switch (assetType) {
      case assets.assetToSell: {
        // if assetToBuy and it's the same as the incoming asset, we need to clear the asset to buy
        if (assetToBuy.value && isSameAssetWorklet(assetToBuy.value, parsedAsset)) {
          assetToBuy.value = null;
        }

        // if we're trying to set the same asset, exit early...
        if (assetToSell.value && isSameAssetWorklet(assetToSell.value, parsedAsset)) {
          return;
        }

        // update asset to sell and set price to -1 to trigger a refetch
        assetToSell.value = parsedAsset;
        assetToSellPrice.value = -1;
        if (!assetToBuy.value) {
          outputChainId.value = parsedAsset.chainId;
        }

        if (assetToSell.value.price?.value) {
          assetToSellPrice.value = Number(assetToSell.value.price.value);
        }

        let initialAmount = Number(inputValues.value.inputAmount);

        console.log(initialAmount);
        console.log({ balance: assetToSell.value.balance.amount, percentageToSwap: percentageToSwap.value });

        if (assetToSell.value.balance.amount) {
          initialAmount = percentageToSwap.value * Number(assetToSell.value.balance.amount);
        } else {
          // if the user doesn't have a balance of the token, let's update the slider position to 100%
          sliderXPosition.value = withSpring(SLIDER_WIDTH, snappySpringConfig);
        }

        runOnJS(fetchAssetPrices)({
          assetToSell: assetToSell.value,
          assetToBuy: assetToBuy.value,
        });

        // Note, at this point we can assume the new asset will be different from the previous
        // and in that case, we should consider the previous quote stale
        if (assetToBuy.value && assetToSell.value) {
          isQuoteStale.value = 1;
        }

        const inputNativeValue = initialAmount * assetToSellPrice.value;
        inputValues.modify(values => {
          return {
            ...values,
            inputAmount: initialAmount,
            inputNativeValue,
          };
        });

        // if the user doesn't have an asset to buy selected, let's open that list
        if (!assetToBuy.value) {
          handleOutputPress();
        } else {
          handleInputPress();
        }
        break;
      }
      case assets.assetToBuy: {
        // if assetToSell and it's the same as the incoming asset, we need to clear the assetToSell
        if (assetToSell.value && isSameAssetWorklet(assetToSell.value, parsedAsset)) {
          assetToSell.value = null;
          handleInputPress();
          handleExitSearch();
        } else {
          handleOutputPress();
          handleExitSearch();
        }

        // if we're trying to set the same asset, exit early...
        if (assetToBuy.value && isSameAssetWorklet(assetToBuy.value, parsedAsset)) {
          return;
        }

        assetToBuy.value = parsedAsset;
        if (parsedAsset.chainId !== outputChainId.value) {
          outputChainId.value = parsedAsset.chainId;
        }

        runOnJS(fetchAssetPrices)({
          assetToSell: assetToSell.value,
          assetToBuy: assetToBuy.value,
        });

        if (assetToBuy.value && assetToSell.value) {
          isQuoteStale.value = 1;
        }

        // const inputAmount = Number(inputValues.value.inputAmount);
        // // TODO: Trigger a quote refetch here.
        // if (assetToSell.value && assetToSellPrice.value) {
        //   if (inputAmount > 0) {
        //     isFetching.value = true;
        //     isQuoteStale.value = 1;

        //     console.log({
        //       inputAmount,
        //       inputValues: inputValues.value,
        //       assetToSellPrice: assetToSellPrice.value,
        //     });

        //     spinnerTimer.current = setTimeout(() => {
        //       animationFrameId.current = requestAnimationFrame(async () => {
        //         await handleInputAmountLogic(inputAmount);
        //       });
        //     }, 600);
        //   }
        // }
        break;
      }
    }
  };

  const onSwapAssets = () => {
    'worklet';
    const prevAssetToSell = assetToSell.value;
    const prevAssetToBuy = assetToBuy.value;

    // if assetToSell was previously set, set it to assetToBuy and update the outputChainId
    if (prevAssetToSell) {
      assetToBuy.value = prevAssetToSell;
      assetToBuyPrice.value = assetToSellPrice.value;
      outputChainId.value = prevAssetToSell.chainId;
    } else {
      // otherwise, clear the assetToBuy
      assetToBuy.value = null;
      assetToBuyPrice.value = -1;
    }

    // if assetToBuy was previously set, set it to assetToSell and update the outputChainId
    if (prevAssetToBuy) {
      assetToSell.value = prevAssetToBuy;
      assetToSellPrice.value = assetToBuyPrice.value;
      outputChainId.value = prevAssetToBuy.chainId;
    } else {
      // otherwise, clear the assetToSell
      assetToSell.value = null;
      assetToSellPrice.value = -1;
    }

    // if both assetToSell and assetToBuy are set, set the quote to stale so we can refetch it
    if (assetToBuy.value && assetToSell.value) {
      isQuoteStale.value = 1;
      inputThatWasChanged.value = 'inputAmount';
    }

    // TODO: if !prevAssetToBuy => focus assetToSell input
    // TODO: if !prevAssetToSell => focus assetToBuy input

    if (outputProgress.value === 1) {
      handleOutputPress();
    }
  };

  // This handles cleaning up typed amounts when the input focus changes
  useAnimatedReaction(
    () => ({ focusedInput: focusedInput.value }),
    (current, previous) => {
      if (previous && current !== previous && typeof inputValues.value[previous.focusedInput] === 'string') {
        const typedValue = inputValues.value[previous.focusedInput].toString();
        if (Number(typedValue) === 0) {
          inputValues.modify(values => {
            return {
              ...values,
              [previous.focusedInput]: 0,
            };
          });
        } else {
          inputValues.modify(values => {
            return {
              ...values,
              [previous.focusedInput]: trimTrailingZeros(typedValue),
            };
          });
        }
      }
    },
    []
  );

  // This handles the updating of input values based on the input method
  useAnimatedReaction(
    () => ({ sliderXPosition: sliderXPosition.value, values: inputValues.value }),
    (current, previous) => {
      if (!previous) {
        // Handle setting of initial values using niceIncrementFormatter,
        // because we will likely set a percentage-based default input value
        if (!assetToSell.value?.balance.amount || !assetToSellPrice.value || !assetToBuyPrice.value) return;

        const inputAmount = niceIncrementFormatter(
          incrementDecimalPlaces,
          Number(assetToSell.value.balance.amount),
          assetToSellPrice.value,
          niceIncrement,
          percentageToSwap.value,
          sliderXPosition.value,
          true
        );
        const inputNativeValue = Number(inputAmount) * assetToSellPrice.value;
        const outputAmount = (inputNativeValue / assetToBuyPrice.value) * (1 - SWAP_FEE); // TODO: Implement swap fee
        const outputNativeValue = outputAmount * assetToBuyPrice.value;

        inputValues.modify(values => {
          return {
            ...values,
            inputAmount,
            inputNativeValue,
            outputAmount,
            outputNativeValue,
          };
        });
      } else if (current !== previous) {
        // Handle updating input values based on the input method
        if (inputMethod.value === 'slider' && current.sliderXPosition !== previous.sliderXPosition) {
          // If the slider position changes
          if (percentageToSwap.value === 0) {
            // If the change set the slider position to 0
            inputValues.modify(values => {
              return {
                ...values,
                inputAmount: 0,
                inputNativeValue: 0,
                outputAmount: 0,
                outputNativeValue: 0,
              };
            });
            isQuoteStale.value = 0;
          } else {
            if (!assetToSell.value || !assetToSellPrice.value) return;
            // If the change set the slider position to > 0
            const inputAmount = niceIncrementFormatter(
              incrementDecimalPlaces,
              Number(assetToSell.value.balance.amount),
              assetToSellPrice.value,
              niceIncrement,
              percentageToSwap.value,
              sliderXPosition.value,
              true
            );
            const inputNativeValue = Number(inputAmount) * assetToSellPrice.value;

            inputValues.modify(values => {
              return {
                ...values,
                inputAmount,
                inputNativeValue,
              };
            });
          }
        }
        if (inputMethod.value === 'inputAmount' && Number(current.values.inputAmount) !== Number(previous.values.inputAmount)) {
          // If the number in the input field changes
          if (Number(current.values.inputAmount) === 0) {
            // If the input amount was set to 0
            const hasDecimal = current.values.inputAmount.toString().includes('.');

            sliderXPosition.value = withSpring(0, snappySpringConfig);
            inputValues.modify(values => {
              return {
                ...values,
                inputAmount: hasDecimal ? current.values.inputAmount : 0,
                inputNativeValue: 0,
                outputAmount: 0,
                outputNativeValue: 0,
              };
            });
            isQuoteStale.value = 0;

            if (hasDecimal) {
              runOnJS(onTypedNumber)(0, 'inputAmount', true);
            } else {
              runOnJS(onTypedNumber)(0, 'inputAmount');
            }
          } else {
            if (!assetToSell.value || !assetToSellPrice.value) return;
            // If the input amount was set to a non-zero value
            const inputNativeValue = Number(current.values.inputAmount) * assetToSellPrice.value;

            isQuoteStale.value = 1;
            inputValues.modify(values => {
              return {
                ...values,
                inputNativeValue,
              };
            });

            runOnJS(onTypedNumber)(Number(current.values.inputAmount), 'inputAmount', true);
          }
        }
        if (inputMethod.value === 'outputAmount' && Number(current.values.outputAmount) !== Number(previous.values.outputAmount)) {
          // If the number in the output field changes
          if (Number(current.values.outputAmount) === 0) {
            // If the output amount was set to 0
            const hasDecimal = current.values.outputAmount.toString().includes('.');

            sliderXPosition.value = withSpring(0, snappySpringConfig);
            inputValues.modify(values => {
              return {
                ...values,
                inputAmount: 0,
                inputNativeValue: 0,
                outputAmount: hasDecimal ? current.values.outputAmount : 0,
                outputNativeValue: 0,
              };
            });

            isQuoteStale.value = 0;

            if (hasDecimal) {
              runOnJS(onTypedNumber)(0, 'outputAmount', true);
            } else {
              runOnJS(onTypedNumber)(0, 'outputAmount');
            }
          } else if (Number(current.values.outputAmount) > 0) {
            // If the output amount was set to a non-zero value
            if (!assetToBuy.value || !assetToBuyPrice.value) return;

            const outputAmount = Number(current.values.outputAmount);
            const outputNativeValue = outputAmount * assetToBuyPrice.value;

            isQuoteStale.value = 1;
            inputValues.modify(values => {
              return {
                ...values,
                outputNativeValue,
              };
            });

            runOnJS(onTypedNumber)(Number(current.values.outputAmount), 'outputAmount');
          }
        }
      }
    },
    []
  );

  // NOTE: refetches asset prices when the assets change
  useAnimatedReaction(
    () => ({
      assetToBuy: assetToBuy.value,
      assetToSell: assetToSell.value,
    }),
    (current, previous) => {
      if (previous?.assetToSell !== current.assetToSell || previous?.assetToBuy !== current.assetToBuy) {
        runOnJS(fetchAssetPrices)({
          assetToSell: current.assetToSell,
          assetToBuy: current.assetToBuy,
        });
      }
    }
  );

  useAnimatedReaction(
    () => ({
      isQuoteStale: isQuoteStale.value,
    }),
    current => {
      if (current.isQuoteStale) {
        isFetching.value = true;
        runOnJS(fetchAndUpdateQuote)(Number(inputValues.value.inputAmount));
      } else {
        isFetching.value = false;
      }
    }
  );

  // NOTE: Updates the default slippage value when the asset chain ID changes
  useAnimatedReaction(
    () => ({
      assetToSellChainId: assetToSell.value?.chainId || ChainId.mainnet,
    }),
    (current, previous) => {
      if (current.assetToSellChainId !== previous?.assetToSellChainId) {
        slippage.value = getDefaultSlippage(current.assetToSellChainId, config);
      }
    }
  );

  return {
    formattedInputAmount,
    formattedInputNativeValue,
    formattedOutputAmount,
    formattedOutputNativeValue,
    inputMethod,
    inputValues,
    searchQuery,
    assetToSell,
    assetToBuy,
    assetToSellSymbol,
    assetToSellIconUrl,
    assetToBuySymbol,
    assetToBuyIconUrl,
    source,
    slippage,
    flashbots,
    topColor,
    bottomColor,
    topColorShadow,
    bottomColorShadow,
    outputChainId,
    isQuoteStale,
    onChangedPercentage,
    percentageToSwap,
    onSelectAsset,
    // onSetAssetToBuy,
    onSwapAssets,
    onChangeSearchQuery,
    onExecuteSwap,
  };
}
