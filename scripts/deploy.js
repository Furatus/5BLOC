import hre from "hardhat";
import fs from "fs";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy RewardNFT
  const RewardNFT = await hre.ethers.getContractFactory("RewardNFT");
  const rewardNFT = await RewardNFT.deploy();
  await rewardNFT.waitForDeployment();
  const rewardNFTAddress = await rewardNFT.getAddress();
  console.log("RewardNFT deployed to:", rewardNFTAddress);

  // Deploy Roulette
  const Roulette = await hre.ethers.getContractFactory("Roulette");
  const roulette = await Roulette.deploy(rewardNFTAddress);
  await roulette.waitForDeployment();
  const rouletteAddress = await roulette.getAddress();
  console.log("Roulette deployed to:", rouletteAddress);

  // Deploy Trade
  const Trade = await hre.ethers.getContractFactory("Trade");
  const trade = await Trade.deploy(rewardNFTAddress);
  await trade.waitForDeployment();
  const tradeAddress = await trade.getAddress();
  console.log("Trade deployed to:", tradeAddress);

  // Transfer ownership
  const transferTx = await rewardNFT.transferOwnership(rouletteAddress);
  await transferTx.wait();
  console.log("Ownership transferred to Roulette");

  // Save info
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      RewardNFT: rewardNFTAddress,
      Roulette: rouletteAddress,
      Trade: tradeAddress,
    },
    config: {
      ticketPrice: hre.ethers.formatEther(await roulette.TICKET_PRICE()),
      maxInventory: (await rewardNFT.MAX_INVENTORY()).toString(),
    },
  };

  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `${deploymentsDir}/${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", filename);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment error:", error);
    process.exit(1);
  });