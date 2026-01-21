import { expect } from "chai";
import hre from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("RewardNFT", function () {
  // Fixture pour déployer un contrat frais à chaque test
  async function deployRewardNFTFixture() {
    const [owner, player1, player2] = await hre.ethers.getSigners();
    
    const RewardNFTFactory = await hre.ethers.getContractFactory("RewardNFT");
    const rewardNFT = await RewardNFTFactory.deploy();

    return { rewardNFT, owner, player1, player2 };
  }

  describe("Déploiement", function () {
    it("Devrait définir le bon nom et symbole", async function () {
      const { rewardNFT } = await loadFixture(deployRewardNFTFixture);
      expect(await rewardNFT.name()).to.equal("RouletteReward");
      expect(await rewardNFT.symbol()).to.equal("REWARD");
    });

    it("Devrait définir le déployeur comme owner", async function () {
      const { rewardNFT, owner } = await loadFixture(deployRewardNFTFixture);
      expect(await rewardNFT.owner()).to.equal(owner.address);
    });

    it("Devrait avoir MAX_INVENTORY à 20", async function () {
      const { rewardNFT } = await loadFixture(deployRewardNFTFixture);
      expect(await rewardNFT.MAX_INVENTORY()).to.equal(20);
    });
  });

  describe("Mint de récompenses", function () {
    it("Devrait permettre au owner de mint une récompense", async function () {
      const { rewardNFT, player1 } = await loadFixture(deployRewardNFTFixture);
      
      const tx = await rewardNFT.mintReward(
        player1.address,
        "Peluche Commune",
        0,
        "QmTest123"
      );

      await expect(tx)
        .to.emit(rewardNFT, "RewardMinted")
        .withArgs(player1.address, 0, 0, "Peluche Commune");

      expect(await rewardNFT.ownerOf(0)).to.equal(player1.address);
    });

    it("Devrait incrémenter le compteur d'inventaire", async function () {
      const { rewardNFT, player1 } = await loadFixture(deployRewardNFTFixture);
      
      expect(await rewardNFT.userInventoryCount(player1.address)).to.equal(0);

      await rewardNFT.mintReward(
        player1.address,
        "Peluche 1",
        0,
        "QmTest1"
      );

      expect(await rewardNFT.userInventoryCount(player1.address)).to.equal(1);

      await rewardNFT.mintReward(
        player1.address,
        "Peluche 2",
        1,
        "QmTest2"
      );

      expect(await rewardNFT.userInventoryCount(player1.address)).to.equal(2);
    });

    it("Devrait stocker les métadonnées correctement", async function () {
      const { rewardNFT, player1 } = await loadFixture(deployRewardNFTFixture);
      
      await rewardNFT.mintReward(
        player1.address,
        "Golden Teddy",
        3,
        "QmLegendary123"
      );

      const metadata = await rewardNFT.getTokenMetadata(0);
      
      expect(metadata.name).to.equal("Golden Teddy");
      expect(metadata.rewardType).to.equal(3);
      expect(metadata.ipfsHash).to.equal("QmLegendary123");
      expect(metadata.previousOwners.length).to.equal(0);
      expect(metadata.createdAt).to.be.greaterThan(0);
      expect(metadata.lastTransferAt).to.equal(metadata.createdAt);
    });

    it("Ne devrait pas permettre à un non-owner de mint", async function () {
      const { rewardNFT, player1, player2 } = await loadFixture(deployRewardNFTFixture);
      
      await expect(
        rewardNFT.connect(player1).mintReward(
          player2.address,
          "Peluche",
          0,
          "QmTest"
        )
      ).to.be.revertedWithCustomError(rewardNFT, "OwnableUnauthorizedAccount");
    });

    it("Devrait générer des tokenIds séquentiels", async function () {
      const { rewardNFT, player1 } = await loadFixture(deployRewardNFTFixture);
      
      await rewardNFT.mintReward(player1.address, "NFT 1", 0, "Qm1");
      await rewardNFT.mintReward(player1.address, "NFT 2", 1, "Qm2");
      await rewardNFT.mintReward(player1.address, "NFT 3", 2, "Qm3");

      expect(await rewardNFT.ownerOf(0)).to.equal(player1.address);
      expect(await rewardNFT.ownerOf(1)).to.equal(player1.address);
      expect(await rewardNFT.ownerOf(2)).to.equal(player1.address);
    });
  });

  describe("Limite d'inventaire", function () {
    it("Devrait bloquer le mint si inventaire plein (20 max)", async function () {
      const { rewardNFT, player1 } = await loadFixture(deployRewardNFTFixture);
      
      for (let i = 0; i < 20; i++) {
        await rewardNFT.mintReward(
          player1.address,
          `Peluche ${i}`,
          0,
          `QmTest${i}`
        );
      }

      expect(await rewardNFT.userInventoryCount(player1.address)).to.equal(20);

      await expect(
        rewardNFT.mintReward(player1.address, "Peluche 21", 0, "QmTest21")
      ).to.be.revertedWith("Inventory is full (max 20 rewards)");
    });

    it("canReceiveReward devrait retourner false si inventaire plein", async function () {
      const { rewardNFT, player1 } = await loadFixture(deployRewardNFTFixture);
      
      for (let i = 0; i < 20; i++) {
        await rewardNFT.mintReward(player1.address, `NFT ${i}`, 0, `Qm${i}`);
      }

      expect(await rewardNFT.canReceiveReward(player1.address)).to.be.false;
    });

    it("canReceiveReward devrait retourner true si inventaire non plein", async function () {
      const { rewardNFT, player1 } = await loadFixture(deployRewardNFTFixture);
      
      await rewardNFT.mintReward(player1.address, "NFT 1", 0, "Qm1");
      expect(await rewardNFT.canReceiveReward(player1.address)).to.be.true;
    });
  });

  describe("Transferts de NFTs", function () {
    it("Devrait permettre le transfert d'un NFT", async function () {
      const { rewardNFT, player1, player2 } = await loadFixture(deployRewardNFTFixture);
      
      await rewardNFT.mintReward(player1.address, "Test NFT", 1, "QmTest");

      await rewardNFT.connect(player1).transferFrom(
        player1.address,
        player2.address,
        0
      );

      expect(await rewardNFT.ownerOf(0)).to.equal(player2.address);
    });

    it("Devrait mettre à jour les compteurs d'inventaire lors du transfert", async function () {
      const { rewardNFT, player1, player2 } = await loadFixture(deployRewardNFTFixture);
      
      await rewardNFT.mintReward(player1.address, "Test NFT", 1, "QmTest");

      expect(await rewardNFT.userInventoryCount(player1.address)).to.equal(1);
      expect(await rewardNFT.userInventoryCount(player2.address)).to.equal(0);

      await rewardNFT.connect(player1).transferFrom(
        player1.address,
        player2.address,
        0
      );

      expect(await rewardNFT.userInventoryCount(player1.address)).to.equal(0);
      expect(await rewardNFT.userInventoryCount(player2.address)).to.equal(1);
    });

    it("Devrait ajouter l'ancien propriétaire à l'historique", async function () {
      const { rewardNFT, player1, player2 } = await loadFixture(deployRewardNFTFixture);
      
      await rewardNFT.mintReward(player1.address, "Test NFT", 1, "QmTest");

      await rewardNFT.connect(player1).transferFrom(
        player1.address,
        player2.address,
        0
      );

      const metadata = await rewardNFT.getTokenMetadata(0);
      expect(metadata.previousOwners.length).to.equal(1);
      expect(metadata.previousOwners[0]).to.equal(player1.address);
    });

    it("Devrait mettre à jour lastTransferAt", async function () {
      const { rewardNFT, player1, player2 } = await loadFixture(deployRewardNFTFixture);
      
      await rewardNFT.mintReward(player1.address, "Test NFT", 1, "QmTest");

      const metadataBefore = await rewardNFT.getTokenMetadata(0);
      
      await time.increase(3600);

      await rewardNFT.connect(player1).transferFrom(
        player1.address,
        player2.address,
        0
      );

      const metadataAfter = await rewardNFT.getTokenMetadata(0);
      expect(metadataAfter.lastTransferAt).to.be.greaterThan(
        metadataBefore.lastTransferAt
      );
    });

    it("Devrait bloquer le transfert si le destinataire a l'inventaire plein", async function () {
      const { rewardNFT, player1, player2 } = await loadFixture(deployRewardNFTFixture);
      
      await rewardNFT.mintReward(player1.address, "Test NFT", 1, "QmTest");

      for (let i = 0; i < 20; i++) {
        await rewardNFT.mintReward(player2.address, `NFT ${i}`, 0, `Qm${i}`);
      }

      await expect(
        rewardNFT.connect(player1).transferFrom(
          player1.address,
          player2.address,
          0
        )
      ).to.be.revertedWith("Recipient inventory is full");
    });

    it("Devrait gérer plusieurs transferts successifs", async function () {
      const { rewardNFT, owner, player1, player2 } = await loadFixture(deployRewardNFTFixture);
      
      await rewardNFT.mintReward(player1.address, "Test NFT", 1, "QmTest");

      await rewardNFT.connect(player1).transferFrom(
        player1.address,
        player2.address,
        0
      );

      await rewardNFT.connect(player2).transferFrom(
        player2.address,
        owner.address,
        0
      );

      const metadata = await rewardNFT.getTokenMetadata(0);
      expect(metadata.previousOwners.length).to.equal(2);
      expect(metadata.previousOwners[0]).to.equal(player1.address);
      expect(metadata.previousOwners[1]).to.equal(player2.address);
      expect(await rewardNFT.ownerOf(0)).to.equal(owner.address);
    });
  });

  describe("Fonctions de lecture", function () {
    it("getInventoryCount devrait retourner le bon nombre", async function () {
      const { rewardNFT, player1 } = await loadFixture(deployRewardNFTFixture);
      
      expect(await rewardNFT.getInventoryCount(player1.address)).to.equal(0);

      await rewardNFT.mintReward(player1.address, "NFT 1", 0, "Qm1");
      expect(await rewardNFT.getInventoryCount(player1.address)).to.equal(1);

      await rewardNFT.mintReward(player1.address, "NFT 2", 1, "Qm2");
      expect(await rewardNFT.getInventoryCount(player1.address)).to.equal(2);
    });

    it("getTokenMetadata devrait échouer pour un token inexistant", async function () {
      const { rewardNFT } = await loadFixture(deployRewardNFTFixture);
      
      await expect(
        rewardNFT.getTokenMetadata(999)
      ).to.be.revertedWith("Token does not exist");
    });
  });

  describe("Types de récompenses", function () {
    it("Devrait gérer tous les types de récompenses", async function () {
      const { rewardNFT, player1 } = await loadFixture(deployRewardNFTFixture);
      
      await rewardNFT.mintReward(player1.address, "Common", 0, "Qm1");
      expect((await rewardNFT.getTokenMetadata(0)).rewardType).to.equal(0);

      await rewardNFT.mintReward(player1.address, "Rare", 1, "Qm2");
      expect((await rewardNFT.getTokenMetadata(1)).rewardType).to.equal(1);

      await rewardNFT.mintReward(player1.address, "Epic", 2, "Qm3");
      expect((await rewardNFT.getTokenMetadata(2)).rewardType).to.equal(2);

      await rewardNFT.mintReward(player1.address, "Legendary", 3, "Qm4");
      expect((await rewardNFT.getTokenMetadata(3)).rewardType).to.equal(3);
    });
  });
});