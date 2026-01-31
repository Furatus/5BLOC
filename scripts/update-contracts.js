import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const deploymentsDir = path.join(__dirname, '../deployments');
const files = fs.readdirSync(deploymentsDir);
const latestDeployment = files
  .filter(f => f.startsWith('localhost-'))
  .sort()
  .reverse()[0];

if (!latestDeployment) {
  console.error('Aucun déploiement trouvé');
  process.exit(1);
}

const deploymentData = JSON.parse(
  fs.readFileSync(path.join(deploymentsDir, latestDeployment), 'utf8')
);

const contractsTs = `// Auto-généré par <project-root>/scripts/update-contracts.js
export const CONTRACT_ADDRESSES = {
  RewardNFT: '${deploymentData.contracts.RewardNFT}',
  Roulette: '${deploymentData.contracts.Roulette}',
  Trade: '${deploymentData.contracts.Trade}',
};

export const NETWORK_CONFIG = {
  chainId: 31337,
  chainName: 'Hardhat Local',
  rpcUrl: 'http://localhost:8545',
  blockExplorer: '',
};

export const BetType = {
  RED: 0,
  BLACK: 1,
  EVEN: 2,
  ODD: 3,
  DOZEN_1: 4,
  DOZEN_2: 5,
  DOZEN_3: 6,
  COLUMN_1: 7,
  COLUMN_2: 8,
  COLUMN_3: 9,
  NUMBER: 10,
  ZERO: 11,
} as const;

export type BetType = typeof BetType[keyof typeof BetType];

export const PAYOUT_MULTIPLIERS = {
  RED: 2,
  BLACK: 2,
  EVEN: 2,
  ODD: 2,
  DOZEN_1: 3,
  DOZEN_2: 3,
  DOZEN_3: 3,
  COLUMN_1: 3,
  COLUMN_2: 3,
  COLUMN_3: 3,
  NUMBER: 36,
  ZERO: 36,
};
`;

const contractsPath = path.join(__dirname, '../frontend/src/config/contracts.ts');
fs.writeFileSync(contractsPath, contractsTs);

console.log('update contracts.ts ok');