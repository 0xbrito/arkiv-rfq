// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RFQSettlement.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing
 */
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title RFQSettlementTest
 * @notice Test suite for RFQSettlement contract
 * @dev Focuses on critical behaviors: atomic swaps, validation, and revert scenarios
 */
contract RFQSettlementTest is Test {
    RFQSettlement public settlement;
    MockERC20 public baseToken;
    MockERC20 public quoteToken;

    address public creator;
    address public acceptor;

    function setUp() public {
        // Deploy settlement contract
        settlement = new RFQSettlement();

        // Deploy mock tokens
        baseToken = new MockERC20("Base Token", "BASE");
        quoteToken = new MockERC20("Quote Token", "QUOTE");

        // Set up test accounts
        creator = makeAddr("creator");
        acceptor = makeAddr("acceptor");

        // Mint tokens to creator and acceptor
        baseToken.mint(creator, 1000 * 10 ** 18);
        quoteToken.mint(acceptor, 2000 * 10 ** 18);
    }

    /**
     * @notice Test 1: Successful atomic swap execution
     * @dev Verifies tokens are transferred correctly between creator and acceptor
     */
    function test_ExecuteSwap_Success() public {
        // Arrange
        uint256 baseAmount = 100 * 10 ** 18;
        uint256 quoteAmount = 200 * 10 ** 18;

        RFQSettlement.RFQ memory rfq = RFQSettlement.RFQ({
            id: keccak256("test-rfq-1"),
            creator: creator,
            baseToken: address(baseToken),
            quoteToken: address(quoteToken),
            baseAmount: baseAmount,
            quoteAmount: quoteAmount
        });

        // Approve tokens
        vm.prank(creator);
        baseToken.approve(address(settlement), baseAmount);

        vm.prank(acceptor);
        quoteToken.approve(address(settlement), quoteAmount);

        // Record initial balances
        uint256 creatorBaseBalanceBefore = baseToken.balanceOf(creator);
        uint256 creatorQuoteBalanceBefore = quoteToken.balanceOf(creator);
        uint256 acceptorBaseBalanceBefore = baseToken.balanceOf(acceptor);
        uint256 acceptorQuoteBalanceBefore = quoteToken.balanceOf(acceptor);

        // Act: Execute swap
        vm.prank(acceptor);
        settlement.executeSwap(rfq);

        // Assert: Verify balances changed correctly
        assertEq(
            baseToken.balanceOf(creator),
            creatorBaseBalanceBefore - baseAmount,
            "Creator base token balance incorrect"
        );
        assertEq(
            quoteToken.balanceOf(creator),
            creatorQuoteBalanceBefore + quoteAmount,
            "Creator quote token balance incorrect"
        );
        assertEq(
            baseToken.balanceOf(acceptor),
            acceptorBaseBalanceBefore + baseAmount,
            "Acceptor base token balance incorrect"
        );
        assertEq(
            quoteToken.balanceOf(acceptor),
            acceptorQuoteBalanceBefore - quoteAmount,
            "Acceptor quote token balance incorrect"
        );
    }

    /**
     * @notice Test 2: Event emission on successful swap
     * @dev Verifies TradeExecuted event emits with correct parameters
     */
    function test_ExecuteSwap_EmitsEvent() public {
        // Arrange
        uint256 baseAmount = 50 * 10 ** 18;
        uint256 quoteAmount = 100 * 10 ** 18;

        RFQSettlement.RFQ memory rfq = RFQSettlement.RFQ({
            id: keccak256("test-rfq-2"),
            creator: creator,
            baseToken: address(baseToken),
            quoteToken: address(quoteToken),
            baseAmount: baseAmount,
            quoteAmount: quoteAmount
        });

        // Approve tokens
        vm.prank(creator);
        baseToken.approve(address(settlement), baseAmount);

        vm.prank(acceptor);
        quoteToken.approve(address(settlement), quoteAmount);

        // Expect event to be emitted
        vm.expectEmit(true, true, true, true);
        emit RFQSettlement.TradeExecuted(
            rfq.id,
            creator,
            acceptor,
            address(baseToken),
            address(quoteToken),
            baseAmount,
            quoteAmount
        );

        // Act: Execute swap
        vm.prank(acceptor);
        settlement.executeSwap(rfq);
    }

    /**
     * @notice Test 3: Revert when creator has insufficient balance
     * @dev Ensures transaction reverts if creator doesn't have enough base tokens
     */
    function test_ExecuteSwap_RevertsOnInsufficientCreatorBalance() public {
        // Arrange: Create RFQ with more tokens than creator has
        uint256 baseAmount = 2000 * 10 ** 18; // Creator only has 1000
        uint256 quoteAmount = 200 * 10 ** 18;

        RFQSettlement.RFQ memory rfq = RFQSettlement.RFQ({
            id: keccak256("test-rfq-3"),
            creator: creator,
            baseToken: address(baseToken),
            quoteToken: address(quoteToken),
            baseAmount: baseAmount,
            quoteAmount: quoteAmount
        });

        // Approve tokens (even though balance is insufficient)
        vm.prank(creator);
        baseToken.approve(address(settlement), baseAmount);

        vm.prank(acceptor);
        quoteToken.approve(address(settlement), quoteAmount);

        // Act & Assert: Expect revert due to insufficient balance
        vm.prank(acceptor);
        vm.expectRevert(); // ERC20 will revert with "ERC20: transfer amount exceeds balance"
        settlement.executeSwap(rfq);
    }

    /**
     * @notice Test 4: Revert when acceptor has insufficient allowance
     * @dev Ensures transaction reverts if acceptor hasn't approved enough tokens
     */
    function test_ExecuteSwap_RevertsOnInsufficientAcceptorAllowance() public {
        // Arrange
        uint256 baseAmount = 100 * 10 ** 18;
        uint256 quoteAmount = 200 * 10 ** 18;

        RFQSettlement.RFQ memory rfq = RFQSettlement.RFQ({
            id: keccak256("test-rfq-4"),
            creator: creator,
            baseToken: address(baseToken),
            quoteToken: address(quoteToken),
            baseAmount: baseAmount,
            quoteAmount: quoteAmount
        });

        // Creator approves, but acceptor does NOT approve
        vm.prank(creator);
        baseToken.approve(address(settlement), baseAmount);

        // Act & Assert: Expect revert due to insufficient allowance
        vm.prank(acceptor);
        vm.expectRevert("Insufficient quote token allowance from acceptor");
        settlement.executeSwap(rfq);
    }

    /**
     * @notice Test 5: Revert on zero amounts
     * @dev Validates that zero amounts are rejected
     */
    function test_ExecuteSwap_RevertsOnZeroBaseAmount() public {
        // Arrange
        RFQSettlement.RFQ memory rfq = RFQSettlement.RFQ({
            id: keccak256("test-rfq-5"),
            creator: creator,
            baseToken: address(baseToken),
            quoteToken: address(quoteToken),
            baseAmount: 0, // Invalid: zero amount
            quoteAmount: 200 * 10 ** 18
        });

        // Act & Assert: Expect revert
        vm.prank(acceptor);
        vm.expectRevert("Base amount must be greater than zero");
        settlement.executeSwap(rfq);
    }

    /**
     * @notice Test 6: Revert on zero addresses
     * @dev Validates that zero addresses are rejected
     */
    function test_ExecuteSwap_RevertsOnZeroTokenAddress() public {
        // Arrange
        RFQSettlement.RFQ memory rfq = RFQSettlement.RFQ({
            id: keccak256("test-rfq-6"),
            creator: creator,
            baseToken: address(0), // Invalid: zero address
            quoteToken: address(quoteToken),
            baseAmount: 100 * 10 ** 18,
            quoteAmount: 200 * 10 ** 18
        });

        // Act & Assert: Expect revert
        vm.prank(acceptor);
        vm.expectRevert("Invalid base token address");
        settlement.executeSwap(rfq);
    }

    /**
     * @notice Test 7: Revert when creator tries to accept their own RFQ
     * @dev Ensures creator cannot be both sides of a trade
     */
    function test_ExecuteSwap_RevertsWhenCreatorIsAcceptor() public {
        // Arrange
        uint256 baseAmount = 100 * 10 ** 18;
        uint256 quoteAmount = 200 * 10 ** 18;

        RFQSettlement.RFQ memory rfq = RFQSettlement.RFQ({
            id: keccak256("test-rfq-7"),
            creator: creator,
            baseToken: address(baseToken),
            quoteToken: address(quoteToken),
            baseAmount: baseAmount,
            quoteAmount: quoteAmount
        });

        // Approve tokens
        vm.prank(creator);
        baseToken.approve(address(settlement), baseAmount);
        vm.prank(creator);
        quoteToken.approve(address(settlement), quoteAmount);

        // Act & Assert: Creator tries to accept their own RFQ
        vm.prank(creator);
        vm.expectRevert("Creator cannot accept their own RFQ");
        settlement.executeSwap(rfq);
    }

    /**
     * @notice Test 8: Verify version constant
     * @dev Ensures version tracking is available for upgrades
     */
    function test_GetVersion() public view {
        string memory version = settlement.getVersion();
        assertEq(version, "1.0.0", "Version should be 1.0.0");
    }
}