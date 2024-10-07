import { BigNumber as EthersBigNumber, BigNumberish } from '@ethersproject/bignumber';
import BigNumber from 'bignumber.js';
import currency from 'currency.js';
import { isNil } from 'lodash';

import { supportedNativeCurrencies } from '@/references';
import { divWorklet, lessThanWorklet, orderOfMagnitudeWorklet, powWorklet } from '../../safe-math/SafeMath';

type nativeCurrencyType = typeof supportedNativeCurrencies;

export const toBigNumber = (v?: string | number | BigNumber) => (v ? EthersBigNumber.from(v) : undefined);

export const abs = (value: BigNumberish): string => new BigNumber(value.toString()).abs().toFixed();

export const isPositive = (value: BigNumberish): boolean => new BigNumber(value.toString()).isPositive();

export const subtract = (numberOne: BigNumberish, numberTwo: BigNumberish): string =>
  new BigNumber(numberOne.toString()).minus(new BigNumber(numberTwo.toString())).toFixed();

export const convertAmountToRawAmount = (value: BigNumberish, decimals: number | string): string =>
  new BigNumber(value.toString()).times(new BigNumber(10).pow(decimals)).toFixed();

export const isZero = (value: BigNumberish): boolean => new BigNumber(value.toString()).isZero();

export const toFixedDecimals = (value: BigNumberish, decimals: number): string => new BigNumber(value.toString()).toFixed(decimals);

export const convertNumberToString = (value: BigNumberish): string => new BigNumber(value.toString()).toFixed();

export const greaterThan = (numberOne: BigNumberish, numberTwo: BigNumberish): boolean => new BigNumber(numberOne.toString()).gt(numberTwo.toString());

export const greaterThanOrEqualTo = (numberOne: BigNumberish, numberTwo: BigNumberish): boolean => new BigNumber(numberOne.toString()).gte(numberTwo.toString());

export const isEqual = (numberOne: BigNumberish, numberTwo: BigNumberish): boolean => new BigNumber(numberOne.toString()).eq(numberTwo.toString());

export const formatFixedDecimals = (value: BigNumberish, decimals: number): string => {
  const _value = convertNumberToString(value);
  const _decimals = convertStringToNumber(decimals);
  return new BigNumber(new BigNumber(_value).toFixed(_decimals)).toFixed();
};

export const mod = (numberOne: BigNumberish, numberTwo: BigNumberish): string =>
  new BigNumber(numberOne.toString()).mod(new BigNumber(numberTwo.toString())).toFixed();

/**
 * @desc real floor divides two numbers
 * @param  {Number}   numberOne
 * @param  {Number}   numberTwo
 * @return {String}
 */
export const floorDivide = (numberOne: BigNumberish, numberTwo: BigNumberish): string =>
  new BigNumber(numberOne.toString()).dividedToIntegerBy(new BigNumber(numberTwo.toString())).toFixed();

/**
 * @desc count value's number of decimals places
 * @param  {String}   value
 * @return {String}
 */
export const countDecimalPlaces = (value: BigNumberish): number => new BigNumber(value.toString()).dp();

/**
 * @desc update the amount to display precision
 * equivalent to ~0.01 of the native price
 * or use most significant decimal
 * if the updated precision amounts to zero
 * @param  {String}   amount
 * @param  {String}   nativePrice
 * @param  {Boolean}  use rounding up mode
 * @return {String}   updated amount
 */
export const updatePrecisionToDisplay = (amount: BigNumberish, nativePrice?: BigNumberish, roundUp = false): string => {
  if (!amount) return '0';
  const roundingMode = roundUp ? BigNumber.ROUND_UP : BigNumber.ROUND_DOWN;
  if (!nativePrice) return new BigNumber(amount.toString()).decimalPlaces(6, roundingMode).toFixed();
  const bnAmount = new BigNumber(amount.toString());
  const significantDigitsOfNativePriceInteger = new BigNumber(nativePrice.toString()).decimalPlaces(0, BigNumber.ROUND_DOWN).sd(true);
  const truncatedPrecision = new BigNumber(significantDigitsOfNativePriceInteger).plus(2, 10).toNumber();
  const truncatedAmount = bnAmount.decimalPlaces(truncatedPrecision, BigNumber.ROUND_DOWN);
  return truncatedAmount.isZero()
    ? new BigNumber(bnAmount.toPrecision(1, roundingMode)).toFixed()
    : bnAmount.decimalPlaces(truncatedPrecision, roundingMode).toFixed();
};

