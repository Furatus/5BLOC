import { ethers, Contract } from "ethers";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import web3Service from "./ethersService";
import RewardNFTABI from "../abi/RewardNFT.json";

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
  private readonly REWARD_TYPES = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

  private getContract(): Contract {
    const provider = web3Service.getProvider();
    return new ethers.Contract(
      CONTRACT_ADDRESSES.RewardNFT,
      RewardNFTABI.abi,
      provider,
    );
  }

  async getUserNFTs(address: string): Promise<NFTMetadata[]> {
    const contract = this.getContract();

    

    try {
      const filterReceived = contract.filters.Transfer(null, address);
      const eventsReceived = await contract.queryFilter(
        filterReceived,
        0,
        "latest",
      );

      const filterSent = contract.filters.Transfer(address, null);
      const eventsSent = await contract.queryFilter(filterSent, 0, "latest");

      const receivedTokens = new Set<number>();
      for (const event of eventsReceived) {
        if ("args" in event && event.args) {
          receivedTokens.add(Number(event.args.tokenId));
        }
      }

      for (const event of eventsSent) {
        if ("args" in event && event.args) {
          receivedTokens.delete(Number(event.args.tokenId));
        }
      }

      

      const nfts: NFTMetadata[] = [];

      for (const tokenId of receivedTokens) {
        try {
          const owner = await contract.ownerOf(tokenId);

          if (owner.toLowerCase() === address.toLowerCase()) {
            const metadata = await contract.getTokenMetadata(tokenId);

            nfts.push({
              tokenId,
              name: metadata.name,
              rewardType: Number(metadata.rewardType),
              rewardTypeName: this.REWARD_TYPES[Number(metadata.rewardType)],
              ipfsHash: metadata.ipfsHash,
              imageUrl: `https://ipfs.io/ipfs/${metadata.ipfsHash}`,
              createdAt: Number(metadata.createdAt),
              owner: address,
            });

            
          }
        } catch (error) {
          
        }
      }

      

      return nfts;
    } catch (error) {
      console.error("Erreur lors de la récupération des NFTs:", error);
      return [];
    }
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

    const currentNum = Number(count);
    const maxNum = Number(maxInventory);

    return {
      current: currentNum,
      max: maxNum,
      canReceive,
      percentage: maxNum > 0 ? (currentNum / maxNum) * 100 : 0,
    };
  }

  async getNFTMetadata(tokenId: number): Promise<NFTMetadata> {
    const contract = this.getContract();
    const metadata = await contract.getTokenMetadata(tokenId);
    const owner = await contract.ownerOf(tokenId);

    return {
      tokenId,
      name: metadata.name,
      rewardType: Number(metadata.rewardType),
      rewardTypeName: this.REWARD_TYPES[Number(metadata.rewardType)],
      ipfsHash: metadata.ipfsHash,
      imageUrl: `https://ipfs.io/ipfs/${metadata.ipfsHash}`,
      createdAt: Number(metadata.createdAt),
      owner,
    };
  }

  async ownsNFT(address: string, tokenId: number): Promise<boolean> {
    try {
      const contract = this.getContract();
      const owner = await contract.ownerOf(tokenId);
      return owner.toLowerCase() === address.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  async getTotalSupply(): Promise<number> {
    const contract = this.getContract();

    const filter = contract.filters.Transfer(ethers.ZeroAddress, null);
    const events = await contract.queryFilter(filter, 0, "latest");

    return events.length;
  }

  async approveTradeContract(tokenId: number): Promise<string> {
    try {
      const signer = await web3Service.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.RewardNFT,
        RewardNFTABI.abi,
        signer,
      );

      const tradeContractAddress = CONTRACT_ADDRESSES.Trade;

      if (!tradeContractAddress) {
        throw new Error("Trade contract address not configured");
      }

      const tx = await contract.approve(tradeContractAddress, tokenId);
      

      const receipt = await tx.wait();
      

      return receipt.hash;
    } catch (error: any) {
      console.error("Error approving NFT for trade:", error);
      throw new Error(error.message || "Failed to approve NFT for trading");
    }
  }

  async setApprovalForAll(approved: boolean): Promise<string> {
    try {
      const signer = await web3Service.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.RewardNFT,
        RewardNFTABI.abi,
        signer,
      );

      const tradeContractAddress = CONTRACT_ADDRESSES.Trade;

      if (!tradeContractAddress) {
        throw new Error("Trade contract address not configured");
      }

      

      const tx = await contract.setApprovalForAll(
        tradeContractAddress,
        approved,
      );
      

      const receipt = await tx.wait();
      

      return receipt.hash;
    } catch (error: any) {
      console.error("Error setting approval for all:", error);
      throw new Error(error.message || "Failed to set approval for all");
    }
  }

  async isApprovedForTrading(tokenId: number): Promise<boolean> {
    try {
      const contract = this.getContract();
      const approved = await contract.getApproved(tokenId);
      const isApproved =
        approved.toLowerCase() === CONTRACT_ADDRESSES.Trade.toLowerCase();

      

      return isApproved;
    } catch (error) {
      console.error("Error checking approval:", error);
      return false;
    }
  }
}

export default new NFTService();
