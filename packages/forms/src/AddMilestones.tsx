/* eslint-disable no-plusplus */
/* eslint-disable radix */
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import {
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  HStack,
  Heading,
  Icon,
  IconButton,
  Stack,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { InvoiceDetails } from '@smart-invoice/graphql';
import { useAddMilestones } from '@smart-invoice/hooks';
import {
  LinkInput,
  NumberInput,
  QuestionIcon,
  useMediaStyles,
  useToast,
} from '@smart-invoice/ui';
import {
  commify,
  // getTxLink,
  resolutionFeePercentage,
} from '@smart-invoice/utils';
import { useQueryClient } from '@tanstack/react-query';
import _ from 'lodash';
import { useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Hex } from 'viem';
import { useChainId } from 'wagmi';

export function AddMilestones({
  invoice,
  onClose,
}: {
  invoice: InvoiceDetails;
  onClose: () => void;
}) {
  const chainId = useChainId();
  const toast = useToast();
  const localForm = useForm({
    defaultValues: {
      milestones: [{ value: '' }, { value: '' }],
    },
  });
  const {
    watch,
    formState: { errors },
    control,
  } = localForm;
  const { address, tokenMetadata, resolutionRate, total, deposited } = _.pick(
    invoice,
    ['address', 'tokenMetadata', 'resolutionRate', 'total', 'deposited'],
  );

  const {
    fields: milestonesFields,
    append: appendMilestone,
    remove: removeMilestone,
  } = useFieldArray({
    name: 'milestones',
    control,
  });
  const { milestones } = watch();
  const queryClient = useQueryClient();
  const onTxSuccess = () => {
    // invalidate cache
    queryClient.invalidateQueries({
      queryKey: ['invoiceDetails'],
    });
    queryClient.invalidateQueries({ queryKey: ['extendedInvoiceDetails'] });
    // close modal
    onClose();
  };

  const { writeAsync, isLoading } = useAddMilestones({
    address: address as Hex,
    chainId,
    invoice,
    localForm,
    toast,
    onTxSuccess,
  });

  // TODO handle excess funds from previous deposits
  const excessFunds = useMemo(() => {
    if (!total || !deposited) return 0;
    return deposited - total; // bigint
  }, [total, deposited, tokenMetadata]);

  const newTotalDue = _.sumBy(milestones, ({ value }) => _.toNumber(value));
  const newDisputeFee =
    resolutionFeePercentage(resolutionRate.toString()) * newTotalDue;

  // const { resolutionRate: factoryResolutionRate } = useRateForResolver({
  //   resolver: address as Hex,
  //   chainId,
  // });

  const { primaryButtonSize } = useMediaStyles();

  // * add milestones click handler
  const addNewMilestones = async () => {
    writeAsync?.();
  };

  return (
    <Stack w="100%" spacing={4}>
      <Heading
        fontWeight="bold"
        mb="1rem"
        textTransform="uppercase"
        textAlign="center"
        color="black"
        size="lg"
      >
        Add New Payment Milestones
      </Heading>

      <LinkInput
        name="projectAgreement"
        label="Link to Project Agreement (if updated)"
        tooltip="Link to the original agreement was an IPFS hash. Therefore, if any revisions were made to the agreement in correlation to the new milestones, please include the new link to it. This will be referenced in the case of a dispute."
        localForm={localForm}
      />

      <FormControl isInvalid={!!errors?.milestones}>
        <Stack w="100%">
          <HStack align="center" spacing={1}>
            <Heading size="sm">Milestone Amounts</Heading>
            <Tooltip
              label="Amounts of each milestone for the escrow. Additional milestones can be added later."
              placement="right"
              hasArrow
            >
              <Icon as={QuestionIcon} boxSize={3} borderRadius="full" />
            </Tooltip>
          </HStack>
          {_.map(milestonesFields, (field, index) => {
            const handleRemoveMilestone = () => {
              removeMilestone(index);
            };

            return (
              <HStack key={field.id} spacing={4}>
                <HStack spacing={1} flexGrow={1}>
                  <NumberInput
                    name={`milestones.${index}.value`}
                    step={1}
                    min={0}
                    max={1_000_000}
                    w="97%"
                    placeholder="500"
                    variant="outline"
                    localForm={localForm}
                  />
                  <Text>{tokenMetadata?.symbol}</Text>
                </HStack>
                <IconButton
                  icon={<Icon as={DeleteIcon} />}
                  aria-label="remove milestone"
                  variant="outline"
                  onClick={handleRemoveMilestone}
                />
              </HStack>
            );
          })}
          <Flex>
            <FormErrorMessage mb={4}>
              {errors?.milestones?.message as string}
            </FormErrorMessage>
          </Flex>

          <Flex justify="space-between" align="flex-end">
            <Button
              variant="outline"
              onClick={() => {
                appendMilestone({ value: '1' });
              }}
              rightIcon={<Icon as={AddIcon} boxSize={3} />}
            >
              Add
            </Button>

            <Text>
              Total: {commify(newTotalDue || 0)} {tokenMetadata?.symbol}
            </Text>
          </Flex>
        </Stack>
      </FormControl>

      {!!newTotalDue && (
        <Stack>
          <Flex color="black" justify="space-between" w="100%" fontSize="sm">
            <HStack>
              <Text fontWeight="bold" color="black">
                Potential Dispute Fee:
              </Text>

              <Text>{`${newDisputeFee} ${tokenMetadata?.symbol}`}</Text>
            </HStack>
          </Flex>

          <Flex color="black" justify="space-between" w="100%" fontSize="sm">
            <HStack>
              <Text fontWeight="bold" color="black">
                Expected Total Due:
              </Text>

              <Text>{`${newTotalDue} ${tokenMetadata?.symbol}`}</Text>
            </HStack>
          </Flex>
        </Stack>
      )}

      <Text>
        Note: new milestones may take a few minutes to appear in the list
      </Text>

      <Button
        onClick={addNewMilestones}
        isLoading={isLoading}
        isDisabled={!writeAsync}
        textTransform="uppercase"
        size={primaryButtonSize}
        w="100%"
      >
        Add
      </Button>
      {/* {walletClient?.chain?.id && txHash && (
        <Text color="black" textAlign="center" fontSize="sm">
          Follow your transaction{' '}
          <Link
            href={getTxLink(walletClient?.chain?.id, txHash)}
            isExternal
            color="blue.1"
            textDecoration="underline"
          >
            here
          </Link>
        </Text>
      )} */}
    </Stack>
  );
}
