import {
  Alert,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Flex,
  Grid,
  Link,
  Stack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  ESCROW_STEPS,
  KLEROS_ARBITRATION_SAFE,
  KLEROS_COURTS,
} from '@smartinvoicexyz/constants';
import { FormInvoice } from '@smartinvoicexyz/types';
import { Checkbox, Input, Select } from '@smartinvoicexyz/ui';
import {
  escrowDetailsSchema,
  getResolverInfo,
  getResolvers,
  getResolverString,
  isKnownResolver,
} from '@smartinvoicexyz/utils';
import _ from 'lodash';
import { useEffect, useMemo } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { Hex } from 'viem';
import { useChainId } from 'wagmi';

export function EscrowDetailsForm({
  invoiceForm,
  updateStep,
}: {
  invoiceForm: UseFormReturn;
  updateStep: (_i?: number) => void;
}) {
  const chainId = useChainId();
  const { watch, setValue } = invoiceForm;
  const { provider, client, resolver, customResolver, resolverTerms } = watch();

  const localForm = useForm({
    resolver: yupResolver(escrowDetailsSchema(chainId)),
    defaultValues: {
      client,
      provider,
      customResolver,
      resolver,
      resolverTerms,
      klerosCourt: 1,
    },
  });
  const {
    handleSubmit,
    setValue: localSetValue,
    watch: localWatch,
    formState: { isValid, errors },
  } = localForm;
  // eslint-disable-next-line no-console
  console.log('errors', errors, 'isValid', isValid);

  const onSubmit = (values: Partial<FormInvoice>) => {
    setValue('client', values?.client);
    setValue('provider', values?.provider);
    setValue('resolver', values?.resolver);
    setValue('customResolver', values?.customResolver);
    setValue('resolverTerms', values?.resolverTerms);
    if (values?.resolver !== KLEROS_ARBITRATION_SAFE) {
      setValue('klerosCourt', 0);
    } else {
      setValue('klerosCourt', values?.klerosCourt);
    }
    updateStep();
  };

  const buttonSize = useBreakpointValue({ base: 'sm', sm: 'md', md: 'lg' });

  const RESOLVERS = useMemo(() => getResolvers(chainId), [chainId]);
  const localResolver = localWatch('resolver');

  useEffect(() => {
    // set initial local values for select
    localSetValue('resolver', resolver || _.first(RESOLVERS));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  return (
    <Box as="form" onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={4} w="100%">
        <Stack spacing={4}>
          <Input
            label="Client Address"
            tooltip="This is the wallet address your client uses to access the invoice, pay with, & release escrow funds with. It's essential your client has control of this address."
            placeholder="0x..."
            name="client"
            localForm={localForm}
            registerOptions={{ required: true }}
          />
        </Stack>

        <Flex>
          <Input
            label="Service Provider Address"
            tooltip="This is the address of the recipient/provider. It's how you access this invoice & where you'll receive funds released from escrow. It's essential you have control of this address."
            placeholder="0x..."
            name="provider"
            localForm={localForm}
            registerOptions={{ required: true }}
          />
        </Flex>

        <Stack gap={4}>
          <Select
            name="resolver"
            label="Arbitration Provider"
            localForm={localForm}
          >
            {RESOLVERS.map((res: string) => (
              <option key={res} value={res}>
                {getResolverInfo(res as Hex, chainId).name}
              </option>
            ))}
            <option value="custom">Custom</option>
          </Select>

          {localResolver &&
            getResolverInfo(localResolver as Hex, chainId)?.disclaimer && (
              <Alert bg="yellow.500" borderRadius="md" color="white">
                <AlertIcon color="whiteAlpha.800" />
                <AlertTitle fontSize="sm">
                  {getResolverInfo(localResolver as Hex, chainId).disclaimer}
                </AlertTitle>
              </Alert>
            )}

          {localResolver === KLEROS_ARBITRATION_SAFE && (
            <Select
              name="klerosCourt"
              tooltip="This kleros court will be used in case of dispute."
              label="Kleros Court"
              localForm={localForm}
            >
              {KLEROS_COURTS.map((court: { id: number; name: string }) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </Select>
          )}

          {localResolver === 'custom' ||
          !isKnownResolver(localResolver as Hex, chainId) ? (
            <Input
              name="customResolver"
              tooltip="This arbitrator will be used in case of dispute."
              label="Arbitration Provider Address"
              placeholder="0x..."
              localForm={localForm}
            />
          ) : (
            <Checkbox
              name="resolverTerms"
              localForm={localForm}
              options={[
                <Text>
                  {`I agree to ${getResolverString(localResolver as Hex, chainId)}`}
                  &apos;s{' '}
                  <Link
                    href={
                      getResolverInfo(localResolver as Hex, chainId)?.termsUrl
                    }
                    isExternal
                    textDecor="underline"
                  >
                    terms of service
                  </Link>
                </Text>,
              ]}
            />
          )}
        </Stack>

        <Grid templateColumns="1fr" gap="1rem" w="100%" marginTop="20px">
          <Button
            type="submit"
            isDisabled={!isValid}
            textTransform="uppercase"
            size={buttonSize}
            fontWeight="bold"
          >
            Next: {ESCROW_STEPS[2].next}
          </Button>
        </Grid>
      </Stack>
    </Box>
  );
}
