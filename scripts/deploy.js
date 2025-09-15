const hre = require("hardhat");
const fs = require('fs');
require('dotenv').config();

async function main() {
    console.log("🚀 Deploying WildWest Dice Game Contract...");
    
    // Get the WildWest token address (you'll need to provide this)
    const WILDWEST_TOKEN_ADDRESS = process.env.WILDWEST_TOKEN_ADDRESS;
    
    if (!WILDWEST_TOKEN_ADDRESS) {
        console.error("❌ Please set WILDWEST_TOKEN_ADDRESS in your .env file");
        process.exit(1);
    }
    
    console.log(`📍 WildWest Token Address: ${WILDWEST_TOKEN_ADDRESS}`);
    console.log(`🌐 Network: ${hre.network.name}`);
    
    // Get the contract factory
    const DiceGameEscrow = await hre.ethers.getContractFactory("DiceGameEscrow");
    
    // Estimate deployment cost
    const deployTx = DiceGameEscrow.getDeployTransaction(WILDWEST_TOKEN_ADDRESS);
    const estimatedGas = await hre.ethers.provider.estimateGas(deployTx);
    const feeData = await hre.ethers.provider.getFeeData();
    const estimatedCost = estimatedGas * feeData.gasPrice;
    
    console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);
    console.log(`💰 Estimated cost: ${hre.ethers.utils.formatEther(estimatedCost)} ETH`);
    
    // Deploy the contract
    console.log("📤 Deploying contract...");
    const diceGameEscrow = await DiceGameEscrow.deploy(WILDWEST_TOKEN_ADDRESS);
    
    // Wait for deployment
    console.log("⏳ Waiting for deployment confirmation...");
    await diceGameEscrow.deployed();
    
    const contractAddress = diceGameEscrow.address;
    console.log(`✅ DiceGameEscrow deployed to: ${contractAddress}`);
    
    // Verify deployment
    console.log("🔍 Verifying deployment...");
    const deployedToken = await diceGameEscrow.wildWestToken();
    const taxWallet = await diceGameEscrow.TAX_WALLET();
    const taxRate = await diceGameEscrow.TAX_RATE();
    
    console.log(`✅ Token address verified: ${deployedToken}`);
    console.log(`✅ Tax wallet verified: ${taxWallet}`);
    console.log(`✅ Tax rate verified: ${taxRate} basis points (${Number(taxRate) / 100}%)`);
    
    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        contractAddress: contractAddress,
        wildWestTokenAddress: WILDWEST_TOKEN_ADDRESS,
        taxWallet: taxWallet,
        taxRate: Number(taxRate),
        deploymentTime: new Date().toISOString(),
        txHash: diceGameEscrow.deploymentTransaction().hash,
        blockNumber: (await diceGameEscrow.deploymentTransaction().wait()).blockNumber
    };
    
    // Write deployment info to file
    const deploymentFile = `deployments/${hre.network.name}.json`;
    fs.mkdirSync('deployments', { recursive: true });
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`📄 Deployment info saved to: ${deploymentFile}`);
    
    // Update .env file
    const envUpdate = `
# Deployment info for ${hre.network.name}
CONTRACT_ADDRESS=${contractAddress}
WILDWEST_TOKEN_ADDRESS=${WILDWEST_TOKEN_ADDRESS}
NETWORK=${hre.network.name}
`;
    
    fs.appendFileSync('.env', envUpdate);
    console.log("✅ Environment variables updated");
    
    // Contract verification (if on a supported network)
    if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
        console.log("⏳ Waiting 30 seconds before verification...");
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        try {
            console.log("🔍 Verifying contract on block explorer...");
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [WILDWEST_TOKEN_ADDRESS],
            });
            console.log("✅ Contract verified successfully");
        } catch (error) {
            console.log("⚠️ Contract verification failed (this is optional):", error.message);
        }
    }
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Update your Telegram bot with the contract address");
    console.log("2. Fund your bot wallet with ETH for gas fees");
    console.log("3. Test the contract with small amounts first");
    console.log("4. Start your Telegram bot with: npm start");
    
    console.log(`\n🔗 View contract on explorer:`);
    const explorerUrl = hre.network.name === 'base' ? 
        `https://basescan.org/address/${contractAddress}` : 
        `https://sepolia.basescan.org/address/${contractAddress}`;
    console.log(explorerUrl);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });