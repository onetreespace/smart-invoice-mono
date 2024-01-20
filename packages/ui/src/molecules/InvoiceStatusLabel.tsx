/* eslint-disable no-nested-ternary */
import { Flex, Text } from '@chakra-ui/react';
import { Invoice } from '@smart-invoice/graphql';
import { useInvoiceStatus } from '@smart-invoice/hooks';
import _ from 'lodash';
import React from 'react';

import { Loader } from '../atoms/Loader';

export type InvoiceStatusLabelProps = {
  invoice: Invoice;
  onClick?: () => void;
};

export function InvoiceStatusLabel({
  invoice,
  onClick,
}: InvoiceStatusLabelProps) {
  const { data, isLoading } = useInvoiceStatus(invoice);
  const { funded, label } = _.pick(data, ['funded', 'label']);
  const { isLocked, terminationTime } = invoice ?? {};
  const terminated = terminationTime && Number(terminationTime) > Date.now();
  const disputeResolved = label === 'Dispute Resolved';

  let bgColor = '#FFB946';
  if (isLoading) bgColor = '#FFFFFF';
  if (terminated || disputeResolved || label === 'Expired') {
    bgColor = '#C2CFE0';
  }
  if (isLocked) bgColor = '#F7685B';
  if (label === 'Overdue') bgColor = '#F7685B';
  if (funded) bgColor = '#2ED47A';

  return (
    <Flex
      bgColor={bgColor}
      padding="6px"
      borderRadius="10"
      minWidth="165px"
      justify="center"
      onClick={onClick}
      _hover={{
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Text color="white" fontWeight="bold" textAlign="center" fontSize="15px">
        {isLoading ? <Loader size="20" /> : label}
      </Text>
    </Flex>
  );
}
