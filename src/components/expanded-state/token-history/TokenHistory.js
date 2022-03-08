import { Contract } from '@ethersproject/contracts';
import MaskedView from '@react-native-community/masked-view';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { ButtonPressAnimation } from '../../animations';
import TokenHistoryEdgeFade from './TokenHistoryEdgeFade';
import { useTheme } from '@rainbow-me/context/ThemeContext';
import {
  AccentColorProvider,
  Box,
  Inline,
  Inset,
  Stack,
  Text,
} from '@rainbow-me/design-system';
import {
  apiGetNftSemiFungibility,
  apiGetNftTransactionHistoryForEventType,
} from '@rainbow-me/handlers/opensea-api';
import { web3Provider } from '@rainbow-me/handlers/web3';
import { formatAssetForDisplay } from '@rainbow-me/helpers';
import { getHumanReadableDate } from '@rainbow-me/helpers/transactions';
import { useAccountProfile, useAccountSettings } from '@rainbow-me/hooks';
import { useNavigation } from '@rainbow-me/navigation';
import NetworkTypes from '@rainbow-me/networkTypes';
import {
  ENS_NFT_CONTRACT_ADDRESS,
  REVERSE_RECORDS_MAINNET_ADDRESS,
  reverseRecordsABI,
} from '@rainbow-me/references';
import Routes from '@rainbow-me/routes';
import { handleSignificantDecimals } from '@rainbow-me/utilities';
import { abbreviations } from '@rainbow-me/utils';
import { EventTypes, PaymentTokens } from '@rainbow-me/utils/tokenHistoryUtils';

