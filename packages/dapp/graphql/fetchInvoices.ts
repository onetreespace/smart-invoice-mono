/* eslint-disable no-unused-vars */
/* eslint-disable camelcase */

import { Address, isAddress } from 'viem';

import { typedGql } from './zeus/typedDocumentNode';
import { Invoice_orderBy, OrderDirection, _SubgraphErrorPolicy_ } from './zeus';
import { clients } from './client';
import { logDebug } from '../utils';
import { scalars } from './scalars';

export type SearchInputType = string | Address | undefined;

const buildInvoicesFilter = (searchInput: SearchInputType) => {
  if (!searchInput) return undefined;
  if (isAddress(searchInput)) {
    return {
      or: [
        { address_contains: searchInput },
        { client_contains: searchInput },
        { provider_contains: searchInput },
        { resolver_contains: searchInput },
      ],
    };
  }
  return { projectName_contains: searchInput };
};

const invoicesQuery = (
  first?: number,
  skip?: number,
  orderBy?: Invoice_orderBy,
  orderDirection?: OrderDirection,
  where?: any,
) =>
  typedGql('query', { scalars })({
    invoices: [
      {
        first,
        skip,
        orderBy,
        orderDirection,
        where,
        subgraphError: _SubgraphErrorPolicy_.allow,
      },
      {
        id: true,
        address: true,
        createdAt: true,
        invoiceType: true,
        network: true,
        projectName: true,
        released: true,
        token: true,
        total: true,
        tokenMetadata: { id: true, decimals: true, name: true, symbol: true },
      },
    ],
  });

export const fetchInvoices = async (
  chainId: number,
  searchInput: SearchInputType,
  pageIndex: number,
  pageSize: number,
  sortBy: Invoice_orderBy,
  sortDesc: boolean = false,
  onLoading: (isLoading: boolean, resultCount?: number) => void = () => {},
) => {
  if (chainId < 0) return undefined;

  onLoading(true);

  const sortDirection = sortDesc ? OrderDirection.desc : OrderDirection.asc;
  const where = buildInvoicesFilter(searchInput);
  const query = invoicesQuery(
    pageSize,
    pageIndex * pageSize,
    sortBy,
    sortDirection,
    where,
  );
  const { data, error } = await clients[chainId].query({ query });

  logDebug({
    data,
    error,
    chainId,
    searchInput,
    pageIndex,
    pageSize,
    sortBy,
    sortDesc,
  });

  onLoading(false, data?.invoices.length);

  if (!data) {
    if (error) {
      throw error;
    }
    return null;
  }

  return data.invoices;
};

type GetElementType<T extends any[] | undefined | null> = T extends (infer U)[]
  ? U
  : never;
type Invoices = Awaited<ReturnType<typeof fetchInvoices>>;
export type Invoice = GetElementType<Invoices>;
