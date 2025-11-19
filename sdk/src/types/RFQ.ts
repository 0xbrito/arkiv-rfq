/**
 * Token information including address and chain ID
 */
export interface TokenInfo {
  address: string;
  chainId: number;
}

/**
 * RFQ status enum
 */
export enum RFQStatus {
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
}

/**
 * Fill record for tracking partial fills (future feature)
 */
export interface Fill {
  acceptor: string;
  amount: string;
  timestamp: number;
  txHash: string;
}

/**
 * Complete RFQ data structure
 */
export interface RFQ {
  id: string;
  creator: string;
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  baseAmount: string;
  quoteAmount: string;
  expiresIn: number;
  status: RFQStatus;
  createdAt: number;
  updatedAt: number;

  // Future feature fields (not implemented in MVP)
  filledAmount?: string;
  fills?: Fill[];
  minFillAmount?: string;
  counterpartyRestrictions?: string[];
}

/**
 * Input data for creating a new RFQ
 */
export interface CreateRFQInput {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  baseAmount: string;
  quoteAmount: string;
  expiresIn: number;
  minFillAmount?: string;
  counterpartyRestrictions?: string[];
}

/**
 * Input data for updating an existing RFQ
 */
export interface UpdateRFQInput {
  baseAmount?: string;
  quoteAmount?: string;
  expiresIn?: number;
  status?: RFQStatus;
  filledAmount?: string;
  fills?: Fill[];
}

/**
 * Query filters for searching RFQs
 */
export interface QueryFilters {
  tokenPair?: {
    base: TokenInfo;
    quote: TokenInfo;
  };
  chain?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  creator?: string;
  expiration?: {
    minTime: number;
    maxTime: number;
  };
  status?: RFQStatus;
}

/**
 * Sort options for query results
 */
export enum SortBy {
  CREATION_TIME = 'creationTime',
  EXPIRATION = 'expiration',
  BEST_PRICE = 'bestPrice',
}

export interface SortOptions {
  sortBy: SortBy;
  ascending?: boolean;
}

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  limit?: number;
  cursor?: string;
}

/**
 * Query result with metadata
 */
export interface QueryResult {
  rfqs: RFQ[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Event streaming options
 */
export interface WatchRFQsOptions {
  onCreated?: (rfq: RFQ) => void;
  onUpdated?: (rfq: RFQ) => void;
  onCancelled?: (rfq: RFQ) => void;
  onFilled?: (rfq: RFQ) => void;
  pollingInterval?: number;
  filters?: QueryFilters;
}

/**
 * Unsubscribe function type
 */
export type UnsubscribeFn = () => void;
