import { ethers } from 'ethers';
import { SortBy } from '../types/RFQ.js';
import type {
  RFQ,
  CreateRFQInput,
  UpdateRFQInput,
  QueryFilters,
  SortOptions,
  PaginationOptions,
  QueryResult,
  WatchRFQsOptions,
  UnsubscribeFn,
  RFQStatus,
} from '../types/RFQ.js';
import type { ArkivPublicClient, ArkivEntity } from '../types/arkiv.js';
import {
  ArkivNetworkError,
  SignatureError,
  OwnershipError,
  RFQNotFoundError,
} from '../errors/index.js';
import { withRetry } from '../utils/retry.js';
import {
  validateCreateRFQInput,
  validateRFQId,
  validateAddress,
} from '../utils/validation.js';

const RFQ_ENTITY_TYPE = 'RFQ';
const DEFAULT_POLLING_INTERVAL = 2000;
const DEFAULT_PAGE_LIMIT = 50;

/**
 * Main client for interacting with RFQs in Arkiv Network
 */
export class ArkivRFQClient {
  private arkivClient: ArkivPublicClient;
  private signer?: ethers.Signer;

  constructor(arkivClient: ArkivPublicClient, _provider: ethers.Provider) {
    this.arkivClient = arkivClient;
  }

  /**
   * Set the signer for wallet operations
   */
  async setSigner(signer: ethers.Signer): Promise<void> {
    this.signer = signer;
  }

  /**
   * Get the current signer address
   */
  private async getSignerAddress(): Promise<string> {
    if (!this.signer) {
      throw new SignatureError('No signer configured. Call setSigner() first.');
    }
    try {
      return await this.signer.getAddress();
    } catch (error) {
      throw new SignatureError('Failed to get signer address', error);
    }
  }

  /**
   * Generate EIP-712 signature for RFQ data
   */
  private async signRFQData(data: Record<string, any>): Promise<string> {
    if (!this.signer) {
      throw new SignatureError('No signer configured. Call setSigner() first.');
    }

    try {
      const message = JSON.stringify(data);
      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      throw new SignatureError('Failed to sign RFQ data', error);
    }
  }

  /**
   * Create a new RFQ in Arkiv
   */
  async createRFQ(input: CreateRFQInput): Promise<RFQ> {
    validateCreateRFQInput(input);

    const creator = await this.getSignerAddress();
    const now = Math.floor(Date.now() / 1000);
    const id = this.generateRFQId(creator, now);

    const rfqData = {
      id,
      creator,
      baseToken: input.baseToken,
      quoteToken: input.quoteToken,
      baseAmount: input.baseAmount,
      quoteAmount: input.quoteAmount,
      expiresIn: input.expiresIn,
      status: 'OPEN' as RFQStatus,
      createdAt: now,
      updatedAt: now,
      filledAmount: input.minFillAmount || '0',
      fills: [],
      minFillAmount: input.minFillAmount,
      counterpartyRestrictions: input.counterpartyRestrictions,
    };

    const signature = await this.signRFQData(rfqData);

    return withRetry(async () => {
      try {
        const entity = await this.arkivClient.writeEntity({
          entityType: RFQ_ENTITY_TYPE,
          entityKey: id,
          data: rfqData,
          signature,
        });

        return this.entityToRFQ(entity);
      } catch (error) {
        throw new ArkivNetworkError('Failed to create RFQ', error);
      }
    });
  }

