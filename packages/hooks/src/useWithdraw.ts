import { SMART_INVOICE_ESCROW_ABI } from '@smart-invoice/constants';
import { Invoice } from '@smart-invoice/graphql';
import { UseToastReturn } from '@smart-invoice/types';
import { logError } from '@smart-invoice/utils';
import _ from 'lodash';
import { Hex, TransactionReceipt } from 'viem';
import { useChainId, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { waitForTransaction } from 'wagmi/actions';

export const useWithdraw = ({
  invoice,
  onTxSuccess,
  toast,
}: {
  invoice: Invoice;
  onTxSuccess: (tx: TransactionReceipt) => void;
  toast: UseToastReturn;
}) => {
  const chainId = useChainId();
  const { address } = _.pick(invoice, ['address']);

  const {
    config,
    isLoading: prepareLoading,
    error: prepareError,
  } = usePrepareContractWrite({
    address: address as Hex,
    functionName: 'withdraw',
    abi: SMART_INVOICE_ESCROW_ABI,
    // args: [],
    enabled: !!invoice?.address,
  });

  const {
    writeAsync,
    isLoading: writeLoading,
    error: writeError,
  } = useContractWrite({
    ...config,
    onSuccess: async ({ hash }) => {
      console.log('success');
      const data = await waitForTransaction({ hash, chainId });

      onTxSuccess?.(data);
    },
    onError: error => {
      if (
        error.name === 'TransactionExecutionError' &&
        error.message.includes('User rejected the request')
      ) {
        toast.error({
          title: 'Signature rejected!',
          description: 'Please accept the transaction in your wallet',
        });
      } else {
        logError('useWithdraw', error);
        toast.error({
          title: 'Error occurred!',
          description: 'An error occurred while processing the transaction.',
        });
      }
    },
  });

  return {
    writeAsync,
    isLoading: prepareLoading || writeLoading,
    prepareError,
    writeError,
  };
};
