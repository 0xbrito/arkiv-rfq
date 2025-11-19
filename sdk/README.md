# Arkiv RFQ SDK

TypeScript SDK for interacting with RFQs (Request for Quote) on the Arkiv Network. This SDK provides a complete interface for creating, querying, updating, and streaming RFQ data in a decentralized manner.

## Features

- **Complete CRUD Operations**: Create, read, update, and delete RFQs
- **Advanced Querying**: Filter by token pair, chain, price range, creator, and expiration
- **Real-Time Updates**: Subscribe to RFQ events with configurable polling
- **Wallet Integration**: Sign operations with ethers.js v6
- **Error Handling**: Automatic retry with exponential backoff
- **Environment Agnostic**: Works in both browser and Node.js
- **TypeScript**: Full type safety with comprehensive type definitions
- **Dual Module**: ESM and CommonJS support

## Installation

```bash
npm install @arkiv-rfq/sdk ethers@6
```

## Usage

### Basic Setup

```typescript
import { ArkivRFQClient } from '@arkiv-rfq/sdk';
import { ethers } from 'ethers';

// Initialize Arkiv client (replace with actual Arkiv SDK)
const arkivClient = /* your Arkiv PublicClient */;

// Initialize ethers provider and signer
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Create SDK client
const client = new ArkivRFQClient(arkivClient, provider);
await client.setSigner(signer);
```

### Create RFQ

```typescript
const rfq = await client.createRFQ({
  baseToken: {
    address: '0x1111111111111111111111111111111111111111',
    chainId: 11155111, // Sepolia
  },
  quoteToken: {
    address: '0x2222222222222222222222222222222222222222',
    chainId: 11155111,
  },
  baseAmount: '1000000000000000000', // 1 ETH
  quoteAmount: '2000000000', // 2000 USDC
  expiresIn: Math.floor(Date.now() / 1000) + 3600, // 1 hour
});

console.log('Created RFQ:', rfq.id);
```

### Query RFQs

```typescript
// Query all open RFQs
const result = await client.queryRFQs();

// Query with filters
const filters = client.filterByTokenPair(
  '0x1111111111111111111111111111111111111111',
  11155111,
  '0x2222222222222222222222222222222222222222',
  11155111
);

const filteredResult = await client.queryRFQs(filters);

// Query with sorting and pagination
const sortedResult = await client.queryRFQs(
  undefined,
  { sortBy: 'creationTime', ascending: false },
  { limit: 20 }
);
```

### Update RFQ

```typescript
const updated = await client.updateRFQ(rfq.id, {
  baseAmount: '1500000000000000000', // Update to 1.5 ETH
});
```

### Cancel RFQ

```typescript
const cancelled = await client.cancelRFQ(rfq.id);
```

### Subscribe to Events

```typescript
const unsubscribe = client.watchRFQs({
  onCreated: (rfq) => {
    console.log('New RFQ created:', rfq.id);
  },
  onUpdated: (rfq) => {
    console.log('RFQ updated:', rfq.id);
  },
  onCancelled: (rfq) => {
    console.log('RFQ cancelled:', rfq.id);
  },
  onFilled: (rfq) => {
    console.log('RFQ filled:', rfq.id);
  },
  pollingInterval: 2000, // 2 seconds
});

// Clean up when done
unsubscribe();
```

## API Reference

### ArkivRFQClient

#### Constructor

```typescript
new ArkivRFQClient(arkivClient: ArkivPublicClient, provider: ethers.Provider)
```

#### Methods

- `setSigner(signer: ethers.Signer): Promise<void>` - Set wallet signer for operations
- `createRFQ(input: CreateRFQInput): Promise<RFQ>` - Create new RFQ
- `updateRFQ(id: string, updates: UpdateRFQInput): Promise<RFQ>` - Update existing RFQ
- `cancelRFQ(id: string): Promise<RFQ>` - Cancel RFQ
- `deleteRFQ(id: string): Promise<void>` - Delete RFQ
- `getRFQ(id: string): Promise<RFQ | null>` - Get RFQ by ID
- `queryRFQs(filters?, sort?, pagination?): Promise<QueryResult>` - Query RFQs
- `watchRFQs(options: WatchRFQsOptions): UnsubscribeFn` - Subscribe to events

#### Filter Helpers

- `filterByTokenPair(baseAddress, baseChainId, quoteAddress, quoteChainId): QueryFilters`
- `filterByChain(chainId): QueryFilters`
- `filterByPriceRange(min, max): QueryFilters`
- `filterByCreator(address): QueryFilters`
- `filterByExpiration(minTime, maxTime): QueryFilters`

## Types

### RFQ

```typescript
interface RFQ {
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
  filledAmount?: string;
  fills?: Fill[];
  minFillAmount?: string;
  counterpartyRestrictions?: string[];
}
```

### RFQStatus

```typescript
enum RFQStatus {
  OPEN = 'OPEN',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
}
```

## Error Handling

The SDK provides specific error types for different failure scenarios:

- `ArkivNetworkError` - Network and Arkiv connection issues
- `SignatureError` - Wallet signature failures
- `ValidationError` - Input validation failures
- `OwnershipError` - Permission/ownership issues
- `RFQNotFoundError` - RFQ not found

```typescript
try {
  await client.createRFQ(input);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.message);
  } else if (error instanceof SignatureError) {
    console.error('Signature failed:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev
```

## License

MIT
