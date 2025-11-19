import { describe, it, expect, beforeEach } from 'vitest';
import { ArkivRFQClient } from '../src/client/ArkivRFQClient.js';
import { RFQStatus } from '../src/types/RFQ.js';
import { ValidationError } from '../src/errors/index.js';
import { ArkivClientMock } from './mocks/ArkivClientMock.js';
import { MockProvider, MockSigner } from './mocks/EthersMock.js';

describe('ArkivRFQClient', () => {
  let client: ArkivRFQClient;
  let arkivMock: ArkivClientMock;
  let provider: MockProvider;
  let signer: MockSigner;

  beforeEach(() => {
    arkivMock = new ArkivClientMock();
    provider = new MockProvider();
    signer = new MockSigner();
    client = new ArkivRFQClient(arkivMock as any, provider as any);
    client.setSigner(signer as any);
  });

  /**
   * Test 1: RFQ creation with wallet signature
   */
  it('should create RFQ with valid data and wallet signature', async () => {
    const input = {
      baseToken: {
        address: '0x1111111111111111111111111111111111111111',
        chainId: 1,
      },
      quoteToken: {
        address: '0x2222222222222222222222222222222222222222',
        chainId: 1,
      },
      baseAmount: '1000000000000000000',
      quoteAmount: '2000000000',
      expiresIn: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };

    const rfq = await client.createRFQ(input);

    expect(rfq).toBeDefined();
    expect(rfq.id).toBeDefined();
    expect(rfq.creator).toBe(await signer.getAddress());
    expect(rfq.baseToken.address).toBe(input.baseToken.address);
    expect(rfq.quoteToken.address).toBe(input.quoteToken.address);
    expect(rfq.baseAmount).toBe(input.baseAmount);
    expect(rfq.quoteAmount).toBe(input.quoteAmount);
    expect(rfq.status).toBe(RFQStatus.OPEN);
    expect(arkivMock.getEntityCount()).toBe(1);
  });

  /**
   * Test 2: RFQ querying with filters
   */
  it('should query RFQs with token pair filter', async () => {
    // Create multiple RFQs
    const baseToken = {
      address: '0x1111111111111111111111111111111111111111',
      chainId: 1,
    };
    const quoteToken = {
      address: '0x2222222222222222222222222222222222222222',
      chainId: 1,
    };

    await client.createRFQ({
      baseToken,
      quoteToken,
      baseAmount: '1000000000000000000',
      quoteAmount: '2000000000',
      expiresIn: Math.floor(Date.now() / 1000) + 3600,
    });

    await client.createRFQ({
      baseToken: {
        address: '0x3333333333333333333333333333333333333333',
        chainId: 1,
      },
      quoteToken,
      baseAmount: '2000000000000000000',
      quoteAmount: '4000000000',
      expiresIn: Math.floor(Date.now() / 1000) + 7200,
    });

    // Query with token pair filter
    const filters = client.filterByTokenPair(
      baseToken.address,
      baseToken.chainId,
      quoteToken.address,
      quoteToken.chainId
    );

    const result = await client.queryRFQs(filters);

    expect(result.rfqs).toHaveLength(1);
    expect(result.rfqs[0].baseToken.address).toBe(baseToken.address);
    expect(result.total).toBe(1);
  });

  /**
   * Test 3: Event streaming subscription
   */
  it('should receive real-time updates via event streaming', async () => {
    let createdRFQ: any = null;
    let updatedRFQ: any = null;

    // Subscribe to events
    const unsubscribe = client.watchRFQs({
      onCreated: (rfq) => {
        createdRFQ = rfq;
      },
      onUpdated: (rfq) => {
        updatedRFQ = rfq;
      },
    });

    // Create RFQ
    const rfq = await client.createRFQ({
      baseToken: {
        address: '0x1111111111111111111111111111111111111111',
        chainId: 1,
      },
      quoteToken: {
        address: '0x2222222222222222222222222222222222222222',
        chainId: 1,
      },
      baseAmount: '1000000000000000000',
      quoteAmount: '2000000000',
      expiresIn: Math.floor(Date.now() / 1000) + 3600,
    });

    expect(createdRFQ).toBeDefined();
    expect(createdRFQ.id).toBe(rfq.id);

    // Update RFQ
    const updated = await client.updateRFQ(rfq.id, {
      baseAmount: '2000000000000000000',
    });

    // Simulate update event
    arkivMock.simulateEntityUpdate(
      {
        entityKey: updated.id,
        data: updated,
        timestamp: Date.now(),
      },
      'RFQ'
    );

    expect(updatedRFQ).toBeDefined();
    expect(updatedRFQ.baseAmount).toBe('2000000000000000000');

    unsubscribe();
  });

  /**
   * Test 4: RFQ update with ownership validation
   */
  it('should allow creator to update their own RFQ', async () => {
    const rfq = await client.createRFQ({
      baseToken: {
        address: '0x1111111111111111111111111111111111111111',
        chainId: 1,
      },
      quoteToken: {
        address: '0x2222222222222222222222222222222222222222',
        chainId: 1,
      },
      baseAmount: '1000000000000000000',
      quoteAmount: '2000000000',
      expiresIn: Math.floor(Date.now() / 1000) + 3600,
    });

    // Add a small delay to ensure updatedAt is different
    await new Promise((resolve) => setTimeout(resolve, 1001));

    const updated = await client.updateRFQ(rfq.id, {
      baseAmount: '1500000000000000000',
    });

    expect(updated.baseAmount).toBe('1500000000000000000');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(rfq.createdAt);
  });

  /**
   * Test 5: RFQ cancellation
   */
  it('should cancel RFQ and update status to CANCELLED', async () => {
    const rfq = await client.createRFQ({
      baseToken: {
        address: '0x1111111111111111111111111111111111111111',
        chainId: 1,
      },
      quoteToken: {
        address: '0x2222222222222222222222222222222222222222',
        chainId: 1,
      },
      baseAmount: '1000000000000000000',
      quoteAmount: '2000000000',
      expiresIn: Math.floor(Date.now() / 1000) + 3600,
    });

    const cancelled = await client.cancelRFQ(rfq.id);

    expect(cancelled.status).toBe(RFQStatus.CANCELLED);
    expect(cancelled.id).toBe(rfq.id);
  });

  /**
   * Test 6: Query with creator filter
   */
  it('should filter RFQs by creator address', async () => {
    const creatorAddress = await signer.getAddress();

    // Create RFQ
    await client.createRFQ({
      baseToken: {
        address: '0x1111111111111111111111111111111111111111',
        chainId: 1,
      },
      quoteToken: {
        address: '0x2222222222222222222222222222222222222222',
        chainId: 1,
      },
      baseAmount: '1000000000000000000',
      quoteAmount: '2000000000',
      expiresIn: Math.floor(Date.now() / 1000) + 3600,
    });

    // Query by creator
    const filters = client.filterByCreator(creatorAddress);
    const result = await client.queryRFQs(filters);

    expect(result.rfqs.length).toBeGreaterThan(0);
    expect(result.rfqs[0].creator.toLowerCase()).toBe(
      creatorAddress.toLowerCase()
    );
  });

  /**
   * Test 7: Validation error for invalid RFQ data
   */
  it('should throw validation error for invalid token address', async () => {
    const invalidInput = {
      baseToken: {
        address: 'invalid-address',
        chainId: 1,
      },
      quoteToken: {
        address: '0x2222222222222222222222222222222222222222',
        chainId: 1,
      },
      baseAmount: '1000000000000000000',
      quoteAmount: '2000000000',
      expiresIn: Math.floor(Date.now() / 1000) + 3600,
    };

    await expect(client.createRFQ(invalidInput)).rejects.toThrow(
      ValidationError
    );
  });

  /**
   * Test 8: Get single RFQ by ID
   */
  it('should retrieve RFQ by ID', async () => {
    const created = await client.createRFQ({
      baseToken: {
        address: '0x1111111111111111111111111111111111111111',
        chainId: 1,
      },
      quoteToken: {
        address: '0x2222222222222222222222222222222222222222',
        chainId: 1,
      },
      baseAmount: '1000000000000000000',
      quoteAmount: '2000000000',
      expiresIn: Math.floor(Date.now() / 1000) + 3600,
    });

    const retrieved = await client.getRFQ(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.baseAmount).toBe(created.baseAmount);
  });
});
