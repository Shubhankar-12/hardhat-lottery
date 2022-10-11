const { network, ethers } = require("hardhat");
const { deploymentChains } = require("../helper-harhat-config");
const BASE_FEE = ethers.utils.parseEther("0.25");
const GAS_PRICE_LINK = 1e9;
// const chainId = network.config.chainId;
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const args = [BASE_FEE, GAS_PRICE_LINK];
  if (deploymentChains.includes(network.name)) {
    console.log("local network detected. Deploying mocks...");
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      logs: true,
      args: args,
    });
    log("Mock deployed...");
    log("-------------------------------------------------------------------");
  }
};
module.exports.tags = ["all", "mocks"];