const TokenHistory = ({ contractAddress, tokenID, accentColor }) => {
  const [tokenHistory, setTokenHistory] = useState([]);
  const { colors } = useTheme();
  const { accountAddress } = useAccountProfile();
  const { network } = useAccountSettings();
  const { navigate } = useNavigation();

  const networkPrefix = network === NetworkTypes.mainnet ? '' : `${network}-`;

  useEffect(() => {
    async function fetchTransactionHistory() {
      const semiFungible = await apiGetNftSemiFungibility(
        networkPrefix,
        contractAddress,
        tokenID
      );

      const [rawTransferEvents, rawSaleEvents] = await Promise.all([
        apiGetNftTransactionHistoryForEventType(
          networkPrefix,
          semiFungible,
          accountAddress,
          contractAddress,
          tokenID,
          EventTypes.TRANSFER.type
        ),
        apiGetNftTransactionHistoryForEventType(
          networkPrefix,
          semiFungible,
          accountAddress,
          contractAddress,
          tokenID,
          EventTypes.SALE.type
        ),
      ]);

      const rawEvents = rawTransferEvents.concat(rawSaleEvents);
      const txHistory = await processRawEvents(contractAddress, rawEvents);

      setTokenHistory(txHistory);
    }
    fetchTransactionHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountAddress, contractAddress, networkPrefix, tokenID]);

  const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';

  const reverseRecordContract = new Contract(
    REVERSE_RECORDS_MAINNET_ADDRESS,
    reverseRecordsABI,
    web3Provider
  );

  const processRawEvents = async (contractAddress, rawEvents) => {
    rawEvents.sort((event1, event2) =>
      event2.created_date.localeCompare(event1.created_date)
    );
    let addressArray = [];
    let sales = [];
    const events = await rawEvents.map((event, index) => {
      let eventType = event.event_type;
      let createdDate = event.created_date;
      let saleAmount, paymentToken, toAccount, toAccountEthAddress;

      switch (eventType) {
        case EventTypes.TRANSFER.type:
          toAccountEthAddress = event.to_account?.address;
          if (event.from_account?.address === EMPTY_ADDRESS) {
            eventType =
              contractAddress === ENS_NFT_CONTRACT_ADDRESS
                ? EventTypes.ENS.type
                : EventTypes.MINT.type;
          }
          break;

        case EventTypes.SALE.type: {
          sales.push(index);
          paymentToken =
            event.payment_token?.symbol === PaymentTokens.WETH
              ? PaymentTokens.ETH
              : event.payment_token?.symbol;

          const exactSaleAmount = formatAssetForDisplay({
            amount: parseInt(event.total_price).toString(),
            token: paymentToken,
          });

          saleAmount = handleSignificantDecimals(exactSaleAmount, 5);
          break;
        }

        default:
          break;
      }

      if (toAccountEthAddress) {
        addressArray.push(toAccountEthAddress);
      }

      return {
        createdDate,
        eventType,
        paymentToken,
        saleAmount,
        toAccount,
        toAccountEthAddress,
      };
    });

    // swap the order of every sale/transfer tx pair so sale is displayed before transfer
    sales.forEach(saleIndex => {
      if (events.length !== saleIndex + 1) {
        [events[saleIndex], events[saleIndex + 1]] = [
          events[saleIndex + 1],
          events[saleIndex],
        ];
      }
    });

    let ensArray = await reverseRecordContract.getNames(addressArray);

    const ensMap = ensArray.reduce(function (tempMap, ens, index) {
      tempMap[addressArray[index]] = ens;
      return tempMap;
    }, {});

    events.forEach(event => {
      const address = event.toAccountEthAddress;
      if (address) {
        const ens = ensMap[address];
        event.toAccount = ens
          ? abbreviations.abbreviateEnsForDisplay(ens)
          : abbreviations.address(address, 2);
      }
    });

    return events;
  };

  const shouldInvertScroll = tokenHistory.length > 2;

  const handlePress = useCallback(
    (address, ens) => {
      navigate(Routes.SHOWCASE_SHEET, {
        address: ens && ens.slice(-4) === '.eth' ? ens : address,
      });
    },
    [navigate]
  );

  const renderItem = ({ item, index }) => {
    let clickableIcon = `􀆊`;
    let isClickable = false;
    let label, icon;

    switch (item?.eventType) {
      case EventTypes.ENS.type:
        label = 'Registered';
        icon = EventTypes.ENS.icon;
        break;

      case EventTypes.MINT.type:
        isClickable = accountAddress.toLowerCase() !== item.toAccountEthAddress;
        label = `Minted by ${item.toAccount}`;
        icon = EventTypes.MINT.icon;
        break;

      case EventTypes.SALE.type:
        label = `Sold for ${item.saleAmount} ${item.paymentToken}`;
        icon = EventTypes.SALE.icon;
        break;

      case EventTypes.TRANSFER.type:
        isClickable = accountAddress.toLowerCase() !== item.toAccountEthAddress;
        label = `Sent to ${item.toAccount}`;
        icon = EventTypes.TRANSFER.icon;
        break;

      default:
        break;
    }
    return renderHistoryDescription({
      clickableIcon,
      icon,
      index,
      isClickable,
      item,
      label,
    });
  };

  function renderHistoryDescription({
    icon,
    isClickable,
    index,
    item,
    label,
    clickableIcon,
  }) {
    const shouldRenderTimeline = shouldInvertScroll
      ? index > 0
      : index < tokenHistory.length - 1;

    const shouldRenderPin = tokenHistory.length > 1;

    const date = getHumanReadableDate(
      new Date(item.createdDate).getTime() / 1000,
      false
    );

    return (
      // when the token history isShort, invert the horizontal scroll so the history is pinned to the left instead of right
      <Box>
        <AccentColorProvider color={accentColor}>
          <Stack>
            {shouldRenderTimeline && (
              <Inset left={{ custom: 16 }} right="6px">
                <Box
                  background="accent"
                  borderRadius={1.5}
                  height={{ custom: 3 }}
                  opacity={0.6}
                  position="absolute"
                  top={{ custom: 3.5 }}
                  width="full"
                />
              </Inset>
            )}
            {shouldRenderPin && (
              <Box
                background="accent"
                borderRadius={5}
                height={{ custom: 10 }}
                width={{ custom: 10 }}
              />
            )}
            <Inset top={{ custom: shouldRenderPin ? 8 : 0.5 }}>
              <Text color="accent" size="14px" weight="heavy">
                {date}
              </Text>
            </Inset>
            <ButtonPressAnimation
              disabled={!isClickable}
              hapticType="selection"
              onPress={() =>
                handlePress(item.toAccountEthAddress, item.toAccount)
              }
              scaleTo={0.92}
            >
              <Inset right="19px" top="6px">
                <Inline alignVertical="center">
                  <Text color="accent" size="19px">{`${icon}`}</Text>
                  <Text
                    color={{ custom: colors.whiteLabel }}
                    containsEmoji
                    size="14px"
                    weight="heavy"
                  >
                    {` ${label} ${isClickable ? clickableIcon : ''}`}
                  </Text>
                </Inline>
              </Inset>
            </ButtonPressAnimation>
          </Stack>
        </AccentColorProvider>
      </Box>
    );
  }

  return (
    <MaskedView
      maskElement={<TokenHistoryEdgeFade />}
      style={{ marginLeft: -24, marginRight: -24 }}
    >
      <FlatList
        contentContainerStyle={{
          paddingLeft: !shouldInvertScroll ? 24 : undefined,
          paddingRight: shouldInvertScroll ? 24 : undefined,
        }}
        data={
          shouldInvertScroll ? tokenHistory : tokenHistory.slice().reverse()
        }
        horizontal
        inverted={shouldInvertScroll}
        renderItem={({ item, index }) => renderItem({ index, item })}
        showsHorizontalScrollIndicator={false}
      />
    </MaskedView>
  );
};

export default TokenHistory;