/**
 * @desc format inputOne value to signficant decimals given inputTwo
 * @param  {String}   inputOne
 * @param  {String}   inputTwo
 * @return {String}
 */
// TODO revisit logic, at least rename so it is not native amount dp
export const formatInputDecimals = (inputOne: BigNumberish, inputTwo: BigNumberish): string => {
  const _nativeAmountDecimalPlaces = countDecimalPlaces(inputTwo);
  const decimals = _nativeAmountDecimalPlaces > 8 ? _nativeAmountDecimalPlaces : 8;
  const result = new BigNumber(formatFixedDecimals(inputOne, decimals)).toFormat().replace(/,/g, '');
  return result;
};

export const add = (numberOne: BigNumberish, numberTwo: BigNumberish): string => new BigNumber(numberOne.toString()).plus(numberTwo.toString()).toFixed();

export const minus = (numberOne: BigNumberish, numberTwo: BigNumberish): string => new BigNumber(numberOne.toString()).minus(numberTwo.toString()).toFixed();

export const addDisplay = (numberOne: string, numberTwo: string): string => {
  const unit = numberOne.replace(/[\d.-]/g, '');
  const leftAlignedUnit = numberOne.indexOf(unit) === 0;
  return currency(0, { symbol: unit, pattern: leftAlignedUnit ? '!#' : '#!' })
    .add(numberOne)
    .add(numberTwo)
    .format();
};

export const multiply = (numberOne: BigNumberish, numberTwo: BigNumberish): string => new BigNumber(numberOne.toString()).times(numberTwo.toString()).toFixed();

export const addBuffer = (numberOne: BigNumberish, buffer: BigNumberish = '1.2'): string =>
  new BigNumber(numberOne.toString()).times(buffer.toString()).toFixed(0);

export const divide = (numberOne: BigNumberish, numberTwo: BigNumberish): string => {
  if (!(numberOne || numberTwo)) return '0';
  return new BigNumber(numberOne.toString()).dividedBy(numberTwo.toString()).toFixed();
};

export const fraction = (target: BigNumberish, numerator: BigNumberish, denominator: BigNumberish): string => {
  if (!target || !numerator || !denominator) return '0';
  return new BigNumber(target.toString()).times(numerator.toString()).dividedBy(denominator.toString()).toFixed(0);
};

/**
 * @desc convert to asset amount units from native price value units
 * @param  {String}   value
 * @param  {Object}   asset
 * @param  {Number}   priceUnit
 * @return {String}
 */
export const convertAmountFromNativeValue = (value: BigNumberish, priceUnit: BigNumberish, decimals = 18): string => {
  if (isNil(priceUnit) || isZero(priceUnit)) return '0';
  return new BigNumber(new BigNumber(value.toString()).dividedBy(priceUnit.toString()).toFixed(decimals, BigNumber.ROUND_DOWN)).toFixed();
};

export const convertStringToNumber = (value: BigNumberish) => new BigNumber(value.toString()).toNumber();

export const lessThan = (numberOne: BigNumberish, numberTwo: BigNumberish): boolean => new BigNumber(numberOne.toString()).lt(numberTwo.toString());

export const lessOrEqualThan = (numberOne: BigNumberish, numberTwo: BigNumberish): boolean =>
  new BigNumber(numberOne.toString()).lt(numberTwo.toString()) || new BigNumber(numberOne.toString()).eq(numberTwo.toString());

export const handleSignificantDecimalsWithThreshold = (value: BigNumberish, decimals: number, threshold = '0.0001') => {
  const result = toFixedDecimals(value, decimals);
  return lessThan(result, threshold) ? `< ${threshold}` : result;
};

