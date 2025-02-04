import { SMART_INVOICE_ESCROW_ABI, TOASTS } from '@smartinvoicexyz/constants';
import { fetchInvoice, InvoiceDetails } from '@smartinvoicexyz/graphql';
import { UseToastReturn } from '@smartinvoicexyz/types';
import { errorToastHandler } from '@smartinvoicexyz/utils';
import { waitForTransactionReceipt } from '@wagmi/core';
import { useCallback } from 'react';
import { Hex } from 'viem';
import { useConfig, useSimulateContract, useWriteContract } from 'wagmi';

import { usePollSubgraph } from '.';

export const useVerify = ({
  invoice,
  address,
  chainId,
  toast,
  onTxSuccess,
}: {
  invoice: InvoiceDetails;
  address: Hex | undefined;
  chainId: number;
  toast: UseToastReturn;
  onTxSuccess?: () => void;
}) => {
  const config = useConfig();
  const { data, error: prepareError } = useSimulateContract({
    address,
    chainId,
    abi: SMART_INVOICE_ESCROW_ABI,
    functionName: 'verify', // no args
    query: {
      enabled: !!address,
    },
  });

  const waitForIndex = usePollSubgraph({
    label: 'Waiting for non-client deposit to be enabled',
    fetchHelper: () => fetchInvoice(chainId, invoice?.address as Hex),
    checkResult: result => !!result?.verified === true,
  });

  const {
    writeContractAsync,
    error: writeError,
    isPending: isLoading,
  } = useWriteContract({
    mutation: {
      onSuccess: async hash => {
        toast.info(TOASTS.useVerify.waitingForTx);
        await waitForTransactionReceipt(config, { hash, chainId });

        toast.info(TOASTS.useVerify.waitingForIndex);
        await waitForIndex();

        onTxSuccess?.();
      },
      onError: error => errorToastHandler('useVerify', error, toast),
    },
  });

  const writeAsync = useCallback(async (): Promise<Hex | undefined> => {
    try {
      if (!data) {
        throw new Error('simulation data is not available');
      }
      return writeContractAsync(data.request);
    } catch (error) {
      errorToastHandler('useVerify', error as Error, toast);
      return undefined;
    }
  }, [writeContractAsync, data]);

  return {
    writeAsync,
    prepareError,
    writeError,
    isLoading,
  };
};
