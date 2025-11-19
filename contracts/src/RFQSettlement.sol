// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RFQSettlement
 * @notice Settlement contract for same-chain atomic swaps in the Arkiv RFQ Platform
 * @dev Implements checks-effects-interactions pattern for reentrancy protection
 *
 * Version: 1.0.0
 * Future extensibility: Reserved function slots for partial fills and escrow logic
 */
contract RFQSettlement {
    using SafeERC20 for IERC20;

    // Version constant for upgrade tracking
    string public constant VERSION = "1.0.0";

    /**
     * @notice RFQ struct matching the data model
     * @dev Fields designed to support future partial fills and escrow features
     */
    struct RFQ {
        bytes32 id;                  // Unique identifier
        address creator;             // Wallet address of RFQ creator
        address baseToken;           // Base token address
        address quoteToken;          // Quote token address
        uint256 baseAmount;          // Amount of base token
        uint256 quoteAmount;         // Amount of quote token
    }

    // Events
    /**
     * @notice Emitted when a trade is executed successfully
     * @param rfqId Unique RFQ identifier
     * @param creator Address of the RFQ creator
     * @param acceptor Address of the trade acceptor
     * @param baseToken Base token address
     * @param quoteToken Quote token address
     * @param baseAmount Amount of base token transferred
     * @param quoteAmount Amount of quote token transferred
     */
    event TradeExecuted(
        bytes32 indexed rfqId,
        address indexed creator,
        address indexed acceptor,
        address baseToken,
        address quoteToken,
        uint256 baseAmount,
        uint256 quoteAmount
    );

    /**
     * @notice Executes an atomic swap for same-chain trades
     * @dev Follows checks-effects-interactions pattern for reentrancy protection
     * @param rfq The RFQ details containing token addresses and amounts
     *
     * Requirements:
     * - Creator and acceptor addresses must not be zero
     * - Token addresses must not be zero
     * - Amounts must be greater than zero
     * - Creator must have approved this contract for baseToken
     * - Acceptor (msg.sender) must have approved this contract for quoteToken
     * - Both parties must have sufficient token balances
     */
    function executeSwap(RFQ calldata rfq) external {
        // CHECKS: Validate inputs
        require(rfq.creator != address(0), "Invalid creator address");
        require(msg.sender != address(0), "Invalid acceptor address");
        require(rfq.baseToken != address(0), "Invalid base token address");
        require(rfq.quoteToken != address(0), "Invalid quote token address");
        require(rfq.baseAmount > 0, "Base amount must be greater than zero");
        require(rfq.quoteAmount > 0, "Quote amount must be greater than zero");
        require(msg.sender != rfq.creator, "Creator cannot accept their own RFQ");

        // CHECKS: Verify allowances
        require(
            IERC20(rfq.baseToken).allowance(rfq.creator, address(this)) >= rfq.baseAmount,
            "Insufficient base token allowance from creator"
        );
        require(
            IERC20(rfq.quoteToken).allowance(msg.sender, address(this)) >= rfq.quoteAmount,
            "Insufficient quote token allowance from acceptor"
        );

        // EFFECTS: Emit event before interactions
        emit TradeExecuted(
            rfq.id,
            rfq.creator,
            msg.sender,
            rfq.baseToken,
            rfq.quoteToken,
            rfq.baseAmount,
            rfq.quoteAmount
        );

        // INTERACTIONS: Transfer tokens atomically
        // Transfer baseToken from creator to acceptor
        IERC20(rfq.baseToken).safeTransferFrom(
            rfq.creator,
            msg.sender,
            rfq.baseAmount
        );

        // Transfer quoteToken from acceptor to creator
        IERC20(rfq.quoteToken).safeTransferFrom(
            msg.sender,
            rfq.creator,
            rfq.quoteAmount
        );
    }

    /**
     * @notice Reserved function slot for future partial fill implementation
     * @dev Placeholder for extensibility - will be implemented in future versions
     */
    function executePartialFill(RFQ calldata /* rfq */, uint256 /* fillAmount */) external pure {
        revert("Partial fills not yet implemented");
    }

    /**
     * @notice Reserved function slot for future escrow-based settlement
     * @dev Placeholder for extensibility - will integrate with escrow logic later
     *
     * Future integration point: This function will coordinate with an escrow contract
     * to hold funds temporarily until both parties confirm the trade terms.
     */
    function executeEscrowedSwap(RFQ calldata /* rfq */, address /* escrowContract */) external pure {
        revert("Escrow settlement not yet implemented");
    }

    /**
     * @notice Get contract version
     * @return Version string for tracking upgrades
     */
    function getVersion() external pure returns (string memory) {
        return VERSION;
    }
}
