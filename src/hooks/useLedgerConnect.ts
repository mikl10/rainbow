import { useCallback, useEffect, useState } from 'react';
import { DebugContext } from '@/logger/debugContext';
import { logger } from '@/logger';
import * as i18n from '@/languages';
import { checkLedgerConnection } from '@/utils/ledger';

enum LEDGER_ERROR_CODES {
  OFF_OR_LOCKED = 'off_or_locked',
  NO_ETH_APP = 'no_eth_app',
  UNKNOWN = 'unknown',
  DISCONNECTED = 'disconnected',
}

export const getLedgerErrorText = (errorCode: LEDGER_ERROR_CODES) => {
  switch (errorCode) {
    case LEDGER_ERROR_CODES.OFF_OR_LOCKED:
      return i18n.t(i18n.l.hardware_wallets.errors.off_or_locked);
    case LEDGER_ERROR_CODES.NO_ETH_APP:
      return i18n.t(i18n.l.hardware_wallets.errors.no_eth_app);
    default:
      return i18n.t(i18n.l.hardware_wallets.errors.unknown);
  }
};

export enum LEDGER_CONNECTION_STATUS {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
}

/**
 * React hook used for checking ledger connections and handling connnection error states
 */
export function useLedgerConnect({
  readyForPolling = true,
  deviceId,
  errorCallback,
  successCallback,
}: {
  readyForPolling?: boolean;
  deviceId: string;
  successCallback: (deviceId: string) => void;
  errorCallback?: (errorType: LEDGER_ERROR_CODES) => void;
}) {
  const [
    connectionStatus,
    setConnectionStatus,
  ] = useState<LEDGER_CONNECTION_STATUS>(LEDGER_CONNECTION_STATUS.LOADING);
  const [errorCode, setErrorCode] = useState<LEDGER_ERROR_CODES | null>(null);

  /**
   * Handles local error handling for useLedgerStatusCheck
   */
  const handleLedgerError = useCallback(
    (errorType: LEDGER_ERROR_CODES) => {
      // just saving these in case we need them
      /*
      if (error.message.toLowerCase().includes('disconnected')) {
        setConnectionStatus(LEDGER_CONNECTION_STATUS.LOADING);
        //setErrorCode(LEDGER_ERROR_CODES.DISCONNECTED);
        return;
      }*/

      /*
      if (error.message.includes('Ledger Device is busy (lock')) {
      } */
      setConnectionStatus(LEDGER_CONNECTION_STATUS.ERROR);
      setErrorCode(errorType);
      errorCallback?.(errorType);
    },
    [errorCallback]
  );

  /**
   * Handles successful ledger connection
   */
  const handleLedgerSuccess = useCallback(() => {
    setConnectionStatus(LEDGER_CONNECTION_STATUS.READY);
    setErrorCode(null);
    successCallback?.(deviceId);
  }, [deviceId, successCallback]);

  /**
   * Cleans up ledger connection polling
   */
  const pollerCleanup = (poller: NodeJS.Timer | null) => {
    try {
      if (poller) {
        logger.debug(
          '[LedgerConnect] - polling tear down',
          {},
          DebugContext.ledger
        );
        clearInterval(poller);
        poller?.unref();
      }
    } catch {
      // swallow
    }
  };
  useEffect(() => {
    let timer: NodeJS.Timer | null = null;
    if (readyForPolling) {
      logger.debug(
        '[LedgerConnect] - init device polling',
        {},
        DebugContext.ledger
      );
      timer = setInterval(async () => {
        if (readyForPolling) {
          await checkLedgerConnection({
            deviceId,
            successCallback: handleLedgerSuccess,
            errorCallback: handleLedgerError,
          });
        }
      }, 2000);
    }

    return () => {
      pollerCleanup(timer);
    };
  }, [deviceId, handleLedgerError, handleLedgerSuccess, readyForPolling]);

  return { connectionStatus, errorCode };
}