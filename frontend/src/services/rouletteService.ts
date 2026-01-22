import { ethers, Contract} from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import web3Service from './ethersService';
import RouletteABI from '../abi/Roulette.json';

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

class RouletteService {

  private getContract(): Contract {
    const provider = web3Service.getProvider();
    return new ethers.Contract(CONTRACT_ADDRESSES.Roulette, RouletteABI.abi, provider);
  }


  private async getContractWithSigner(): Promise<Contract> {
    const signer = await web3Service.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESSES.Roulette, RouletteABI.abi, signer);
  }


  async getTicketPrice(): Promise<string> {
    const contract = this.getContract();
    const price = await contract.TICKET_PRICE();
    return ethers.formatEther(price); 
  }

 
  async buyTicketAndBet(betType: number, numberBet: number): Promise<number> {
    const contract = await this.getContractWithSigner();
    const ticketPrice = await contract.TICKET_PRICE();

    const tx = await contract.buyTicketAndBet(betType, numberBet, {
      value: ticketPrice,
      gasLimit: 300000,
    });

    const receipt = await tx.wait();

    
    const event = receipt.logs?.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'TicketPurchased';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = contract.interface.parseLog(event);
      return Number(parsed?.args?.gameId); 
    }

    return 0;
  }

  async spin(gameId: number): Promise<GameResult> {
    const contract = await this.getContractWithSigner();

    const tx = await contract.spin(gameId);
    const receipt = await tx.wait();

    
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
      })
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

    contract.on('RouletteSpun', (gameId, player, result, hasWon, event) => {
      callback({
        gameId: Number(gameId), 
        player,
        result: Number(result), 
        hasWon,
        blockNumber: event.log.blockNumber,
      });
    });

    return () => {
      contract.removeAllListeners('RouletteSpun');
    };
  }
}

export default new RouletteService();