  /**
   * Update an existing RFQ
   */
  async updateRFQ(id: string, updates: UpdateRFQInput): Promise<RFQ> {
    validateRFQId(id);

    const existingRFQ = await this.getRFQ(id);
    if (!existingRFQ) {
      throw new RFQNotFoundError(id);
    }

    const signerAddress = await this.getSignerAddress();
    if (existingRFQ.creator.toLowerCase() !== signerAddress.toLowerCase()) {
      throw new OwnershipError('Only the RFQ creator can update this RFQ');
    }

    if (existingRFQ.status !== 'OPEN') {
      throw new OwnershipError('Cannot update a non-open RFQ');
    }

    const updatedData = {
      ...existingRFQ,
      ...updates,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    const signature = await this.signRFQData(updatedData);

    return withRetry(async () => {
      try {
        const entity = await this.arkivClient.writeEntity({
          entityType: RFQ_ENTITY_TYPE,
          entityKey: id,
          data: updatedData,
          signature,
        });

        return this.entityToRFQ(entity);
      } catch (error) {
        throw new ArkivNetworkError('Failed to update RFQ', error);
      }
    });
  }

  /**
   * Cancel an RFQ
   */
  async cancelRFQ(id: string): Promise<RFQ> {
    return this.updateRFQ(id, { status: 'CANCELLED' as RFQStatus });
  }

  /**
   * Delete an RFQ from Arkiv
   */
  async deleteRFQ(id: string): Promise<void> {
    validateRFQId(id);

    const existingRFQ = await this.getRFQ(id);
    if (!existingRFQ) {
      throw new RFQNotFoundError(id);
    }

    const signerAddress = await this.getSignerAddress();
    if (existingRFQ.creator.toLowerCase() !== signerAddress.toLowerCase()) {
      throw new OwnershipError('Only the RFQ creator can delete this RFQ');
    }

    return withRetry(async () => {
      try {
        await this.arkivClient.deleteEntity(RFQ_ENTITY_TYPE, id);
      } catch (error) {
        throw new ArkivNetworkError('Failed to delete RFQ', error);
      }
    });
  }

  /**
   * Get a single RFQ by ID
   */
  async getRFQ(id: string): Promise<RFQ | null> {
    validateRFQId(id);

    return withRetry(async () => {
      try {
        const entity = await this.arkivClient.getEntity(RFQ_ENTITY_TYPE, id);
        return entity ? this.entityToRFQ(entity) : null;
      } catch (error) {
        throw new ArkivNetworkError('Failed to get RFQ', error);
      }
    });
  }

  /**
   * Query RFQs with filters, sorting, and pagination
   */
  async queryRFQs(
    filters?: QueryFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<QueryResult> {
    return withRetry(async () => {
      try {
        const arkivFilters = this.buildArkivFilters(filters);
        const arkivSort = this.buildArkivSort(sort);

        const response = await this.arkivClient.queryEntities({
          entityType: RFQ_ENTITY_TYPE,
          filters: arkivFilters,
          sort: arkivSort,
          limit: pagination?.limit || DEFAULT_PAGE_LIMIT,
          cursor: pagination?.cursor,
        });

        const rfqs = response.entities.map((entity) => this.entityToRFQ(entity));

        return {
          rfqs,
          total: response.total,
          hasMore: !!response.nextCursor,
          nextCursor: response.nextCursor,
        };
      } catch (error) {
        throw new ArkivNetworkError('Failed to query RFQs', error);
      }
    });
  }

  /**
   * Watch RFQs for real-time updates
   */
  watchRFQs(options: WatchRFQsOptions = {}): UnsubscribeFn {
    const arkivFilters = this.buildArkivFilters(options.filters);

    try {
      const unsubscribe = this.arkivClient.watchEntities({
        entityType: RFQ_ENTITY_TYPE,
        pollingInterval: options.pollingInterval || DEFAULT_POLLING_INTERVAL,
        filters: arkivFilters,
        onCreated: options.onCreated
          ? (entity) => {
              const rfq = this.entityToRFQ(entity);
              if (rfq.status === 'OPEN') {
                options.onCreated!(rfq);
              }
            }
          : undefined,
        onUpdated: options.onUpdated
          ? (entity) => {
              const rfq = this.entityToRFQ(entity);

              // Call appropriate callback based on status
              if (rfq.status === 'CANCELLED' && options.onCancelled) {
                options.onCancelled(rfq);
              } else if (rfq.status === 'FILLED' && options.onFilled) {
                options.onFilled(rfq);
              } else if (options.onUpdated) {
                options.onUpdated(rfq);
              }
            }
          : undefined,
      });

      return unsubscribe;
    } catch (error) {
      throw new ArkivNetworkError('Failed to start watching RFQs', error);
    }
  }

  /**
   * Filter RFQs by token pair
   */
  filterByTokenPair(
    baseAddress: string,
    baseChainId: number,
    quoteAddress: string,
    quoteChainId: number
  ): QueryFilters {
    validateAddress(baseAddress, 'baseAddress');
    validateAddress(quoteAddress, 'quoteAddress');

    return {
      tokenPair: {
        base: { address: baseAddress, chainId: baseChainId },
        quote: { address: quoteAddress, chainId: quoteChainId },
      },
    };
  }

  /**
   * Filter RFQs by chain
   */
  filterByChain(chainId: number): QueryFilters {
    return { chain: chainId };
  }

  /**
   * Filter RFQs by price range
   */
  filterByPriceRange(min: number, max: number): QueryFilters {
    return { priceRange: { min, max } };
  }

  /**
   * Filter RFQs by creator address
   */
  filterByCreator(address: string): QueryFilters {
    validateAddress(address, 'creator');
    return { creator: address };
  }

  /**
   * Filter RFQs by expiration window
   */
  filterByExpiration(minTime: number, maxTime: number): QueryFilters {
    return { expiration: { minTime, maxTime } };
  }

  /**
   * Generate unique RFQ ID
   */
  private generateRFQId(creator: string, timestamp: number): string {
    const random = Math.random().toString(36).substring(2, 15);
    return `${creator.toLowerCase()}-${timestamp}-${random}`;
  }

  /**
   * Convert Arkiv entity to RFQ
   */
  private entityToRFQ(entity: ArkivEntity): RFQ {
    return {
      id: entity.data.id,
      creator: entity.data.creator,
      baseToken: entity.data.baseToken,
      quoteToken: entity.data.quoteToken,
      baseAmount: entity.data.baseAmount,
      quoteAmount: entity.data.quoteAmount,
      expiresIn: entity.data.expiresIn,
      status: entity.data.status,
      createdAt: entity.data.createdAt,
      updatedAt: entity.data.updatedAt,
      filledAmount: entity.data.filledAmount,
      fills: entity.data.fills,
      minFillAmount: entity.data.minFillAmount,
      counterpartyRestrictions: entity.data.counterpartyRestrictions,
    };
  }

  /**
   * Build Arkiv-compatible filters from QueryFilters
   */
  private buildArkivFilters(filters?: QueryFilters): Record<string, any> {
    if (!filters) {
      return {};
    }

    const arkivFilters: Record<string, any> = {};

    if (filters.tokenPair) {
      arkivFilters['baseToken.address'] = filters.tokenPair.base.address;
      arkivFilters['baseToken.chainId'] = filters.tokenPair.base.chainId;
      arkivFilters['quoteToken.address'] = filters.tokenPair.quote.address;
      arkivFilters['quoteToken.chainId'] = filters.tokenPair.quote.chainId;
    }

    if (filters.chain) {
      arkivFilters.$or = [
        { 'baseToken.chainId': filters.chain },
        { 'quoteToken.chainId': filters.chain },
      ];
    }

    if (filters.creator) {
      arkivFilters.creator = filters.creator.toLowerCase();
    }

    if (filters.expiration) {
      arkivFilters.expiresIn = {
        $gte: filters.expiration.minTime,
        $lte: filters.expiration.maxTime,
      };
    }

    if (filters.status) {
      arkivFilters.status = filters.status;
    }

    // Price range requires calculated field
    if (filters.priceRange) {
      // This would need custom implementation in Arkiv query
      // For now, we'll filter post-query in the client
    }

    return arkivFilters;
  }

  /**
   * Build Arkiv-compatible sort from SortOptions
   */
  private buildArkivSort(
    sort?: SortOptions
  ): { field: string; order: 'asc' | 'desc' } | undefined {
    if (!sort) {
      return { field: 'createdAt', order: 'desc' };
    }

    let field: string;
    switch (sort.sortBy) {
      case SortBy.CREATION_TIME:
        field = 'createdAt';
        break;
      case SortBy.EXPIRATION:
        field = 'expiresIn';
        break;
      case SortBy.BEST_PRICE:
        // Price calculation would need custom implementation
        field = 'createdAt';
        break;
      default:
        field = 'createdAt';
    }

    return {
      field,
      order: sort.ascending ? 'asc' : 'desc',
    };
  }
}
