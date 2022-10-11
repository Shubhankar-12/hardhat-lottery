const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");

const { deploymentChains } = require("../../helper-harhat-config");

deploymentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Staging tests", function () {
      let raffle, enteranceFee, deployer;
      //   const chainId = network.config.chainId;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        raffle = await ethers.getContract("Raffle", deployer);
        enteranceFee = await raffle.getEnteranceFee();
        interval = await raffle.getInterval();
      });
      describe("fulfillRandomWords", () => {
        it("works with live Chainlink VRF, We get a random winner", async () => {
          console.log("Setting up test...");
          const startTimeStamp = await raffle.getLatestTimeStamp();
          const accounts = await ethers.getSigners();
          console.log("Setting up listner...");
          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");

              try {
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const winnerBalance = await accounts[0].getBalance();
                const endingTimeStamp = await raffle.getLatestTimeStamp();

                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(raffleState.toString(), "0");
                assert.equal(
                  winnerBalance.toString(),
                  winnerStartBalance.add(enteranceFee).toString()
                );
                assert(endingTimeStamp > startTimeStamp);
                resolve();
              } catch (err) {
                console.log(err);
                reject(err);
              }
              console.log("Entering Raffle...");

              const tx = await raffle.enterRaffle({ value: enteranceFee });
              await tx.wait(1);
              console.log("Ok, time to wait...");
              const winnerStartBalance = await accounts[0].getBalance();
            });
          });
        });
      });
    });
