import { ethers, Contract } from "ethers";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import web3Service from "./ethersService";
import TradeABI from "../abi/Trade.json";

export interface TradeOffer {
  offerId: number;
  creator: string;
  target: string;
  creatorNFT: number;
  requestedNFT: number;
  isActive: boolean;
  createdAt: number;
}

export interface TradeCooldownInfo {
  isActive: boolean;
  remainingSeconds: number;
}

class TradeService {
  private getContract(): Contract {
    const provider = web3Service.getProvider();
    const abi = Array.isArray(TradeABI) ? TradeABI : (TradeABI as any).abi;

    if (!abi) {
      throw new Error("Trade ABI not found");
    }

    return new ethers.Contract(CONTRACT_ADDRESSES.Trade, abi, provider);
  }

  private async getContractWithSigner(): Promise<Contract> {
    const signer = await web3Service.getSigner();
    const abi = Array.isArray(TradeABI) ? TradeABI : (TradeABI as any).abi;

    if (!abi) {
      throw new Error("Trade ABI not found");
    }

    return new ethers.Contract(CONTRACT_ADDRESSES.Trade, abi, signer);
  }

  async getCooldownInfo(userAddress: string): Promise<TradeCooldownInfo> {
    const contract = this.getContract();
    
    try {
      const remainingSeconds = await contract.getCooldownRemaining(userAddress);
      
      return {
        isActive: Number(remainingSeconds) > 0,
        remainingSeconds: Number(remainingSeconds),
      };
    } catch (error) {
      console.error("Erreur getCooldownInfo Trade:", error);
      return {
        isActive: false,
        remainingSeconds: 0,
      };
    }
  }

  async createOffer(
    creatorNFT: number,
    requestedNFT: number,
    targetOwner?: string,
  ): Promise<number> {
    const contract = await this.getContractWithSigner();

    let ownerAddress = targetOwner;
    if (!ownerAddress) {
      const nftContract = new ethers.Contract(
        CONTRACT_ADDRESSES.RewardNFT,
        ["function ownerOf(uint256) view returns (address)"],
        web3Service.getProvider(),
      );
      ownerAddress = await nftContract.ownerOf(requestedNFT);
    }

    const tx = await contract.proposeSwap(
      creatorNFT,
      requestedNFT,
      ownerAddress,
    );

    const receipt = await tx.wait();

    const event = receipt.logs?.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "SwapProposed";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = contract.interface.parseLog(event);
      return Number(parsed?.args?.swapId);
    }

    return 0;
  }

  async acceptOffer(offerId: number): Promise<string> {
    const contract = await this.getContractWithSigner();

    const tx = await contract.acceptSwap(offerId);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  async cancelOffer(offerId: number): Promise<string> {
    const contract = await this.getContractWithSigner();

    const tx = await contract.cancelSwap(offerId);
    const receipt = await tx.wait();

    return receipt.hash;
  }

  async getOffer(offerId: number): Promise<TradeOffer | null> {
    try {
      const contract = this.getContract();
      const swap = await contract.getSwap(offerId);

      if (swap.proposer === ethers.ZeroAddress) {
        return null;
      }

      const offer = {
        offerId,
        creator: swap.proposer,
        target: swap.target,
        creatorNFT: Number(swap.proposerTokenId),
        requestedNFT: Number(swap.targetTokenId),
        isActive: Number(swap.status) === 0, // PENDING = 0
        createdAt: Number(swap.createdAt),
      };

      return offer;
    } catch (error) {
      console.error("Erreur getOffer:", error);
      return null;
    }
  }

  async getActiveOffers(): Promise<TradeOffer[]> {
    const contract = this.getContract();

    try {
      const filterCreated = contract.filters.SwapProposed();
      const eventsCreated = await contract.queryFilter(
        filterCreated,
        0,
        "latest",
      );

      const offers: TradeOffer[] = [];

      for (const event of eventsCreated) {
        try {
          const parsed = contract.interface.parseLog({
            topics: [...event.topics],
            data: event.data,
          });

          if (parsed) {
            const offerId = Number(parsed.args.swapId);
            const offer = await this.getOffer(offerId);

            if (offer && offer.isActive) {
              offers.push(offer);
            }
          }
        } catch (error) {
          console.error("Erreur parsing event:", error);
        }
      }

      return offers;
    } catch (error) {
      console.error("Erreur getActiveOffers:", error);
      return [];
    }
  }

  async getUserOffers(userAddress: string): Promise<TradeOffer[]> {
    const contract = this.getContract();

    try {
      const swapIds = await contract.getProposerSwaps(userAddress);
      const offers: TradeOffer[] = [];

      for (const swapId of swapIds) {
        const offer = await this.getOffer(Number(swapId));

        if (offer) {
          offers.push(offer);
        }
      }

      return offers;
    } catch (error) {
      console.error("Erreur getUserOffers:", error);
      return [];
    }
  }

  async getReceivedOffers(userAddress: string): Promise<TradeOffer[]> {
    const contract = this.getContract();

    try {
      const swapIds = await contract.getReceivedSwaps(userAddress);
      const offers: TradeOffer[] = [];

      for (const swapId of swapIds) {
        const offer = await this.getOffer(Number(swapId));
        if (offer) {
          offers.push(offer);
        }
      }

      return offers;
    } catch (error) {
      console.error("Erreur getReceivedOffers:", error);
      return [];
    }
  }

  async getPendingOffers(userAddress: string): Promise<TradeOffer[]> {
    const contract = this.getContract();

    try {
      const swapIds = await contract.getPendingSwapsForUser(userAddress);
      const offers: TradeOffer[] = [];

      for (const swapId of swapIds) {
        const offer = await this.getOffer(Number(swapId));
        if (offer) {
          offers.push(offer);
        }
      }

      return offers;
    } catch (error) {
      console.error("Erreur getPendingOffers:", error);
      return [];
    }
  }

  listenToOfferCreated(callback: (event: any) => void): () => void {
    const contract = this.getContract();

    const listener = (
      swapId: any,
      proposer: any,
      proposerToken: any,
      receiverToken: any,
      receiver: any,
    ) => {
      callback({
        offerId: Number(swapId),
        creator: proposer,
        creatorNFT: Number(proposerToken),
        requestedNFT: Number(receiverToken),
        receiver: receiver,
      });
    };

    contract.on("SwapProposed", listener);

    return () => {
      contract.off("SwapProposed", listener);
    };
  }

  listenToOfferAccepted(callback: (event: any) => void): () => void {
    const contract = this.getContract();

    const listener = (swapId: any, proposer: any, receiver: any) => {
      callback({
        offerId: Number(swapId),
        creator: proposer,
        acceptor: receiver,
      });
    };

    contract.on("SwapAccepted", listener);

    return () => {
      contract.off("SwapAccepted", listener);
    };
  }
}

export default new TradeService();
