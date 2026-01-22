
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import web3Service from './ethersService';
import RewardNFTABI from '../abi/RewardNFT.json';

export interface NFTMetadata {
  tokenId: number;
  name: string;
  rewardType: number;
  rewardTypeName: string;
  ipfsHash: string;
  imageUrl: string;
  createdAt: number;
  owner: string;
}

class NFTService {
  private readonly REWARD_TYPES = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'];

  private getContract(): ethers.Contract {
    const provider = web3Service.getProvider();
    return new ethers.Contract(CONTRACT_ADDRESSES.RewardNFT, RewardNFTABI.abi, provider);
  }

  async getUserNFTs(address: string): Promise<NFTMetadata[]> {
    const contract = this.getContract();
    const balance = await contract.balanceOf(address);
    const nfts: NFTMetadata[] = [];

    for (let i = 0; i < Number(balance); i++) {
      try {
        const tokenId = await contract.tokenOfOwnerByIndex(address, i);
        const metadata = await contract.getTokenMetadata(tokenId);

        nfts.push({
          tokenId: Number(tokenId),
          name: metadata.name,
          rewardType: metadata.rewardType,
          rewardTypeName: this.REWARD_TYPES[metadata.rewardType],
          ipfsHash: metadata.ipfsHash,
          imageUrl: `https://ipfs.io/ipfs/${metadata.ipfsHash}`,
          createdAt: Number(metadata.createdAt),
          owner: address,
        });
      } catch (error) {
        console.error(`Erreur récupération NFT ${i}:`, error);
      }
    }

    return nfts;
  }

  async getInventoryStatus(address: string): Promise<{
    current: number;
    max: number;
    canReceive: boolean;
    percentage: number;
  }> {
    const contract = this.getContract();

    const count = await contract.getInventoryCount(address);
    const maxInventory = await contract.MAX_INVENTORY();
    const canReceive = await contract.canReceiveReward(address);

    return {
      current: Number(count),
      max: Number(maxInventory),
      canReceive,
      percentage: (Number(count) / Number(maxInventory)) * 100,
    };
  }
}

export default new NFTService();