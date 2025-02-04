import {
  invoiceFactory,
  LOG_TYPE,
  SMART_INVOICE_FACTORY_ABI,
  TOASTS,
  wrappedNativeToken,
} from '@smartinvoicexyz/constants';
import { fetchInvoice, Invoice } from '@smartinvoicexyz/graphql';
import { UseToastReturn } from '@smartinvoicexyz/types';
import { errorToastHandler, parseTxLogs } from '@smartinvoicexyz/utils';
import { waitForTransactionReceipt } from '@wagmi/core';
import _ from 'lodash';
import { useCallback, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { encodeAbiParameters, Hex, parseUnits, toHex } from 'viem';
import {
  useChainId,
  useConfig,
  useSimulateContract,
  useWriteContract,
} from 'wagmi';

import { useFetchTokens, usePollSubgraph } from '.';
import { useDetailsPin } from './useDetailsPin';

const ESCROW_TYPE = toHex('escrow', { size: 32 });

interface UseInvoiceCreate {
  invoiceForm: UseFormReturn;
  toast: UseToastReturn;
  onTxSuccess?: (result: Hex) => void;
}

const REQUIRES_VERIFICATION = true;

export const useInvoiceCreate = ({
  invoiceForm,
  toast,
  onTxSuccess,
}: UseInvoiceCreate) => {
  const chainId = useChainId();
  const config = useConfig();
  const [newInvoiceId, setNewInvoiceId] = useState<Hex | undefined>();
  const [waitingForTx, setWaitingForTx] = useState(false);

  const { getValues } = invoiceForm;
  const invoiceValues = getValues();
  const {
    client,
    provider,
    resolver,
    klerosCourt,
    customResolver,
    token,
    safetyValveDate,
    milestones,
    projectName,
    projectDescription,
    projectAgreement,
    startDate,
    endDate,
  } = _.pick(invoiceValues, [
    'client',
    'provider',
    'resolver',
    'customResolver',
    'token',
    'klerosCourt',
    'safetyValveDate',
    'milestones',
    'projectName',
    'projectDescription',
    'projectAgreement',
    'startDate',
    'endDate',
  ]);

  const localInvoiceFactory = invoiceFactory(chainId);

  const { data: tokens } = useFetchTokens();
  const invoiceToken = _.filter(tokens, { address: token, chainId })[0];

  const detailsData = {
    projectName,
    projectDescription,
    projectAgreement,
    ...(klerosCourt && { klerosCourt }),
    startDate,
    endDate,
  };

  const { data: details } = useDetailsPin({ ...detailsData });

  const waitForResult = usePollSubgraph({
    label: 'Creating escrow invoice',
    fetchHelper: () =>
      newInvoiceId ? fetchInvoice(chainId, newInvoiceId) : undefined,
    checkResult: (v: Partial<Invoice>) => !_.isUndefined(v),
    interval: 2000, // 2 seconds (averaging ~20 seconds for the subgraph to index)
  });

  const escrowData = useMemo(() => {
    if (
      !client ||
      !(resolver || customResolver) ||
      !token ||
      !safetyValveDate ||
      !wrappedNativeToken(chainId) ||
      !details ||
      !localInvoiceFactory ||
      !provider
    ) {
      return '0x';
    }

    return encodeAbiParameters(
      [
        { type: 'address' }, //     _client,
        { type: 'uint8' }, //       _resolverType,
        { type: 'address' }, //     _resolver,
        { type: 'address' }, //     _token,
        { type: 'uint256' }, //     _terminationTime, // exact termination date in seconds since epoch
        { type: 'bytes32' }, //     _details,
        { type: 'address' }, //     _wrappedNativeToken,
        { type: 'bool' }, //        _requireVerification, // warns the client not to deposit funds until verifying they can release or lock funds
        { type: 'address' }, //     _factory,
      ],
      [
        client,
        0,
        customResolver || resolver, // address _resolver (LEX DAO resolver address)
        token, // address _token (payment token address)
        BigInt(new Date(safetyValveDate.toString()).getTime() / 1000), // safety valve date
        details, // bytes32 _details detailHash
        wrappedNativeToken(chainId),
        REQUIRES_VERIFICATION,
        localInvoiceFactory,
      ],
    );
  }, [
    client,
    resolver,
    token,
    details,
    safetyValveDate,
    wrappedNativeToken,
    localInvoiceFactory,
  ]);

  const { data, error: prepareError } = useSimulateContract({
    address: localInvoiceFactory,
    abi: SMART_INVOICE_FACTORY_ABI,
    functionName: 'create',
    args: [
      provider,
      _.map(milestones, milestone =>
        parseUnits(_.toString(milestone?.value), invoiceToken?.decimals),
      ),
      escrowData,
      ESCROW_TYPE,
    ],
    query: {
      enabled: escrowData !== '0x' && !!provider && !_.isEmpty(milestones),
    },
  });

  const {
    writeContractAsync,
    error: writeError,
    isPending: isLoading,
  } = useWriteContract({
    mutation: {
      onSuccess: async hash => {
        // wait for tx to confirm on chain
        setWaitingForTx(true);
        toast.info(TOASTS.useInvoiceCreate.waitingForTx);

        const txData = await waitForTransactionReceipt(config, {
          chainId,
          hash,
        });
        // wait for subgraph to index
        const localInvoiceId = parseTxLogs(
          LOG_TYPE.Factory,
          txData,
          'LogNewInvoice',
          'invoice',
        );
        if (!localInvoiceId) return;
        setNewInvoiceId(localInvoiceId);
        toast.info(TOASTS.useInvoiceCreate.waitingForIndex);

        await waitForResult();
        setWaitingForTx(false);

        // pass back to component for further processing
        onTxSuccess?.(localInvoiceId);
      },
      onError: error => errorToastHandler('useInvoiceCreate', error, toast),
    },
  });

  const writeAsync = useCallback(async (): Promise<Hex | undefined> => {
    try {
      if (!data) {
        throw new Error('simulation data is not available');
      }
      return writeContractAsync(data.request);
    } catch (error) {
      errorToastHandler('useInvoiceCreate', error as Error, toast);
      return undefined;
    }
  }, [writeContractAsync, data]);

  return {
    writeAsync,
    prepareError,
    writeError,
    isLoading: isLoading || waitingForTx,
  };
};