export const handleSignificantDecimalsWorklet = (value: number | string, decimals: number, buffer = 3): string => {
  'worklet';
  let dec;

  if (lessThanWorklet(value, 1)) {
    const orderOfMagnitude = orderOfMagnitudeWorklet(value);
    const sigDigitsWithBuffer = -orderOfMagnitude - 1 + buffer;
    dec = Math.min(sigDigitsWithBuffer, 8);
  } else {
    dec = Math.min(decimals, buffer);
  }
  return Number(value).toLocaleString('en-US', {
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: dec,
  });
};

export const handleSignificantDecimals = (value: BigNumberish, decimals: number, buffer = 3, skipDecimals = false): string => {
  let dec;
  if (lessThan(new BigNumber(value.toString()).abs(), 1)) {
    dec = new BigNumber(value.toString()).toFixed()?.slice?.(2).search(/[^0]/g) + buffer;
    dec = Math.min(dec, 8);
  } else {
    dec = Math.min(decimals, buffer);
  }
  const result = new BigNumber(new BigNumber(value.toString()).toFixed(dec)).toFixed();
  const resultBN = new BigNumber(result);
  return resultBN.dp() <= 2 ? resultBN.toFormat(skipDecimals ? 0 : 2) : resultBN.toFormat();
};

export const handleSignificantDecimalsAsNumber = (value: BigNumberish, decimals: number): string => {
  return new BigNumber(new BigNumber(multiply(value, new BigNumber(10).pow(decimals).toString())).toFixed(0))
    .dividedBy(new BigNumber(10).pow(decimals))
    .toFixed();
};

/**
 * @desc convert from asset BigNumber amount to native price BigNumber amount
 */
export const convertAmountToNativeAmount = (amount: BigNumberish, priceUnit: BigNumberish): string => multiply(amount, priceUnit);

/**
 * @desc convert from amount to display formatted string
 */
export const convertAmountAndPriceToNativeDisplay = (
  amount: BigNumberish,
  priceUnit: BigNumberish,
  nativeCurrency: keyof nativeCurrencyType,
  useThreshold = false
): { amount: string; display: string } => {
  const nativeBalanceRaw = convertAmountToNativeAmount(amount, priceUnit);
  const nativeDisplay = convertAmountToNativeDisplayWorklet(nativeBalanceRaw, nativeCurrency, useThreshold);
  return {
    amount: nativeBalanceRaw,
    display: nativeDisplay,
  };
};

/**
 * @desc convert from raw amount to display formatted string
 */
export const convertRawAmountToNativeDisplay = (
  rawAmount: BigNumberish,
  assetDecimals: number,
  priceUnit: BigNumberish,
  nativeCurrency: keyof nativeCurrencyType
) => {
  const assetBalance = convertRawAmountToDecimalFormat(rawAmount, assetDecimals);
  const ret = convertAmountAndPriceToNativeDisplay(assetBalance, priceUnit, nativeCurrency);
  return ret;
};

/**
 * @desc convert from raw amount to decimal format
 */
export const convertRawAmountToDecimalFormatWorklet = (value: number | string, decimals = 18): string => {
  'worklet';
  return divWorklet(value, powWorklet(10, decimals));
};

/**
 * @desc convert from amount value to display formatted string
 */
export const convertAmountToBalanceDisplayWorklet = (
  value: number | string,
  asset: { decimals: number; symbol?: string },
  buffer?: number
) => {
  'worklet';
  const decimals = asset?.decimals ?? 18;
  const display = handleSignificantDecimalsWorklet(value, decimals, buffer);
  return `${display} ${asset?.symbol || ''}`;
};

/**
 * @desc convert from raw amount to balance object
 */
export const convertRawAmountToBalanceWorklet = (value: number | string, asset: { decimals: number; symbol?: string }, buffer?: number) => {
  'worklet';
  const decimals = asset?.decimals ?? 18;

  const assetBalance = convertRawAmountToDecimalFormatWorklet(value, decimals);

  return {
    amount: assetBalance,
    display: convertAmountToBalanceDisplayWorklet(assetBalance, asset, buffer),
  };
};

/**
 * @desc convert from raw amount to balance object
 */
export const convertRawAmountToBalance = (value: BigNumberish, asset: { decimals: number; symbol?: string }, buffer?: number) => {
  const decimals = asset?.decimals ?? 18;
  const assetBalance = convertRawAmountToDecimalFormat(value, decimals);

  return {
    amount: assetBalance,
    display: convertAmountToBalanceDisplay(assetBalance, asset, buffer),
  };
};

