import { expect } from "chai";
import hre from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

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

  async function skipCooldown(roulette, player) {
    const cooldown = await roulette.getCooldownRemaining(player.address);
    if (cooldown > 0n) {
      await time.increase(Number(cooldown) + 1);
    }
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

  describe("Cooldown après victoire", function () {
    it("Devrait bloquer le replay dans la minute après une victoire", async function () {
      const { roulette, rewardNFT, player1 } = await loadFixture(
        deployRouletteFixture,
      );
      const TICKET_PRICE = await roulette.TICKET_PRICE();

      await roulette
        .connect(player1)
        .buyTicketAndSpin(0, 0, { value: TICKET_PRICE });
      const game = await roulette.games(0);

      if (game.hasWon) {
        await expect(
          roulette
            .connect(player1)
            .buyTicketAndSpin(0, 0, { value: TICKET_PRICE }),
        ).to.be.revertedWith("Cooldown actif apres victoire");

        await time.increase(61);

        await expect(
          roulette
            .connect(player1)
            .buyTicketAndSpin(0, 0, { value: TICKET_PRICE }),
        ).to.not.be.reverted;
      }
    });

    it("Devrait permettre de rejouer immédiatement après une défaite", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);
      const ticketPrice = await roulette.TICKET_PRICE();

      let gameCount = 0;
      let foundLoss = false;
      while (gameCount < 50 && !foundLoss) {
        await skipCooldown(roulette, player1);

        await roulette
          .connect(player1)
          .buyTicketAndSpin(1, 13, { value: ticketPrice });
        const game = await roulette.getGame(gameCount);

        if (!game.hasWon) {
          foundLoss = true;

          
          const lastWinAt = await roulette.lastWinAt(player1.address);

          if (lastWinAt == 0) {
            
            await expect(
              roulette
                .connect(player1)
                .buyTicketAndSpin(1, 14, { value: ticketPrice }),
            ).to.not.be.reverted;
          } else {
            this.skip();
          }
        }
        gameCount++;
      }

      if (!foundLoss) {
        this.skip();
      }
    });
  });

  describe("Achat de ticket et spin combinés", function () {
    it("Devrait permettre d'acheter un ticket et jouer sur ROUGE", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await expect(
        roulette
          .connect(player1)
          .buyTicketAndSpin(0, 0, { value: ticketPrice }),
      ).to.emit(roulette, "TicketPurchased");

      const game = await roulette.getGame(0);
      expect(game.player).to.equal(player1.address);
      expect(game.betType).to.equal(0);
      expect(game.isPlayed).to.be.true;
    });

    it("Devrait permettre de parier sur un NUMÉRO", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await roulette
        .connect(player1)
        .buyTicketAndSpin(10, 17, { value: ticketPrice });

      const game = await roulette.getGame(0);
      expect(game.numberBet).to.equal(17);
      expect(game.isPlayed).to.be.true;
    });

    it("Devrait permettre de parier sur ZÉRO", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await roulette
        .connect(player1)
        .buyTicketAndSpin(11, 0, { value: ticketPrice });

      const game = await roulette.getGame(0);
      expect(game.betType).to.equal(11);
      expect(game.numberBet).to.equal(0);
      expect(game.isPlayed).to.be.true;
    });

    it("Devrait refuser un montant incorrect", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      await expect(
        roulette
          .connect(player1)
          .buyTicketAndSpin(0, 0, { value: hre.ethers.parseEther("0.02") }),
      ).to.be.revertedWith("Incorrect ticket price");
    });

    it("Devrait refuser un numéro invalide (> 36)", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await expect(
        roulette
          .connect(player1)
          .buyTicketAndSpin(10, 37, { value: ticketPrice }),
      ).to.be.revertedWith("Number must be between 0 and 36");
    });

    it("Devrait refuser un pari NUMBER avec un numéro invalide", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await expect(
        roulette
          .connect(player1)
          .buyTicketAndSpin(10, 0, { value: ticketPrice }),
      ).to.be.revertedWith("Number bet must be 1-36");
    });

    it("Devrait refuser un pari ZERO avec un numéro différent de 0", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await expect(
        roulette
          .connect(player1)
          .buyTicketAndSpin(11, 5, { value: ticketPrice }),
      ).to.be.revertedWith("Zero bet must specify number 0");
    });

    it("Devrait enregistrer la partie dans playerGames", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await roulette
        .connect(player1)
        .buyTicketAndSpin(0, 0, { value: ticketPrice });

      await skipCooldown(roulette, player1);

      await roulette
        .connect(player1)
        .buyTicketAndSpin(1, 0, { value: ticketPrice });

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
        .buyTicketAndSpin(0, 0, { value: ticketPrice });
      await roulette
        .connect(player2)
        .buyTicketAndSpin(1, 0, { value: ticketPrice });

      const game1 = await roulette.getGame(0);
      const game2 = await roulette.getGame(1);

      expect(game1.player).to.equal(player1.address);
      expect(game2.player).to.equal(player2.address);
    });

    it("Devrait émettre l'événement RouletteSpun", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      await expect(
        roulette
          .connect(player1)
          .buyTicketAndSpin(0, 0, { value: ticketPrice }),
      ).to.emit(roulette, "RouletteSpun");

      const game = await roulette.getGame(0);
      expect(game.isPlayed).to.be.true;
      expect(game.result).to.be.at.least(0);
      expect(game.result).to.be.at.most(36);
    });

    it("Devrait définir hasWon correctement", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();
      await roulette
        .connect(player1)
        .buyTicketAndSpin(0, 0, { value: ticketPrice });

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
        await skipCooldown(roulette, player1);

        await roulette
          .connect(player1)
          .buyTicketAndSpin(11, 0, { value: ticketPrice });

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
        await skipCooldown(roulette, player1);

        await roulette
          .connect(player1)
          .buyTicketAndSpin(0, 0, { value: ticketPrice });

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

      const RewardNFTFactory = await hre.ethers.getContractFactory("RewardNFT");
      const newRewardNFT = await RewardNFTFactory.deploy();

      for (let i = 0; i < 20; i++) {
        await newRewardNFT
          .connect(owner)
          .mintReward(player1.address, `NFT ${i}`, 0, `Qm${i}`);
      }

      const RouletteFactory = await hre.ethers.getContractFactory("Roulette");
      const newRoulette = await RouletteFactory.deploy(
        await newRewardNFT.getAddress(),
      );

      await newRewardNFT
        .connect(owner)
        .transferOwnership(await newRoulette.getAddress());

      const balanceBefore = await newRewardNFT.balanceOf(player1.address);
      expect(balanceBefore).to.equal(20);

      const ticketPrice = await newRoulette.TICKET_PRICE();
      let attempts = 0;
      const maxAttempts = 50;

      async function skipCooldownLocal() {
        const cooldown = await newRoulette.getCooldownRemaining(
          player1.address,
        );
        if (cooldown > 0n) {
          await time.increase(Number(cooldown) + 1);
        }
      }

      while (attempts < maxAttempts) {
        await skipCooldownLocal();

        await newRoulette
          .connect(player1)
          .buyTicketAndSpin(0, 0, { value: ticketPrice });

        const game = await newRoulette.getGame(attempts);
        if (game.hasWon) {
          const balanceAfter = await newRewardNFT.balanceOf(player1.address);
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
        await skipCooldown(roulette, player1);

        await roulette
          .connect(player1)
          .buyTicketAndSpin(0, 0, { value: ticketPrice });

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
        .buyTicketAndSpin(0, 0, { value: ticketPrice });
      await roulette
        .connect(player2)
        .buyTicketAndSpin(1, 0, { value: ticketPrice });

      await skipCooldown(roulette, player1);

      await roulette
        .connect(player1)
        .buyTicketAndSpin(2, 0, { value: ticketPrice });

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
        .buyTicketAndSpin(0, 0, { value: ticketPrice });
      expect(await roulette.getBalance()).to.equal(ticketPrice);

      await roulette
        .connect(player2)
        .buyTicketAndSpin(1, 0, { value: ticketPrice });
      expect(await roulette.getBalance()).to.equal(ticketPrice * 2n);
    });

    it("getGame devrait retourner les détails d'une partie", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();
      await roulette
        .connect(player1)
        .buyTicketAndSpin(0, 0, { value: ticketPrice });

      const game = await roulette.getGame(0);

      expect(game.player).to.equal(player1.address);
      expect(game.betType).to.equal(0);
      expect(game.numberBet).to.equal(0);
      expect(game.isPlayed).to.be.true;
      expect(game.timestamp).to.be.greaterThan(0);
    });

    it("getCooldownRemaining devrait retourner le temps restant", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();
      let attempts = 0;
      const maxAttempts = 100;

      while (attempts < maxAttempts) {
        await skipCooldown(roulette, player1);

        await roulette
          .connect(player1)
          .buyTicketAndSpin(0, 0, { value: ticketPrice });

        const game = await roulette.getGame(attempts);
        if (game.hasWon) {
          const remaining = await roulette.getCooldownRemaining(
            player1.address,
          );
          expect(remaining).to.be.greaterThan(0n);

          await time.increase(Number(remaining) + 1);
          const remainingAfter = await roulette.getCooldownRemaining(
            player1.address,
          );
          expect(remainingAfter).to.equal(0n);
          return;
        }
        attempts++;
      }

      this.skip();
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
        .buyTicketAndSpin(0, 0, { value: ticketPrice });
      await roulette
        .connect(player2)
        .buyTicketAndSpin(1, 0, { value: ticketPrice });
      await roulette
        .connect(player3)
        .buyTicketAndSpin(10, 7, { value: ticketPrice });

      const game1 = await roulette.getGame(0);
      const game2 = await roulette.getGame(1);
      const game3 = await roulette.getGame(2);

      expect(game1.isPlayed).to.be.true;
      expect(game2.isPlayed).to.be.true;
      expect(game3.isPlayed).to.be.true;
    });

    it("Un joueur peut jouer plusieurs fois avec cooldown respecté", async function () {
      const { roulette, player1 } = await loadFixture(deployRouletteFixture);

      const ticketPrice = await roulette.TICKET_PRICE();

      for (let i = 0; i < 5; i++) {
        await skipCooldown(roulette, player1);

        await roulette
          .connect(player1)
          .buyTicketAndSpin(0, 0, { value: ticketPrice });
      }

      const games = await roulette.getPlayerGames(player1.address);
      expect(games.length).to.equal(5);
    });

    it("Les cooldowns sont indépendants entre joueurs", async function () {
      const { roulette, player1, player2 } = await loadFixture(
        deployRouletteFixture,
      );

      const ticketPrice = await roulette.TICKET_PRICE();
      let player1Won = false;
      let attempts = 0;
      const maxAttempts = 50;

      while (!player1Won && attempts < maxAttempts) {
        await skipCooldown(roulette, player1);

        await roulette
          .connect(player1)
          .buyTicketAndSpin(0, 0, { value: ticketPrice });

        const game = await roulette.getGame(attempts);
        if (game.hasWon) {
          player1Won = true;
        }
        attempts++;
      }

      if (!player1Won) {
        this.skip();
        return;
      }

      const cooldown1 = await roulette.getCooldownRemaining(player1.address);
      expect(cooldown1).to.be.greaterThan(0n);

      await expect(
        roulette
          .connect(player2)
          .buyTicketAndSpin(0, 0, { value: ticketPrice }),
      ).to.not.be.reverted;
    });
  });
});
