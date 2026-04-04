import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.19",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        // Local development network
        hardhat: {
            chainId: 31337,
            accounts: {
                count: 20,
                accountsBalance: "10000000000000000000000", // 10,000 ETH
            },
        },
        // Local node for testing
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
        },
        // Sepolia testnet
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || "",
            accounts: process.env.SEPOLIA_PRIVATE_KEY && process.env.SEPOLIA_PRIVATE_KEY.length === 66 ? [process.env.SEPOLIA_PRIVATE_KEY] : [],
            chainId: 11155111,
            gasPrice: "auto",
        },
        // Goerli testnet (backup)
        goerli: {
            url: process.env.GOERLI_RPC_URL || "",
            accounts: process.env.GOERLI_PRIVATE_KEY && process.env.GOERLI_PRIVATE_KEY.length === 66 ? [process.env.GOERLI_PRIVATE_KEY] : [],
            chainId: 5,
            gasPrice: "auto",
        },
        // Ethereum mainnet
        mainnet: {
            url: process.env.MAINNET_RPC_URL || "",
            accounts: process.env.MAINNET_PRIVATE_KEY && process.env.MAINNET_PRIVATE_KEY.length === 66 ? [process.env.MAINNET_PRIVATE_KEY] : [],
            chainId: 1,
            gasPrice: "auto",
        },
        // Polygon mainnet
        polygon: {
            url: process.env.POLYGON_RPC_URL || "",
            accounts: process.env.POLYGON_PRIVATE_KEY && process.env.POLYGON_PRIVATE_KEY.length === 66 ? [process.env.POLYGON_PRIVATE_KEY] : [],
            chainId: 137,
            gasPrice: "auto",
        },
        // Polygon Mumbai testnet
        mumbai: {
            url: process.env.MUMBAI_RPC_URL || "",
            accounts: process.env.MUMBAI_PRIVATE_KEY && process.env.MUMBAI_PRIVATE_KEY.length === 66 ? [process.env.MUMBAI_PRIVATE_KEY] : [],
            chainId: 80001,
            gasPrice: "auto",
        },
    },
    etherscan: {
        apiKey: {
            mainnet: process.env.ETHERSCAN_API_KEY || "",
            sepolia: process.env.ETHERSCAN_API_KEY || "",
            goerli: process.env.ETHERSCAN_API_KEY || "",
            polygon: process.env.POLYGONSCAN_API_KEY || "",
            polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
        },
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS !== undefined,
        currency: "USD",
        gasPrice: 21,
        coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },
    typechain: {
        outDir: "types",
        target: "ethers-v5",
        alwaysGenerateOverloads: false,
        externalArtifacts: ["externalArtifacts/*.json"],
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    mocha: {
        timeout: 40000,
    },
};

export default config;