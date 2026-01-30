import { ethers, Contract } from "ethers";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import web3Service from "./ethersService";
import RouletteABI from "../abi/Roulette.json";

export interface GameResult {
  gameId: number;
  player: string;
  betType: number;
  numberBet: number;
  result: number;
  hasWon: boolean;
  timestamp: number;
  txHash?: string;
}

export interface CooldownInfo {
  isActive: boolean;
  remainingSeconds: number;
}

class RouletteService {
  private getContract(): Contract {
    const provider = web3Service.getProvider();
    return new ethers.Contract(
      CONTRACT_ADDRESSES.Roulette,
      RouletteABI.abi,
      provider,
    );
  }

  private async getContractWithSigner(): Promise<Contract> {
    const signer = await web3Service.getSigner();
    return new ethers.Contract(
      CONTRACT_ADDRESSES.Roulette,
      RouletteABI.abi,
      signer,
    );
  }

  async getTicketPrice(): Promise<string> {
    const contract = this.getContract();
    const price = await contract.TICKET_PRICE();
    return ethers.formatEther(price);
  }

  async getCooldownInfo(playerAddress: string): Promise<CooldownInfo> {
    const contract = this.getContract();

    try {
      const remainingSeconds = await contract.getCooldownRemaining(
        playerAddress,
      );

      return {
        isActive: Number(remainingSeconds) > 0,
        remainingSeconds: Number(remainingSeconds),
      };
    } catch (error) {
      console.error("Erreur getCooldownInfo:", error);
      return {
        isActive: false,
        remainingSeconds: 0,
      };
    }
  }

  async buyTicketAndSpin(
    betType: number,
    numberBet: number,
  ): Promise<GameResult> {
    const contract = await this.getContractWithSigner();
    const ticketPrice = await contract.TICKET_PRICE();

    const tx = await contract.buyTicketAndSpin(betType, numberBet, {
      value: ticketPrice,
      gasLimit: 500000,
    });

    const receipt = await tx.wait();

    let gameId = 0;
    for (const log of receipt.logs || []) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === "TicketPurchased") {
          gameId = Number(parsed.args.gameId);
          break;
        }
      } catch {}
    }

    const game = await contract.getGame(gameId);

    return {
      gameId,
      player: game.player,
      betType: Number(game.betType),
      numberBet: Number(game.numberBet),
      result: Number(game.result),
      hasWon: game.hasWon,
      timestamp: Number(game.timestamp),
      txHash: receipt.hash,
    };
  }

  async getGame(gameId: number): Promise<GameResult> {
    const contract = this.getContract();
    const game = await contract.getGame(gameId);

    return {
      gameId,
      player: game.player,
      betType: Number(game.betType),
      numberBet: Number(game.numberBet),
      result: Number(game.result),
      hasWon: game.hasWon,
      timestamp: Number(game.timestamp),
    };
  }

  async getPlayerGames(playerAddress: string): Promise<GameResult[]> {
    const contract = this.getContract();
    const gameIds = await contract.getPlayerGames(playerAddress);

    const games = await Promise.all(
      gameIds.map(async (id: bigint) => {
        return this.getGame(Number(id));
      }),
    );

    return games;
  }

  async getContractBalance(): Promise<string> {
    const provider = web3Service.getProvider();
    const balance = await provider.getBalance(CONTRACT_ADDRESSES.Roulette);
    return ethers.formatEther(balance);
  }

  listenToSpins(callback: (event: any) => void): () => void {
    const contract = this.getContract();

    contract.on("RouletteSpun", (gameId, player, result, hasWon, event) => {
      callback({
        gameId: Number(gameId),
        player,
        result: Number(result),
        hasWon,
        blockNumber: event.log.blockNumber,
      });
    });

    return () => {
      contract.removeAllListeners("RouletteSpun");
    };
  }
}

export default new RouletteService();
