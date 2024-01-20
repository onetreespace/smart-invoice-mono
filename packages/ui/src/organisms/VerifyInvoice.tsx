import { Button, Spinner, Text, VStack } from '@chakra-ui/react';
import { Invoice } from '@smart-invoice/graphql';
import { logError } from '@smart-invoice/utils';
import React, { useEffect, useState } from 'react';
import { Hash, isAddress } from 'viem';
import { useWalletClient } from 'wagmi';
import { waitForTransaction } from 'wagmi/actions';

type VerifyInvoiceProps = {
  invoice: Invoice;
  verified: {
    id: string;
    client: string;
  }[];
  client: string;
  isClient: boolean;
  verifiedStatus: boolean;
  // eslint-disable-next-line no-unused-vars
  setVerifiedStatus: (value: boolean) => void;
};

export function VerifyInvoice({
  invoice,
  verified,
  client,
  isClient,
  verifiedStatus,
  setVerifiedStatus,
}: VerifyInvoiceProps) {
  const { data: walletClient } = useWalletClient();
  const { address } = invoice || {};
  const [txHash, setTxHash] = useState<Hash>();

  const validAddress = address && isAddress(address) && address;

  useEffect(() => {
    const status = invoice?.verified[0];
    if (status && status.client === client) {
      setVerifiedStatus(true);
    }
  }, [verified, client, setVerifiedStatus, invoice?.verified]);

  const verifyInvoice = async () => {
    try {
      if (!walletClient || !validAddress) {
        logError('verifyInvoice: walletClient is null');
        return;
      }
      const hash = '0x'; // await verify(walletClient, validAddress);
      setTxHash(hash);
      const chainId = walletClient.chain.id;
      const txReceipt = await waitForTransaction({ chainId, hash });
      if (txReceipt.status === 'success') setVerifiedStatus(true);
    } catch (verifyError) {
      logError({ verifyError });
    }
  };

  if (verifiedStatus || !isClient) return null;

  return (
    <VStack w="100%" spacing="rem" alignItems="start">
      {txHash ? (
        <Button
          size="xs"
          colorScheme="blue"
          variant="outline"
          fontWeight="bold"
          fontFamily="mono"
          textTransform="uppercase"
        >
          <Text>verifying...</Text>

          <Spinner ml="1" size="sm" />
        </Button>
      ) : (
        <Button
          size="xs"
          colorScheme="blue"
          fontWeight="normal"
          fontFamily="mono"
          textTransform="uppercase"
          onClick={() => verifyInvoice()}
        >
          <Text>Enable Non-Client Account Deposits</Text>
        </Button>
      )}
    </VStack>
  );
}
