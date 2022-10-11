const { network, ethers } = require("hardhat");
const { deploymentChains, networkConfig } = require("../helper-harhat-config");
const { verify } = require("../utils/verify");

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("1");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let vrfCoordinatorV2Address, subscriptionId;
  if (deploymentChains.includes(network.name)) {
    const vrfcoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorV2Address = vrfcoordinatorV2Mock.address;
    const transactionresponse = await vrfcoordinatorV2Mock.createSubscription();
    const transactionreceipt = await transactionresponse.wait(1);
    subscriptionId = transactionreceipt.events[0].args.subId;
    await vrfcoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    );
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }
  const enteranceFee = networkConfig[chainId]["enteranceFee"];
  const gasLane = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const interval = networkConfig[chainId]["interval"];
  const argument = [
    vrfCoordinatorV2Address,
    enteranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: argument,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  if (
    !deploymentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...");
    await verify(raffle.address, argument);
    log("----------------------------------------------------");
  }
};
module.exports.tags = ["all", "raffle"];
