import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccountSettings, useGas } from '@/hooks';
import { ethereumUtils } from '@/utils';
import { TransactionClaimable } from '@/resources/addys/claimables/types';
import { estimateGasWithPadding, getProvider } from '@/handlers/web3';
import { parseGasParamsForTransaction } from '@/parsers';
import { getNextNonce } from '@/state/nonces';
import { needsL1SecurityFeeChains } from '@/chains';
import { logger, RainbowError } from '@/logger';
import { ClaimingClaimableSharedUI, ClaimStatus } from './ClaimingClaimableSharedUI';
import { TransactionRequest } from '@ethersproject/providers';
import { convertAmountToNativeDisplayWorklet } from '@/__swaps__/utils/numbers';
import { useMutation } from '@tanstack/react-query';
import { loadWallet } from '@/model/wallet';
import { walletExecuteRap } from '@/rapsV2/execute';
import { claimablesQueryKey } from '@/resources/addys/claimables/query';
import { queryClient } from '@/react-query';

// supports legacy and new gas types
export type TransactionClaimableTxPayload = TransactionRequest &
  (
    | {
        to: string;
        from: string;
        nonce: number;
        gasLimit: string;
        maxFeePerGas: string;
        maxPriorityFeePerGas: string;
        data: string;
        value: '0x0';
        chainId: number;
      }
    | {
        to: string;
        from: string;
        nonce: number;
        gasLimit: string;
        gasPrice: string;
        data: string;
        value: '0x0';
        chainId: number;
      }
  );

export const ClaimingTransactionClaimable = ({ claimable }: { claimable: TransactionClaimable }) => {
  const { accountAddress, nativeCurrency } = useAccountSettings();
  const { isGasReady, isSufficientGas, isValidGas, selectedGasFee, startPollingGasFees, stopPollingGasFees, updateTxFee } = useGas();

  const [baseTxPayload, setBaseTxPayload] = useState<
    Omit<TransactionClaimableTxPayload, 'gasLimit' | 'maxPriorityFeePerGas' | 'maxFeePerGas'> | undefined
  >();
  const [txPayload, setTxPayload] = useState<TransactionClaimableTxPayload | undefined>();
  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('idle');

  const provider = useMemo(() => getProvider({ chainId: claimable.chainId }), [claimable.chainId]);

  const buildTxPayload = useCallback(async () => {
    const payload = {
      value: '0x0' as const,
      data: claimable.action.data,
      from: accountAddress,
      chainId: claimable.chainId,
      nonce: await getNextNonce({ address: accountAddress, chainId: claimable.chainId }),
      to: claimable.action.to,
    };

    setBaseTxPayload(payload);
  }, [accountAddress, claimable.action.to, claimable.action.data, claimable.chainId, setBaseTxPayload]);

  useEffect(() => {
    buildTxPayload();
  }, [buildTxPayload]);

  useEffect(() => {
    startPollingGasFees();
    return () => {
      stopPollingGasFees();
    };
  }, [startPollingGasFees, stopPollingGasFees]);

  const estimateGas = useCallback(async () => {
    if (!baseTxPayload) {
      logger.error(new RainbowError('[ClaimingTransactionClaimable]: attempted to estimate gas without a tx payload'));
      return;
    }

    const gasParams = parseGasParamsForTransaction(selectedGasFee);
    const updatedTxPayload = { ...baseTxPayload, ...gasParams };

    const gasLimit = await estimateGasWithPadding(updatedTxPayload, null, null, provider);

    if (!gasLimit) {
      updateTxFee(null, null);
      logger.error(new RainbowError('[ClaimingTransactionClaimable]: Failed to estimate gas limit'));
      return;
    }

    if (needsL1SecurityFeeChains.includes(claimable.chainId)) {
      const l1SecurityFee = await ethereumUtils.calculateL1FeeOptimism(
        // @ts-expect-error - type mismatch, but this tx request structure is the same as in SendSheet.js
        {
          to: claimable.action.to,
          from: accountAddress,
          value: '0x0',
          data: claimable.action.data,
        },
        provider
      );

      if (!l1SecurityFee) {
        updateTxFee(null, null);
        logger.error(new RainbowError('[ClaimingTransactionClaimable]: Failed to calculate L1 security fee'));
        return;
      }

      updateTxFee(gasLimit, null, l1SecurityFee);
    } else {
      updateTxFee(gasLimit, null);
    }

    setTxPayload({ ...updatedTxPayload, gasLimit });
  }, [baseTxPayload, selectedGasFee, provider, claimable.chainId, claimable.action.to, claimable.action.data, updateTxFee, accountAddress]);

  useEffect(() => {
    if (baseTxPayload) {
      try {
        estimateGas();
      } catch (e) {
        logger.warn('[ClaimingTransactionClaimable]: Failed to estimate gas', { error: e });
      }
    }
  }, [baseTxPayload, estimateGas, selectedGasFee]);

  const isTransactionReady = !!(isGasReady && isSufficientGas && isValidGas && txPayload);

  const nativeCurrencyGasFeeDisplay = convertAmountToNativeDisplayWorklet(
    selectedGasFee?.gasFee?.estimatedFee?.native?.value?.amount,
    nativeCurrency,
    true
  );

  const { mutate: claimClaimable } = useMutation({
    mutationFn: async () => {
      if (!txPayload) {
        setClaimStatus('error');
        logger.error(new RainbowError('[ClaimingTransactionClaimable]: Failed to claim claimable due to missing tx payload'));
        return;
      }

      const wallet = await loadWallet({
        address: accountAddress,
        showErrorIfNotLoaded: false,
        provider,
      });

      if (!wallet) {
        // Biometrics auth failure (retry possible)
        setClaimStatus('error');
        return;
      }

      const { errorMessage } = await walletExecuteRap(wallet, {
        type: 'claimTransactionClaimableRap',
        claimTransactionClaimableActionParameters: { claimTx: txPayload, asset: claimable.asset },
      });

      if (errorMessage) {
        setClaimStatus('error');
        logger.error(new RainbowError('[ClaimingTransactionClaimable]: Failed to claim claimable due to rap error'), {
          message: errorMessage,
        });
      } else {
        setClaimStatus('success');
        // Clear and refresh claimables data
        queryClient.invalidateQueries(claimablesQueryKey({ address: accountAddress, currency: nativeCurrency }));
      }
    },
    onError: e => {
      setClaimStatus('error');
      logger.error(new RainbowError('[ClaimingTransactionClaimable]: Failed to claim claimable due to unhandled error'), {
        message: (e as Error)?.message,
      });
    },
    onSuccess: () => {
      if (claimStatus === 'claiming') {
        logger.error(
          new RainbowError('[ClaimingTransactionClaimable]: claim function completed but never resolved status to success or error state')
        );
        setClaimStatus('error');
      }
    },
  });

  return (
    <ClaimingClaimableSharedUI
      claim={claimClaimable}
      claimable={claimable}
      claimStatus={claimStatus}
      hasSufficientFunds={isSufficientGas}
      isGasReady={!!txPayload?.gasLimit}
      isTransactionReady={isTransactionReady}
      nativeCurrencyGasFeeDisplay={nativeCurrencyGasFeeDisplay}
      setClaimStatus={setClaimStatus}
    />
  );
};