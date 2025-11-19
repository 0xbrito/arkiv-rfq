import { ethers } from 'ethers';

/**
 * Mock signer for testing
 */
export class MockSigner {
  private address: string;

  constructor(address: string = '0x1234567890123456789012345678901234567890') {
    this.address = address;
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async signMessage(message: string): Promise<string> {
    // Return a mock signature
    return `0x${'0'.repeat(130)}`;
  }
}

/**
 * Mock provider for testing
 */
export class MockProvider {
  async getNetwork(): Promise<{ chainId: bigint; name: string }> {
    return { chainId: BigInt(1), name: 'mainnet' };
  }

  async getBlockNumber(): Promise<number> {
    return 1000000;
  }
}
