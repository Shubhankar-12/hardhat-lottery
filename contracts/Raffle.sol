// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "hardhat/console.sol";

// errors
error Raffle__UpkeepNotNeeded(
  uint256 currentBalance,
  uint256 numPlayers,
  uint256 raffleState
);
error Raffle__NotEnoughETHEntered();
error Raffle__TransferFailed();
error Raffle__RaffleNotOpen();

/** @title A Sample Raffle Contract
 * @author Shubh Shubhankar
 * @notice This contract is for creating untamperable decentralised smart contract
 * @dev This Implements the Chainlink VRF v2 and Chainlink keepers
 */

// contract
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
  // State Variables
  enum RaffleState {
    OPEN,
    CALCULATING
  }
  VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
  uint64 private immutable i_subscriptionId;
  bytes32 private immutable i_gasLane;
  uint32 private immutable i_callbackGasLimit;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private constant NUM_WORDS = 1;
  // Lottery variables

  uint256 private immutable i_interval;
  uint256 private immutable i_enteranceFee;
  uint256 private s_lastTimestamp;
  address private s_recentWinners;
  address payable[] private s_players;
  RaffleState private s_raffleState;

  // Events
  event RequestedRaffleWinner(uint256 indexed requestId);
  event RaffleEntered(address indexed player);
  event WinnerPicked(address indexed player);

  // functions
  constructor(
    address vrfCoordinatorV2,
    uint256 enteranceFee,
    bytes32 gasLane,
    uint64 subscriptionId,
    uint32 callbackGasLimit,
    uint256 interval
  ) VRFConsumerBaseV2(vrfCoordinatorV2) {
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
    i_gasLane = gasLane;
    i_enteranceFee = enteranceFee;
    i_subscriptionId = subscriptionId;
    i_callbackGasLimit = callbackGasLimit;
    s_raffleState = RaffleState.OPEN;
    s_lastTimestamp = block.timestamp;
    i_interval = interval;
  }

  function enterRaffle() public payable {
    if (msg.value < i_enteranceFee) {
      revert Raffle__NotEnoughETHEntered();
    }
    if (s_raffleState != RaffleState.OPEN) {
      revert Raffle__RaffleNotOpen();
    }
    s_players.push(payable(msg.sender));
    emit RaffleEntered(msg.sender);
  }

  /**
   * @dev This is the function that the Chainlink Keeper nodes call
   * they look for `upkeepNeeded` to return True.
   * the following should be true for this to return true:
   * 1. The time interval has passed between raffle runs.
   * 2. The lottery is open.
   * 3. The contract has ETH.
   * 4. Implicity, your subscription is funded with LINK.
   */
  function checkUpkeep(
    bytes memory /*checkData*/
  )
    public
    override
    returns (
      bool upkeepNeeded,
      bytes memory /* PerformData */
    )
  {
    bool isOpen = RaffleState.OPEN == s_raffleState;
    bool timePassed = ((block.timestamp - s_lastTimestamp) > i_interval);
    bool hasPlayer = s_players.length > 0;
    bool hasBalance = address(this).balance > 0;
    upkeepNeeded = (isOpen && timePassed && hasPlayer && hasBalance);
    return (upkeepNeeded, "0x0");
  }

  function performUpkeep(
    bytes calldata /*performData*/
  ) external override {
    (bool upKeepNeeded, ) = checkUpkeep("");
    if (!upKeepNeeded) {
      revert Raffle__UpkeepNotNeeded(
        address(this).balance,
        s_players.length,
        uint256(s_raffleState)
      );
    }
    s_raffleState = RaffleState.CALCULATING;
    uint256 requestId = i_vrfCoordinator.requestRandomWords(
      i_gasLane,
      i_subscriptionId,
      REQUEST_CONFIRMATIONS,
      i_callbackGasLimit,
      NUM_WORDS
    );
    emit RequestedRaffleWinner(requestId);
  }

  function fulfillRandomWords(
    uint256,
    /* requestId */
    uint256[] memory randomWords
  ) internal override {
    uint256 indexOfWinner = randomWords[0] % s_players.length;
    address payable recentWinner = s_players[indexOfWinner];
    s_recentWinners = recentWinner;
    s_players = new address payable[](0);
    s_lastTimestamp = block.timestamp;
    (bool success, ) = recentWinner.call{ value: address(this).balance }("");
    if (!success) {
      revert Raffle__TransferFailed();
    }
    s_raffleState = RaffleState.OPEN;
    emit WinnerPicked(recentWinner);
  }

  // View / Pure fns
  function getPlayer(uint256 index) public view returns (address) {
    return s_players[index];
  }

  function getEnteranceFee() public view returns (uint256) {
    return i_enteranceFee;
  }

  function getRecentWinner() public view returns (address) {
    return s_recentWinners;
  }

  function getNumWords() public pure returns (uint256) {
    return NUM_WORDS;
  }

  function getNumOfPlayers() public view returns (uint256) {
    return s_players.length;
  }

  function getLatestTimeStamp() public view returns (uint256) {
    return s_lastTimestamp;
  }

  function getRaffleState() public view returns (RaffleState) {
    return s_raffleState;
  }

  function getInterval() public view returns (uint256) {
    return i_interval;
  }

  function getSubscriptionId() public view returns (uint64) {
    return i_subscriptionId;
  }
}
