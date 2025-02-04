import { Flex } from '@chakra-ui/react';
import { SUPPORTED_NETWORKS } from '@smartinvoicexyz/constants';
import { track } from '@vercel/analytics';
import { Analytics } from '@vercel/analytics/react';
import { useRouter } from 'next/router';
import React, { PropsWithChildren, useEffect } from 'react';
import { useWalletClient } from 'wagmi';

import { Footer } from '../molecules/Footer';
import { Header } from '../molecules/Header';
import { ConnectWeb3 } from './ConnectWeb3';

export function Layout({ children }: PropsWithChildren) {
  const { data: walletClient } = useWalletClient();
  const chainId = walletClient?.chain?.id;
  const account = walletClient?.account;

  useEffect(() => {
    track('ChainChanged', { chain: chainId ?? null });
  }, [chainId]);

  const router = useRouter();
  const isOpenPath =
    router.pathname === '/' || router.pathname === '/contracts';
  const isValid =
    isOpenPath || (account && chainId && SUPPORTED_NETWORKS.includes(chainId));

  return (
    <Flex
      position="relative"
      w="100%"
      direction="column"
      justify="center"
      align="center"
      bg="#F5F6F8"
      h="100%"
      minH="100vh"
      overflowX="hidden"
      bgSize="cover"
      color="#323C47"
    >
      <Header />
      <Flex
        flexGrow={1}
        position="relative"
        w="100%"
        direction="column"
        justify="center"
        align="center"
        h="100%"
      >
        {isValid ? children : <ConnectWeb3 />}
      </Flex>
      <Analytics />
      <Footer />
    </Flex>
  );
}
