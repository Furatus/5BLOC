import { expect } from "chai";
import hre from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("Trade", function () {
  const TRADE_COOLDOWN = 5 * 60;

  async function deployTradeFixture() {
    const [owner, alice, bob, charlie] = await hre.ethers.getSigners();

    const RewardNFTFactory = await hre.ethers.getContractFactory("RewardNFT");
    const rewardNFT = await RewardNFTFactory.deploy();

    const TradeFactory = await hre.ethers.getContractFactory("Trade");
    const trade = await TradeFactory.deploy(await rewardNFT.getAddress());

    await rewardNFT.mintReward(alice.address, "Alice NFT 1", 0, "QmAlice1");
    await rewardNFT.mintReward(alice.address, "Alice NFT 2", 1, "QmAlice2");

    await rewardNFT.mintReward(bob.address, "Bob NFT 1", 2, "QmBob1");
    await rewardNFT.mintReward(bob.address, "Bob NFT 2", 3, "QmBob2");

    await rewardNFT.mintReward(
      charlie.address,
      "Charlie NFT 1",
      0,
      "QmCharlie1",
    );

    return { trade, rewardNFT, owner, alice, bob, charlie };
  }

  async function skipCooldown() {
    await time.increase(TRADE_COOLDOWN + 1);
  }

  describe("Déploiement", function () {
    it("Devrait définir correctement l'adresse du RewardNFT", async function () {
      const { trade, rewardNFT } = await loadFixture(deployTradeFixture);
      expect(await trade.rewardNFT()).to.equal(await rewardNFT.getAddress());
    });

    it("Devrait avoir le bon cooldown défini", async function () {
      const { trade } = await loadFixture(deployTradeFixture);
      expect(await trade.TRADE_COOLDOWN()).to.equal(TRADE_COOLDOWN);
    });
  });

  describe("Cooldown de trading", function () {
    it("Devrait bloquer une deuxième action pendant le cooldown", async function () {
      const { trade, alice, bob, charlie } = await loadFixture(deployTradeFixture);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      await expect(
        trade.connect(alice).proposeSwap(1, 4, charlie.address)
      ).to.be.revertedWith("Cooldown: Veuillez patienter 5 minutes");
    });

    it("Devrait permettre une action après le cooldown", async function () {
      const { trade, alice, bob, charlie } = await loadFixture(deployTradeFixture);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      await skipCooldown();

      await expect(
        trade.connect(alice).proposeSwap(1, 4, charlie.address)
      ).to.not.be.reverted;
    });

    it("getCooldownRemaining devrait retourner le temps restant", async function () {
      const { trade, alice, bob } = await loadFixture(deployTradeFixture);

      const remainingBefore = await trade.getCooldownRemaining(alice.address);
      expect(remainingBefore).to.equal(0n);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      const remainingAfter = await trade.getCooldownRemaining(alice.address);
      expect(remainingAfter).to.be.greaterThan(0n);
      expect(remainingAfter).to.be.at.most(BigInt(TRADE_COOLDOWN));

      await skipCooldown();
      const remainingFinal = await trade.getCooldownRemaining(alice.address);
      expect(remainingFinal).to.equal(0n);
    });

    it("Les cooldowns sont indépendants entre utilisateurs", async function () {
      const { trade, alice, bob, charlie } = await loadFixture(deployTradeFixture);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      const aliceCooldown = await trade.getCooldownRemaining(alice.address);
      expect(aliceCooldown).to.be.greaterThan(0n);

      const bobCooldown = await trade.getCooldownRemaining(bob.address);
      expect(bobCooldown).to.equal(0n);

      await expect(
        trade.connect(bob).proposeSwap(3, 4, charlie.address)
      ).to.not.be.reverted;
    });
  });

  describe("Proposition d'échange", function () {
    it("Devrait permettre de proposer un échange", async function () {
      const { trade, rewardNFT, alice, bob } = await loadFixture(
        deployTradeFixture,
      );

      await expect(trade.connect(alice).proposeSwap(0, 2, bob.address))
        .to.emit(trade, "SwapProposed")
        .withArgs(1, alice.address, bob.address, 0, 2);

      const swap = await trade.getSwap(1);
      expect(swap.proposer).to.equal(alice.address);
      expect(swap.target).to.equal(bob.address);
      expect(swap.proposerTokenId).to.equal(0);
      expect(swap.targetTokenId).to.equal(2);
      expect(swap.status).to.equal(0);
    });

    it("Devrait empêcher de proposer un NFT qu'on ne possède pas", async function () {
      const { trade, alice, bob } = await loadFixture(deployTradeFixture);

      await expect(
        trade.connect(alice).proposeSwap(2, 0, bob.address),
      ).to.be.revertedWith("You don't own this NFT");
    });

    it("Devrait empêcher de proposer un échange avec soi-même", async function () {
      const { trade, alice } = await loadFixture(deployTradeFixture);

      await expect(
        trade.connect(alice).proposeSwap(0, 1, alice.address),
      ).to.be.revertedWith("Cannot swap with yourself");
    });

    it("Devrait empêcher de proposer un NFT vers un propriétaire incorrect", async function () {
      const { trade, alice, charlie } = await loadFixture(deployTradeFixture);

      await expect(
        trade.connect(alice).proposeSwap(0, 2, charlie.address),
      ).to.be.revertedWith("Target doesn't own the NFT");
    });

    it("Devrait empêcher de proposer un NFT déjà dans un swap actif", async function () {
      const { trade, alice, bob, charlie } = await loadFixture(
        deployTradeFixture,
      );

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      await skipCooldown();

      await expect(
        trade.connect(alice).proposeSwap(0, 4, charlie.address),
      ).to.be.revertedWith("NFT already in active swap");
    });

    it("Devrait enregistrer les propositions dans les tableaux proposer/received", async function () {
      const { trade, alice, bob } = await loadFixture(deployTradeFixture);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      const aliceProposals = await trade.getProposerSwaps(alice.address);
      const bobReceived = await trade.getReceivedSwaps(bob.address);

      expect(aliceProposals.length).to.equal(1);
      expect(aliceProposals[0]).to.equal(1);
      expect(bobReceived.length).to.equal(1);
      expect(bobReceived[0]).to.equal(1);
    });
  });

  describe("Acceptation d'échange", function () {
    it("Devrait permettre d'accepter un échange", async function () {
      const { trade, rewardNFT, alice, bob } = await loadFixture(
        deployTradeFixture,
      );

      await rewardNFT
        .connect(alice)
        .setApprovalForAll(await trade.getAddress(), true);
      await rewardNFT
        .connect(bob)
        .setApprovalForAll(await trade.getAddress(), true);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      await expect(trade.connect(bob).acceptSwap(1))
        .to.emit(trade, "SwapAccepted")
        .withArgs(1, alice.address, bob.address, 0, 2);

      expect(await rewardNFT.ownerOf(0)).to.equal(bob.address);
      expect(await rewardNFT.ownerOf(2)).to.equal(alice.address);

      const swap = await trade.getSwap(1);
      expect(swap.status).to.equal(1);
      expect(swap.resolvedAt).to.be.greaterThan(0);
    });

    it("Devrait empêcher quelqu'un d'autre d'accepter l'échange", async function () {
      const { trade, rewardNFT, alice, bob, charlie } = await loadFixture(
        deployTradeFixture,
      );

      await rewardNFT
        .connect(alice)
        .setApprovalForAll(await trade.getAddress(), true);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      await expect(trade.connect(charlie).acceptSwap(1)).to.be.revertedWith(
        "Not the target of this swap",
      );
    });

    it("Devrait empêcher d'accepter un swap déjà résolu", async function () {
      const { trade, rewardNFT, alice, bob } = await loadFixture(
        deployTradeFixture,
      );

      await rewardNFT
        .connect(alice)
        .setApprovalForAll(await trade.getAddress(), true);
      await rewardNFT
        .connect(bob)
        .setApprovalForAll(await trade.getAddress(), true);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);
      await trade.connect(bob).acceptSwap(1);

      await skipCooldown();

      await expect(trade.connect(bob).acceptSwap(1)).to.be.revertedWith(
        "Swap is not pending",
      );
    });

    it("Devrait échouer si le proposer ne possède plus le NFT", async function () {
      const { trade, rewardNFT, alice, bob, charlie } = await loadFixture(
        deployTradeFixture,
      );

      await rewardNFT
        .connect(alice)
        .setApprovalForAll(await trade.getAddress(), true);
      await rewardNFT
        .connect(bob)
        .setApprovalForAll(await trade.getAddress(), true);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      await rewardNFT
        .connect(alice)
        .transferFrom(alice.address, charlie.address, 0);

      await expect(trade.connect(bob).acceptSwap(1)).to.be.revertedWith(
        "Proposer no longer owns the NFT",
      );
    });

    it("Devrait libérer les tokens après acceptation", async function () {
      const { trade, rewardNFT, alice, bob } = await loadFixture(
        deployTradeFixture,
      );

      await rewardNFT
        .connect(alice)
        .setApprovalForAll(await trade.getAddress(), true);
      await rewardNFT
        .connect(bob)
        .setApprovalForAll(await trade.getAddress(), true);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      expect(await trade.isTokenInActiveSwap(0)).to.be.true;
      expect(await trade.isTokenInActiveSwap(2)).to.be.true;

      await trade.connect(bob).acceptSwap(1);

      expect(await trade.isTokenInActiveSwap(0)).to.be.false;
      expect(await trade.isTokenInActiveSwap(2)).to.be.false;
    });

    it("Devrait respecter le cooldown pour acceptSwap", async function () {
      const { trade, rewardNFT, alice, bob, charlie } = await loadFixture(
        deployTradeFixture,
      );

      await rewardNFT
        .connect(alice)
        .setApprovalForAll(await trade.getAddress(), true);
      await rewardNFT
        .connect(bob)
        .setApprovalForAll(await trade.getAddress(), true);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);
      await skipCooldown();
      await trade.connect(alice).proposeSwap(1, 3, bob.address);

      await trade.connect(bob).acceptSwap(1);

      await expect(
        trade.connect(bob).acceptSwap(2)
      ).to.be.revertedWith("Cooldown: Veuillez patienter 5 minutes");

      await skipCooldown();
      await expect(trade.connect(bob).acceptSwap(2)).to.not.be.reverted;
    });
  });

  describe("Annulation d'échange", function () {
    it("Devrait permettre au proposer d'annuler", async function () {
      const { trade, alice, bob } = await loadFixture(deployTradeFixture);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      await skipCooldown();

      await expect(trade.connect(alice).cancelSwap(1))
        .to.emit(trade, "SwapCancelled")
        .withArgs(1, alice.address);

      const swap = await trade.getSwap(1);
      expect(swap.status).to.equal(2);
    });

    it("Devrait empêcher quelqu'un d'autre d'annuler", async function () {
      const { trade, alice, bob } = await loadFixture(deployTradeFixture);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      await expect(trade.connect(bob).cancelSwap(1)).to.be.revertedWith(
        "Not the proposer",
      );
    });

    it("Devrait libérer les tokens après annulation", async function () {
      const { trade, alice, bob } = await loadFixture(deployTradeFixture);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      expect(await trade.isTokenInActiveSwap(0)).to.be.true;

      await skipCooldown();
      await trade.connect(alice).cancelSwap(1);

      expect(await trade.isTokenInActiveSwap(0)).to.be.false;
      expect(await trade.isTokenInActiveSwap(2)).to.be.false;
    });

    it("Devrait respecter le cooldown pour cancelSwap", async function () {
      const { trade, alice, bob } = await loadFixture(deployTradeFixture);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      await expect(
        trade.connect(alice).cancelSwap(1)
      ).to.be.revertedWith("Cooldown: Veuillez patienter 5 minutes");

      await skipCooldown();
      await expect(trade.connect(alice).cancelSwap(1)).to.not.be.reverted;
    });
  });

  describe("Refus d'échange", function () {
    it("Devrait permettre au target de refuser", async function () {
      const { trade, alice, bob } = await loadFixture(deployTradeFixture);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      await expect(trade.connect(bob).rejectSwap(1))
        .to.emit(trade, "SwapRejected")
        .withArgs(1, bob.address);

      const swap = await trade.getSwap(1);
      expect(swap.status).to.equal(3);
    });

    it("Devrait empêcher quelqu'un d'autre de refuser", async function () {
      const { trade, alice, bob, charlie } = await loadFixture(
        deployTradeFixture,
      );

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      await expect(trade.connect(charlie).rejectSwap(1)).to.be.revertedWith(
        "Not the target of this swap",
      );
    });

    it("Devrait libérer les tokens après refus", async function () {
      const { trade, alice, bob } = await loadFixture(deployTradeFixture);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);
      await trade.connect(bob).rejectSwap(1);

      expect(await trade.isTokenInActiveSwap(0)).to.be.false;
      expect(await trade.isTokenInActiveSwap(2)).to.be.false;
    });

    it("Devrait respecter le cooldown pour rejectSwap", async function () {
      const { trade, rewardNFT, alice, bob, charlie } = await loadFixture(
        deployTradeFixture,
      );

      await trade.connect(alice).proposeSwap(0, 2, bob.address);
      
      await trade.connect(charlie).proposeSwap(4, 3, bob.address);

      await trade.connect(bob).rejectSwap(1);

      await expect(
        trade.connect(bob).rejectSwap(2)
      ).to.be.revertedWith("Cooldown: Veuillez patienter 5 minutes");

      await skipCooldown();
      await expect(trade.connect(bob).rejectSwap(2)).to.not.be.reverted;
    });
  });

  describe("Fonctions de lecture", function () {
    it("getPendingSwapsForUser devrait retourner seulement les swaps en attente", async function () {
      const { trade, rewardNFT, alice, bob } = await loadFixture(
        deployTradeFixture,
      );

      await trade.connect(alice).proposeSwap(0, 2, bob.address);
      
      await skipCooldown();
      
      await trade.connect(alice).proposeSwap(1, 3, bob.address);

      let pending = await trade.getPendingSwapsForUser(bob.address);
      expect(pending.length).to.equal(2);

      await trade.connect(bob).rejectSwap(1);

      pending = await trade.getPendingSwapsForUser(bob.address);
      expect(pending.length).to.equal(1);
      expect(pending[0].swapId).to.equal(2);
    });

    it("getSwap devrait échouer pour un swap inexistant", async function () {
      const { trade } = await loadFixture(deployTradeFixture);

      await expect(trade.getSwap(999)).to.be.revertedWith(
        "Swap does not exist",
      );
    });

    it("isTokenInActiveSwap devrait retourner false pour un token libre", async function () {
      const { trade } = await loadFixture(deployTradeFixture);

      expect(await trade.isTokenInActiveSwap(0)).to.be.false;
    });
  });

  describe("Scénarios complexes", function () {
    it("Devrait permettre plusieurs propositions successives après résolution", async function () {
      const { trade, rewardNFT, alice, bob, charlie } = await loadFixture(
        deployTradeFixture,
      );

      await rewardNFT
        .connect(alice)
        .setApprovalForAll(await trade.getAddress(), true);
      await rewardNFT
        .connect(bob)
        .setApprovalForAll(await trade.getAddress(), true);

      await trade.connect(alice).proposeSwap(0, 2, bob.address);
      await trade.connect(bob).acceptSwap(1);

      await skipCooldown();
      
      await trade.connect(bob).proposeSwap(0, 4, charlie.address);

      const swap = await trade.getSwap(2);
      expect(swap.proposer).to.equal(bob.address);
      expect(swap.proposerTokenId).to.equal(0);
    });

    it("Devrait gérer plusieurs propositions simultanées de différents utilisateurs", async function () {
      const { trade, alice, bob, charlie } = await loadFixture(
        deployTradeFixture,
      );

      await trade.connect(alice).proposeSwap(0, 2, bob.address);

      await trade.connect(bob).proposeSwap(3, 4, charlie.address);

      const swap1 = await trade.getSwap(1);
      const swap2 = await trade.getSwap(2);

      expect(swap1.proposer).to.equal(alice.address);
      expect(swap2.proposer).to.equal(bob.address);
    });

    it("Workflow complet avec cooldowns", async function () {
          const { trade, rewardNFT, alice, bob } = await loadFixture(
            deployTradeFixture,
          );
    
          await rewardNFT
            .connect(alice)
            .setApprovalForAll(await trade.getAddress(), true);
          await rewardNFT
            .connect(bob)
            .setApprovalForAll(await trade.getAddress(), true);
    
          await trade.connect(alice).proposeSwap(0, 2, bob.address);
          
          await trade.connect(bob).acceptSwap(1);
    
          expect(await rewardNFT.ownerOf(0)).to.equal(bob.address);
          expect(await rewardNFT.ownerOf(2)).to.equal(alice.address);
    
          await expect(
            trade.connect(alice).proposeSwap(2, 3, bob.address)
          ).to.be.revertedWith("Cooldown: Veuillez patienter 5 minutes");
    
          await skipCooldown();
          
          await trade.connect(alice).proposeSwap(2, 3, bob.address);

          const bobCooldown = await trade.getCooldownRemaining(bob.address);
          
          if (bobCooldown > 0n) {
            await expect(
              trade.connect(bob).acceptSwap(2)
            ).to.be.revertedWith("Cooldown: Veuillez patienter 5 minutes");
            
            await skipCooldown();
          }
          
          await expect(trade.connect(bob).acceptSwap(2)).to.not.be.reverted;
          
          expect(await rewardNFT.ownerOf(2)).to.equal(bob.address);
          expect(await rewardNFT.ownerOf(3)).to.equal(alice.address);
        });
  });
});
