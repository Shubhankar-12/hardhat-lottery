const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  deploymentChains,
  networkConfig,
} = require("../../helper-harhat-config");

!deploymentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit tests", async function () {
      let raffle, vrfcoordinatorV2Mock, enteranceFee, deployer, interval;
      const chainId = network.config.chainId;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        raffle = await ethers.getContract("Raffle", deployer);
        vrfcoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        const subscriptionId = await raffle.getSubscriptionId();
        await vrfcoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
        enteranceFee = await raffle.getEnteranceFee();
        interval = await raffle.getInterval();
      });
      describe("constructor", async () => {
        it("Intializes the Raffle correctly", async () => {
          const raffleState = await raffle.getRaffleState();
          assert.equal(raffleState.toString(), "0");
          assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
        });
      });
      describe("enterRaffle", async () => {
        it("reverts when you don't pay enough", async () => {
          await expect(raffle.enterRaffle()).to.be.revertedWith(
            "Raffle__NotEnoughETHEntered"
          );
        });
        it("records player when they entered", async () => {
          await raffle.enterRaffle({ value: enteranceFee });
          const playerFromContract = await raffle.getPlayer(0);
          assert.equal(playerFromContract, deployer);
        });
        it("emits event on enter", async () => {
          await expect(raffle.enterRaffle({ value: enteranceFee })).to.emit(
            raffle,
            "RaffleEntered"
          );
        });
        it("doesn't allow enterance when raffle is calculating", async () => {
          await raffle.enterRaffle({ value: enteranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          //   We pretend to be chainlink
          await raffle.performUpkeep([]);
          await expect(
            raffle.enterRaffle({ value: enteranceFee })
          ).to.be.revertedWith("Raffle__RaffleNotOpen");
        });
      });
      describe("checkUpKeep", async () => {
        it("return false if people doesn't sent any ETH", async () => {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
          assert(!upkeepNeeded);
        });
      });
    });
