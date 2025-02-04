import { Stack } from '@chakra-ui/react';
import {
  InvoiceButtonManager,
  InvoicePaymentDetails,
} from '@smartinvoicexyz/forms';
import { useInvoiceDetails } from '@smartinvoicexyz/hooks';
import {
  Container,
  InvoiceMetaDetails,
  InvoiceNotFound,
  Loader,
} from '@smartinvoicexyz/ui';
import _ from 'lodash';
import { useRouter } from 'next/router';
import { Hex, isAddress } from 'viem';
import { useChainId } from 'wagmi';

import { useOverlay } from '../../../../contexts/OverlayContext';

function ViewInvoice() {
  const chainId = useChainId();
  const { modals, setModals } = useOverlay();
  const router = useRouter();
  const { invoiceId: invId, chainId: hexChainId } = router.query;
  const invoiceId = _.toLower(String(invId)) as Hex;
  const invoiceChainId = hexChainId
    ? parseInt(String(hexChainId), 16)
    : undefined;

  const { invoiceDetails, isLoading } = useInvoiceDetails({
    chainId,
    address: invoiceId,
  });

  if (!isAddress(invoiceId) || (!invoiceDetails === null && !isLoading)) {
    return <InvoiceNotFound />;
  }

  if (invoiceDetails && chainId !== invoiceChainId) {
    return (
      <InvoiceNotFound chainId={invoiceChainId} heading="Incorrect Network" />
    );
  }

  if (!invoiceDetails) {
    return (
      <Container overlay gap={10}>
        <Loader size="80" />
        If the invoice does not load,
        <br />
        please refresh the browser.
      </Container>
    );
  }

  return (
    <Container overlay>
      <Stack
        spacing="2rem"
        justify="center"
        align="center"
        direction={{ base: 'column', lg: 'row' }}
        w="100%"
        px="1rem"
        py="8rem"
      >
        <InvoiceMetaDetails invoice={invoiceDetails as any} />

        <Stack minW={{ base: '90%', md: '50%' }}>
          <InvoicePaymentDetails
            invoice={invoiceDetails as any}
            modals={modals}
            setModals={setModals}
          />

          <InvoiceButtonManager
            invoice={invoiceDetails as any}
            modals={modals}
            setModals={setModals}
          />
        </Stack>
      </Stack>
    </Container>
  );
}

export default ViewInvoice;
