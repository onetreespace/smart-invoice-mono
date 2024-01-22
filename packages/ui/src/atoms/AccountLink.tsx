import { Flex, Link, Text } from '@chakra-ui/react';
import {
  getAddressLink,
  getResolverInfo,
  getResolverString,
  isKnownResolver,
} from '@smart-invoice/utils';
import blockies from 'blockies-ts';
import _ from 'lodash';
import { Address } from 'viem';
import { useChainId } from 'wagmi';

export type AccountLinkProps = {
  address?: Address;
  chainId?: number;
};

export function AccountLink({
  address: inputAddress,
  chainId: inputChainId,
}: AccountLinkProps) {
  const walletChainId = useChainId();
  const address = _.toLower(inputAddress) as Address;
  const chainId = inputChainId || walletChainId;
  const isResolver = isKnownResolver(address, chainId);
  const blockie = blockies
    .create({ seed: address, size: 8, scale: 16 })
    .toDataURL();

  const displayString = getResolverString(address, chainId);

  const imageUrl = isResolver
    ? getResolverInfo(address, chainId).logoUrl
    : undefined;

  return (
    <Link
      href={getAddressLink(chainId, address)}
      isExternal
      display="inline-flex"
      textAlign="right"
      bgColor="white"
      px="0.25rem"
      _hover={{
        textDecor: 'none',
        bgColor: '#ECECF3',
      }}
      borderRadius="5px"
      alignItems="center"
      fontWeight="bold"
    >
      <Flex
        as="span"
        borderRadius="50%"
        w="1.1rem"
        h="1.1rem"
        overflow="hidden"
        justify="center"
        align="center"
        bgColor="black"
        bgImage={imageUrl ? `url(${imageUrl})` : blockie}
        border="1px solid"
        borderColor="white20"
        bgSize="cover"
        bgRepeat="no-repeat"
        bgPosition="center center"
      />

      <Text as="span" pl="0.25rem" fontSize="sm">
        {displayString}
      </Text>
    </Link>
  );
}
