const { assert } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { deploymentChains } = require("../../helper-harhat-config");

!deploymentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit tests", async function () {
      let raffle, vrfcoordinatorV2Mock;
      beforeEach(async function () {
        const { deployer } = await getNamedAccounts();
        await deployments.fixture(["all"]);
        raffle = await ethers.getContract("Raffle", deployer);
        vrfcoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatonV2Mock",
          deployer
        );
      });
      describe("constructor", async () => {
        it("Intializes the Raffle correctly", async () => {
          const raffleState = await raffle.getRaffleState();
          assert.equal(raffleState.toString(), "0");
        });
      });
    });