/**
 * @desc convert from amount value to display formatted string
 */
export const convertAmountToBalanceDisplay = (value: BigNumberish, asset: { decimals: number; symbol?: string }, buffer?: number) => {
  const decimals = asset?.decimals ?? 18;
  const display = handleSignificantDecimals(value, decimals, buffer);
  return `${display} ${asset?.symbol || ''}`;
};

/**
 * @desc convert from amount to display formatted string
 */
export const convertAmountToPercentageDisplay = (value: BigNumberish, buffer?: number, skipDecimals?: boolean, decimals = 2): string => {
  const display = handleSignificantDecimals(value, decimals, buffer, skipDecimals);
  return `${display}%`;
};

/**
 * @desc convert from amount to display formatted string
 * with a threshold percent
 */
export const convertAmountToPercentageDisplayWithThreshold = (value: BigNumberish, decimals = 2, threshold = '0.0001'): string => {
  if (lessThan(value, threshold)) {
    return '< 0.01%';
  } else {
    const display = new BigNumber(value.toString()).times(100).toFixed(decimals);
    return `${display}%`;
  }
};

/**
 * @desc convert from bips amount to percentage format
 */
export const convertBipsToPercentage = (value: BigNumberish, decimals = 2): string => {
  if (value === null) return '0';
  return new BigNumber(value.toString()).shiftedBy(-2).toFixed(decimals);
};

/**
 * @desc convert from amount value to display formatted string
 */
export const convertAmountToNativeDisplayWorklet = (
  value: number | string,
  nativeCurrency: keyof nativeCurrencyType,
  useThreshold = false,
  ignoreAlignment = false
) => {
  'worklet';

  const nativeSelected = supportedNativeCurrencies?.[nativeCurrency];
  const { alignment, decimals: rawDecimals, symbol } = nativeSelected;
  const decimals = Math.min(rawDecimals, 6);

  const valueNumber = Number(value);
  const threshold = decimals < 4 ? 0.01 : 0.0001;
  let thresholdReached = false;

  if (useThreshold && valueNumber < threshold) {
    thresholdReached = true;
  }

  const nativeValue = thresholdReached
    ? threshold
    : valueNumber.toLocaleString('en-US', {
        useGrouping: true,
        minimumFractionDigits: nativeCurrency === 'ETH' ? undefined : decimals,
        maximumFractionDigits: decimals,
      });

  const nativeDisplay = `${thresholdReached ? '<' : ''}${alignment === 'left' || ignoreAlignment ? symbol : ''}${nativeValue}${!ignoreAlignment && alignment === 'right' ? symbol : ''}`;

  return nativeDisplay;
};

/**
 * @desc convert from raw amount to decimal format
 */
export const convertRawAmountToDecimalFormat = (value: BigNumberish, decimals = 18): string =>
  new BigNumber(value.toString()).dividedBy(new BigNumber(10).pow(decimals)).toFixed();

/**
 * @desc convert from decimal format to raw amount
 */
export const convertDecimalFormatToRawAmount = (value: string, decimals = 18): string =>
  new BigNumber(value).multipliedBy(new BigNumber(10).pow(decimals)).toFixed(0);

export const fromWei = (number: BigNumberish): string => convertRawAmountToDecimalFormat(number, 18);

const decimalSeparator = '.';
const lessThanPrefix = '<';

export const formatNumber = (value: string, options?: { decimals?: number }) => {
  if (!+value) return `0${decimalSeparator}0`;
  if (+value < 0.0001) return `${lessThanPrefix}0${decimalSeparator}0001`;

  const [whole, fraction = ''] = value.split(decimalSeparator);
  const decimals = options?.decimals;
  const paddedFraction = `${fraction.padEnd(decimals || 4, '0')}`;

  if (decimals) {
    if (decimals === 0) return whole;
    return `${whole}${decimalSeparator}${paddedFraction.slice(0, decimals)}`;
  }

  if (+whole > 0) return `${whole}${decimalSeparator}${paddedFraction.slice(0, 2)}`;
  return `0${decimalSeparator}${paddedFraction.slice(0, 4)}`;
};
