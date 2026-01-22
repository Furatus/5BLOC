import { ethers, Contract } from "ethers";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import web3Service from "./ethersService";
import TradeABI from "../abi/Trade.json";

export interface TradeOffer {
  offerId: number;
  creator: string;
  creatorNFT: number;
  requestedNFT: number;
  isActive: boolean;
  createdAt: number;
}

class TradeService {

  private getContract(): Contract {
    const provider = web3Service.getProvider();
    return new ethers.Contract(
      CONTRACT_ADDRESSES.Trade,
      TradeABI.abi,
      provider,
    );
  }


  private async getContractWithSigner(): Promise<Contract> {
    const signer = await web3Service.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESSES.Trade, TradeABI.abi, signer);
  }

 
  async createOffer(creatorNFT: number, requestedNFT: number): Promise<number> {
    const contract = await this.getContractWithSigner();

    const tx = await contract.createOffer(creatorNFT, requestedNFT, {
      gasLimit: 300000,
    });

    const receipt = await tx.wait();

    
    const event = receipt.logs?.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === "OfferCreated";
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = contract.interface.parseLog(event);
      return Number(parsed?.args?.offerId);
    }

    return 0;
  }

 
  async acceptOffer(offerId: number): Promise<string> {
    const contract = await this.getContractWithSigner();

    const tx = await contract.acceptOffer(offerId, {
      gasLimit: 400000,
    });

    const receipt = await tx.wait();

    return receipt.hash;
  }


  async cancelOffer(offerId: number): Promise<string> {
    const contract = await this.getContractWithSigner();

    const tx = await contract.cancelOffer(offerId, {
      gasLimit: 200000,
    });

    const receipt = await tx.wait();

    return receipt.hash;
  }

 
  async getOffer(offerId: number): Promise<TradeOffer> {
    const contract = this.getContract();
    const offer = await contract.getOffer(offerId);

    return {
      offerId,
      creator: offer.creator,
      creatorNFT: Number(offer.creatorNFT),
      requestedNFT: Number(offer.requestedNFT),
      isActive: offer.isActive,
      createdAt: Number(offer.createdAt),
    };
  }


  async getActiveOffers(): Promise<TradeOffer[]> {
    const contract = this.getContract();
    const offerIds = await contract.getActiveOffers();

    const offers = await Promise.all(
      offerIds.map(async (id: bigint) => {
        return this.getOffer(Number(id));
      }),
    );

    return offers;
  }

 
  async getUserOffers(userAddress: string): Promise<TradeOffer[]> {
    const contract = this.getContract();
    const offerIds = await contract.getUserOffers(userAddress);

    const offers = await Promise.all(
      offerIds.map(async (id: bigint) => {
        return this.getOffer(Number(id));
      }),
    );

    return offers;
  }

 
  listenToOfferCreated(callback: (event: any) => void): () => void {
    const contract = this.getContract();

    contract.on(
      "OfferCreated",
      (offerId, creator, creatorNFT, requestedNFT, event) => {
        callback({
          offerId: Number(offerId),
          creator,
          creatorNFT: Number(creatorNFT),
          requestedNFT: Number(requestedNFT),
          blockNumber: event.log.blockNumber,
        });
      },
    );

    return () => {
      contract.removeAllListeners("OfferCreated");
    };
  }


  listenToOfferAccepted(callback: (event: any) => void): () => void {
    const contract = this.getContract();

    contract.on("OfferAccepted", (offerId, creator, acceptor, event) => {
      callback({
        offerId: Number(offerId),
        creator,
        acceptor,
        blockNumber: event.log.blockNumber,
      });
    });

    return () => {
      contract.removeAllListeners("OfferAccepted");
    };
  }
}

export default new TradeService();
