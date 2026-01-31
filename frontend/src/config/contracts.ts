// Auto-généré par deploy.js
export const CONTRACT_ADDRESSES = {
  RewardNFT: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  Roulette: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  Trade: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
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
