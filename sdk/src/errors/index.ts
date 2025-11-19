/**
 * Base error class for SDK errors
 */
export class ArkivRFQError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArkivRFQError';
    Object.setPrototypeOf(this, ArkivRFQError.prototype);
  }
}

/**
 * Error for network and Arkiv connection issues
 */
export class ArkivNetworkError extends ArkivRFQError {
  constructor(message: string, public readonly originalError?: unknown) {
    super(`Network error: ${message}`);
    this.name = 'ArkivNetworkError';
    Object.setPrototypeOf(this, ArkivNetworkError.prototype);
  }
}

/**
 * Error for wallet signature issues
 */
export class SignatureError extends ArkivRFQError {
  constructor(message: string, public readonly originalError?: unknown) {
    super(`Signature error: ${message}`);
    this.name = 'SignatureError';
    Object.setPrototypeOf(this, SignatureError.prototype);
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends ArkivRFQError {
  constructor(message: string) {
    super(`Validation error: ${message}`);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error for ownership/permission issues
 */
export class OwnershipError extends ArkivRFQError {
  constructor(message: string) {
    super(`Ownership error: ${message}`);
    this.name = 'OwnershipError';
    Object.setPrototypeOf(this, OwnershipError.prototype);
  }
}

/**
 * Error for RFQ not found
 */
export class RFQNotFoundError extends ArkivRFQError {
  constructor(id: string) {
    super(`RFQ not found with id: ${id}`);
    this.name = 'RFQNotFoundError';
    Object.setPrototypeOf(this, RFQNotFoundError.prototype);
  }
}
