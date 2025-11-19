import { ValidationError } from '../errors/index.js';
import type { CreateRFQInput, TokenInfo } from '../types/RFQ.js';

/**
 * Validate Ethereum address format
 */
export function validateAddress(address: string, fieldName: string): void {
  if (!address || typeof address !== 'string') {
    throw new ValidationError(`${fieldName} is required and must be a string`);
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new ValidationError(`${fieldName} must be a valid Ethereum address`);
  }
}

/**
 * Validate token info
 */
export function validateTokenInfo(token: TokenInfo, fieldName: string): void {
  if (!token || typeof token !== 'object') {
    throw new ValidationError(`${fieldName} is required and must be an object`);
  }

  validateAddress(token.address, `${fieldName}.address`);

  if (!Number.isInteger(token.chainId) || token.chainId <= 0) {
    throw new ValidationError(`${fieldName}.chainId must be a positive integer`);
  }
}

/**
 * Validate amount string
 */
export function validateAmount(amount: string, fieldName: string): void {
  if (!amount || typeof amount !== 'string') {
    throw new ValidationError(`${fieldName} is required and must be a string`);
  }

  if (!/^\d+$/.test(amount)) {
    throw new ValidationError(`${fieldName} must be a valid positive integer string`);
  }

  if (amount === '0') {
    throw new ValidationError(`${fieldName} must be greater than zero`);
  }
}

/**
 * Validate expiration timestamp
 */
export function validateExpiration(expiresIn: number): void {
  if (!Number.isInteger(expiresIn) || expiresIn <= 0) {
    throw new ValidationError('expiresIn must be a positive integer timestamp');
  }

  const now = Math.floor(Date.now() / 1000);
  if (expiresIn <= now) {
    throw new ValidationError('expiresIn must be in the future');
  }

  // Max expiration: 30 days from now
  const maxExpiration = now + 30 * 24 * 60 * 60;
  if (expiresIn > maxExpiration) {
    throw new ValidationError('expiresIn cannot be more than 30 days in the future');
  }
}

/**
 * Validate create RFQ input
 */
export function validateCreateRFQInput(input: CreateRFQInput): void {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('RFQ input is required and must be an object');
  }

  validateTokenInfo(input.baseToken, 'baseToken');
  validateTokenInfo(input.quoteToken, 'quoteToken');
  validateAmount(input.baseAmount, 'baseAmount');
  validateAmount(input.quoteAmount, 'quoteAmount');
  validateExpiration(input.expiresIn);

  // Validate optional fields
  if (input.minFillAmount !== undefined) {
    validateAmount(input.minFillAmount, 'minFillAmount');
  }

  if (input.counterpartyRestrictions !== undefined) {
    if (!Array.isArray(input.counterpartyRestrictions)) {
      throw new ValidationError('counterpartyRestrictions must be an array');
    }
    input.counterpartyRestrictions.forEach((address, index) => {
      validateAddress(address, `counterpartyRestrictions[${index}]`);
    });
  }
}

/**
 * Validate RFQ ID
 */
export function validateRFQId(id: string): void {
  if (!id || typeof id !== 'string') {
    throw new ValidationError('RFQ ID is required and must be a string');
  }

  if (id.trim().length === 0) {
    throw new ValidationError('RFQ ID cannot be empty');
  }
}
