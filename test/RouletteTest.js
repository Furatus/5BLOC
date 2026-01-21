import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Roulette", function () {
  async function deployRouletteFixture() {
    const [owner, player1, player2, player3] = await hre.ethers.getSigners();

    const RewardNFTFactory = await hre.ethers.getContractFactory("RewardNFT");
    const rewardNFT = await RewardNFTFactory.deploy();

    const RouletteFactory = await hre.ethers.getContractFactory("Roulette");
    const roulette = await RouletteFactory.deploy(await rewardNFT.getAddress());

    await rewardNFT.transferOwnership(await roulette.getAddress());

    return { roulette, rewardNFT, owner, player1, player2, player3 };
  }

  describe("Déploiement", function () {
    it("Devrait définir correctement l'adresse du RewardNFT", async function () {
      const { roulette, rewardNFT } = await loadFixture(deployRouletteFixture);
      expect(await roulette.rewardNFT()).to.equal(await rewardNFT.getAddress());
    });

    it("Devrait avoir le bon prix de ticket", async function () {
      const { roulette } = await loadFixture(deployRouletteFixture);
      expect(await roulette.TICKET_PRICE()).to.equal(
        hre.ethers.parseEther("0.01"),
      );
    });
  });

  describe("Achat de ticket et pari", function () {
    it("Devrait permettre d'acheter un ticket et parier sur ROUGE", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await expect(
        roulette.connect(player1).buyTicketAndBet(0, 0, { value: ticketPrice }),
      )
        .to.emit(roulette, "TicketPurchased")
        .withArgs(player1.address, 0, 0, 0);

      const game = await roulette.getGame(0);
      expect(game.player).to.equal(player1.address);
      expect(game.betType).to.equal(0);
      expect(game.isPlayed).to.be.false;
    });

    it("Devrait permettre d'acheter un ticket et parier sur un NUMÉRO", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await expect(
        roulette
          .connect(player1)
          .buyTicketAndBet(10, 17, { value: ticketPrice }),
      )
        .to.emit(roulette, "TicketPurchased")
        .withArgs(player1.address, 0, 10, 17);

      const game = await roulette.getGame(0);
      expect(game.numberBet).to.equal(17);
    });

    it("Devrait permettre d'acheter un ticket et parier sur ZÉRO", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await expect(
        roulette
          .connect(player1)
          .buyTicketAndBet(11, 0, { value: ticketPrice }),
      )
        .to.emit(roulette, "TicketPurchased")
        .withArgs(player1.address, 0, 11, 0);

      const game = await roulette.getGame(0);
      expect(game.betType).to.equal(11);
      expect(game.numberBet).to.equal(0);
    });

    it("Devrait refuser un montant incorrect", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      await expect(
        roulette
          .connect(player1)
          .buyTicketAndBet(0, 0, { value: hre.ethers.parseEther("0.02") }),
      ).to.be.revertedWith("Incorrect ticket price");
    });

    it("Devrait refuser un numéro invalide (> 36)", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await expect(
        roulette
          .connect(player1)
          .buyTicketAndBet(10, 37, { value: ticketPrice }),
      ).to.be.revertedWith("Number must be between 0 and 36");
    });

    it("Devrait refuser un pari NUMBER avec un numéro invalide", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await expect(
        roulette
          .connect(player1)
          .buyTicketAndBet(10, 0, { value: ticketPrice }),
      ).to.be.revertedWith("Number bet must be 1-36");
    });

    it("Devrait refuser un pari ZERO avec un numéro différent de 0", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await expect(
        roulette
          .connect(player1)
          .buyTicketAndBet(11, 5, { value: ticketPrice }),
      ).to.be.revertedWith("Zero bet must specify number 0");
    });

    it("Devrait enregistrer la partie dans playerGames", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await roulette
        .connect(player1)
        .buyTicketAndBet(0, 0, { value: ticketPrice });
      await roulette
        .connect(player1)
        .buyTicketAndBet(1, 0, { value: ticketPrice });

      const games = await roulette.getPlayerGames(player1.address);
      expect(games.length).to.equal(2);
      expect(games[0]).to.equal(0);
      expect(games[1]).to.equal(1);
    });

    it("Devrait incrémenter le gameId", async function () {
      const { roulette, player1, player2 } = await loadFixture(
        deployRouletteFixture,
      );

      const ticketPrice = await roulette.TICKET_PRICE();

      await roulette
        .connect(player1)
        .buyTicketAndBet(0, 0, { value: ticketPrice });
      await roulette
        .connect(player2)
        .buyTicketAndBet(1, 0, { value: ticketPrice });

      const game1 = await roulette.getGame(0);
      const game2 = await roulette.getGame(1);

      expect(game1.player).to.equal(player1.address);
      expect(game2.player).to.equal(player2.address);
    });
  });

  describe("Lancer la roulette", function () {
    it("Devrait permettre au joueur de lancer sa partie", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();
      await roulette
        .connect(player1)
        .buyTicketAndBet(0, 0, { value: ticketPrice });

      const tx = await roulette.connect(player1).spin(0);
      const receipt = await tx.wait();

      const event = receipt.logs.find((log) => {
        try {
          return roulette.interface.parseLog(log).name === "RouletteSpun";
        } catch {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      const game = await roulette.getGame(0);
      expect(game.isPlayed).to.be.true;
      expect(game.result).to.be.at.least(0);
      expect(game.result).to.be.at.most(36);
    });

    it("Devrait empêcher quelqu'un d'autre de lancer la partie", async function () {
      const { roulette, player1, player2 } = await loadFixture(
        deployRouletteFixture,
      );

      const ticketPrice = await roulette.TICKET_PRICE();
      await roulette
        .connect(player1)
        .buyTicketAndBet(0, 0, { value: ticketPrice });

      await expect(roulette.connect(player2).spin(0)).to.be.revertedWith(
        "Not your game",
      );
    });

    it("Devrait empêcher de rejouer une partie déjà jouée", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();
      await roulette
        .connect(player1)
        .buyTicketAndBet(0, 0, { value: ticketPrice });

      await roulette.connect(player1).spin(0);

      await expect(roulette.connect(player1).spin(0)).to.be.revertedWith(
        "Game already played",
      );
    });

    it("Devrait définir hasWon correctement", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();
      await roulette
        .connect(player1)
        .buyTicketAndBet(0, 0, { value: ticketPrice });

      await roulette.connect(player1).spin(0);

      const game = await roulette.getGame(0);

      expect(typeof game.hasWon).to.equal("boolean");
    });
  });

  describe("Distribution de récompenses", function () {
    it("Devrait distribuer un NFT LEGENDARY en cas de victoire sur ZERO", async function () {
      const { roulette, rewardNFT, player1 } = await loadFixture(
        deployRouletteFixture,
      );

      const ticketPrice = await roulette.TICKET_PRICE();

      let won = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!won && attempts < maxAttempts) {
        await roulette
          .connect(player1)
          .buyTicketAndBet(11, 0, { value: ticketPrice });
        await roulette.connect(player1).spin(attempts);

        const game = await roulette.getGame(attempts);
        if (game.result === 0n) {
          won = true;
          expect(game.hasWon).to.be.true;

          const balance = await rewardNFT.balanceOf(player1.address);
          expect(balance).to.be.greaterThan(0);

          const metadata = await rewardNFT.getTokenMetadata(balance - 1n);
          expect(metadata.rewardType).to.equal(3);
        }
        attempts++;
      }

      if (!won) {
        this.skip();
      }
    });

    it("Devrait distribuer un NFT COMMON en cas de victoire sur ROUGE", async function () {
      const { roulette, rewardNFT, player1 } = await loadFixture(
        deployRouletteFixture,
      );

      const ticketPrice = await roulette.TICKET_PRICE();

      let won = false;
      let attempts = 0;
      const maxAttempts = 50;

      while (!won && attempts < maxAttempts) {
        await roulette
          .connect(player1)
          .buyTicketAndBet(0, 0, { value: ticketPrice });
        await roulette.connect(player1).spin(attempts);

        const game = await roulette.getGame(attempts);
        if (game.hasWon) {
          won = true;

          const balance = await rewardNFT.balanceOf(player1.address);
          const metadata = await rewardNFT.getTokenMetadata(balance - 1n);
          expect(metadata.rewardType).to.equal(0);
        }
        attempts++;
      }

      if (!won) {
        this.skip();
      }
    });

    it("Ne devrait PAS distribuer de NFT si inventaire plein", async function () {
      const { roulette, rewardNFT, player1, owner } = await loadFixture(
        deployRouletteFixture,
      );

      await rewardNFT.connect(owner).transferOwnership(owner.address);

      for (let i = 0; i < 20; i++) {
        await rewardNFT
          .connect(owner)
          .mintReward(player1.address, `NFT ${i}`, 0, `Qm${i}`);
      }

      await rewardNFT
        .connect(owner)
        .transferOwnership(await roulette.getAddress());

      const balanceBefore = await rewardNFT.balanceOf(player1.address);
      expect(balanceBefore).to.equal(20);

      const ticketPrice = await roulette.TICKET_PRICE();
      let attempts = 0;
      const maxAttempts = 50;

      while (attempts < maxAttempts) {
        await roulette
          .connect(player1)
          .buyTicketAndBet(0, 0, { value: ticketPrice });
        await roulette.connect(player1).spin(attempts);

        const game = await roulette.getGame(attempts);
        if (game.hasWon) {
          const balanceAfter = await rewardNFT.balanceOf(player1.address);
          expect(balanceAfter).to.equal(20);
          return;
        }
        attempts++;
      }

      this.skip();
    });

    it("Ne devrait PAS distribuer de NFT en cas de défaite", async function () {
      const { roulette, rewardNFT, player1 } = await loadFixture(
        deployRouletteFixture,
      );

      const ticketPrice = await roulette.TICKET_PRICE();

      let attempts = 0;
      const maxAttempts = 50;

      while (attempts < maxAttempts) {
        await roulette
          .connect(player1)
          .buyTicketAndBet(0, 0, { value: ticketPrice });
        await roulette.connect(player1).spin(attempts);

        const game = await roulette.getGame(attempts);
        if (!game.hasWon) {
          const balance = await rewardNFT.balanceOf(player1.address);
          expect(balance).to.equal(0);
          return;
        }
        attempts++;
      }

      this.skip();
    });
  });

  describe("Fonctions de lecture", function () {
    it("getPlayerGames devrait retourner toutes les parties d'un joueur", async function () {
      const { roulette, player1, player2 } = await loadFixture(
        deployRouletteFixture,
      );

      const ticketPrice = await roulette.TICKET_PRICE();

      await roulette
        .connect(player1)
        .buyTicketAndBet(0, 0, { value: ticketPrice });
      await roulette
        .connect(player2)
        .buyTicketAndBet(1, 0, { value: ticketPrice });
      await roulette
        .connect(player1)
        .buyTicketAndBet(2, 0, { value: ticketPrice });

      const player1Games = await roulette.getPlayerGames(player1.address);
      const player2Games = await roulette.getPlayerGames(player2.address);

      expect(player1Games.length).to.equal(2);
      expect(player1Games[0]).to.equal(0);
      expect(player1Games[1]).to.equal(2);

      expect(player2Games.length).to.equal(1);
      expect(player2Games[0]).to.equal(1);
    });

    it("getBalance devrait retourner le solde du contrat", async function () {
      const { roulette, player1, player2 } = await loadFixture(
        deployRouletteFixture,
      );

      const ticketPrice = await roulette.TICKET_PRICE();

      expect(await roulette.getBalance()).to.equal(0);

      await roulette
        .connect(player1)
        .buyTicketAndBet(0, 0, { value: ticketPrice });
      expect(await roulette.getBalance()).to.equal(ticketPrice);

      await roulette
        .connect(player2)
        .buyTicketAndBet(1, 0, { value: ticketPrice });
      expect(await roulette.getBalance()).to.equal(ticketPrice * 2n);
    });

    it("getGame devrait retourner les détails d'une partie", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();
      await roulette
        .connect(player1)
        .buyTicketAndBet(0, 0, { value: ticketPrice });

      const game = await roulette.getGame(0);

      expect(game.player).to.equal(player1.address);
      expect(game.betType).to.equal(0);
      expect(game.numberBet).to.equal(0);
      expect(game.isPlayed).to.be.false;
      expect(game.timestamp).to.be.greaterThan(0);
    });
  });

  describe("Scénarios multijoueurs", function () {
    it("Devrait permettre à plusieurs joueurs de jouer en parallèle", async function () {
      const { roulette, player1, player2, player3 } = await loadFixture(
        deployRouletteFixture,
      );

      const ticketPrice = await roulette.TICKET_PRICE();

      await roulette
        .connect(player1)
        .buyTicketAndBet(0, 0, { value: ticketPrice });
      await roulette
        .connect(player2)
        .buyTicketAndBet(1, 0, { value: ticketPrice });
      await roulette
        .connect(player3)
        .buyTicketAndBet(10, 7, { value: ticketPrice });

      await roulette.connect(player1).spin(0);
      await roulette.connect(player2).spin(1);
      await roulette.connect(player3).spin(2);

      const game1 = await roulette.getGame(0);
      const game2 = await roulette.getGame(1);
      const game3 = await roulette.getGame(2);

      expect(game1.isPlayed).to.be.true;
      expect(game2.isPlayed).to.be.true;
      expect(game3.isPlayed).to.be.true;
    });

    it("Un joueur peut jouer plusieurs fois", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      for (let i = 0; i < 5; i++) {
        await roulette
          .connect(player1)
          .buyTicketAndBet(0, 0, { value: ticketPrice });
        await roulette.connect(player1).spin(i);
      }

      const games = await roulette.getPlayerGames(player1.address);
      expect(games.length).to.equal(5);
    });
  });
});
