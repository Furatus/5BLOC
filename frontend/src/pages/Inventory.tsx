import { useState, useEffect } from "react";
import web3Service from "../services/ethersService";
import nftService, { NFTMetadata } from "../services/rewardNFTService";
import { formatAddress } from "../utils/helpers";
import { ERROR_MESSAGES } from "../utils/constants";
import "./Inventory.css";
import Navigation from "../components/Navigation";
import ipfsService from "../services/ipfsService";

function Inventory() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [nfts, setNfts] = useState<NFTMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [inventoryStatus, setInventoryStatus] = useState({
    current: 0,
    max: 0,
    canReceive: false,
    percentage: 0,
  });
  const [selectedNFT, setSelectedNFT] = useState<NFTMetadata | null>(null);

  useEffect(() => {
    web3Service.onAccountsChanged(handleAccountsChanged);
    web3Service.onChainChanged(handleChainChanged);
    checkIfWalletIsConnected();

    return () => {
      web3Service.cleanup();
    };
  }, []);

  useEffect(() => {
    if (walletConnected && walletAddress) {
      loadInventory();
    }
  }, [walletConnected, walletAddress]);

  const checkIfWalletIsConnected = async () => {
    try {
      if (web3Service.isMetaMaskInstalled()) {
        const address = await web3Service.getAddress();
        if (address) {
          setWalletConnected(true);
          setWalletAddress(address);
        }
      }
    } catch (error) {}
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setWalletConnected(false);
      setWalletAddress("");
    } else {
      setWalletAddress(accounts[0]);
      loadInventory();
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const connectWallet = async () => {
    try {
      const address = await web3Service.connectWallet();
      setWalletConnected(true);
      setWalletAddress(address);
    } catch (error: any) {
      console.error("Erreur connexion wallet:", error);
      alert(error.message || ERROR_MESSAGES.WALLET_NOT_CONNECTED);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);

      const userNFTs = await nftService.getUserNFTs(walletAddress);
      setNfts(userNFTs);

      const status = await nftService.getInventoryStatus(walletAddress);
      setInventoryStatus(status);

      console.log(" Inventaire chargé:", userNFTs.length, "NFTs");
    } catch (error) {
      console.error("Erreur chargement inventaire:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string): string => {
    const colors: { [key: string]: string } = {
      COMMON: "#9ca3af",
      RARE: "#3b82f6",
      EPIC: "#a855f7",
      LEGENDARY: "#f59e0b",
    };
    return colors[rarity] || "#9ca3af";
  };

  const getRarityGradient = (rarity: string): string => {
    const gradients: { [key: string]: string } = {
      COMMON: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)",
      RARE: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
      EPIC: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
      LEGENDARY: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
    };
    return gradients[rarity] || gradients.COMMON;
  };

  return (
    <div className="inventory">
      <header className="inventory-header">
        <h1>Mon Inventaire</h1>
        <Navigation />
        <button className="wallet-button" onClick={connectWallet}>
          {walletConnected
            ? formatAddress(walletAddress)
            : "Connecter MetaMask"}
        </button>
      </header>

      <main className="inventory-content">
        {!walletConnected ? (
          <div className="connect-prompt">
            <h2>Connectez votre wallet pour voir votre inventaire</h2>
            <button
              onClick={connectWallet}
              style={{
                padding: "15px 30px",
                fontSize: "18px",
                marginTop: "20px",
              }}
            >
              Connecter MetaMask
            </button>
          </div>
        ) : (
          <>
            <div className="inventory-status">
              <div className="status-header">
                <h2>Capacité de l'inventaire</h2>
                <span className="status-count">
                  {inventoryStatus.current} / {inventoryStatus.max}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${inventoryStatus.percentage}%`,
                    backgroundColor:
                      inventoryStatus.percentage >= 100 ? "#ef4444" : "#4ade80",
                  }}
                />
              </div>
              {!inventoryStatus.canReceive && (
                <p className="warning">
                  Inventaire plein ! Vous devez échanger ou vendre des NFTs.
                </p>
              )}
            </div>

            <div className="actions">
              <button
                onClick={loadInventory}
                disabled={loading}
                className="refresh-button"
              >
                {loading ? " Chargement..." : " Rafraîchir"}
              </button>
            </div>

            {loading ? (
              <div className="loading">Chargement de votre inventaire...</div>
            ) : nfts.length === 0 ? (
              <div className="empty-inventory">
                <h2> Votre inventaire est vide</h2>
                <p>Jouez à la roulette pour gagner des récompenses NFT !</p>
                <a href="/roulette" className="play-button">
                  Jouer maintenant
                </a>
              </div>
            ) : (
              <div className="nft-grid">
                {nfts.map((nft) => (
                  <div
                    key={nft.tokenId}
                    className="nft-card"
                    onClick={() => setSelectedNFT(nft)}
                    style={{
                      background: getRarityGradient(nft.rewardTypeName),
                      cursor: "pointer",
                    }}
                  >
                    <div className="nft-image">
                      <img
                        src={nft.imageUrl}
                        alt={nft.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes("ipfs.io")) {
                            target.src = ipfsService.getPublicImageUrl(
                              nft.ipfsHash,
                            );
                          } else {
                            target.src =
                              "https://via.placeholder.com/200?text=NFT";
                          }
                        }}
                      />
                    </div>
                    <div className="nft-info">
                      <h3>{nft.name}</h3>
                      <div
                        className="nft-rarity"
                        style={{ color: getRarityColor(nft.rewardTypeName) }}
                      >
                        {nft.rewardTypeName}
                      </div>
                      <div className="nft-id">#{nft.tokenId}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedNFT && (
              <div
                className="modal-overlay"
                onClick={() => setSelectedNFT(null)}
              >
                <div
                  className="modal-content"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="modal-close"
                    onClick={() => setSelectedNFT(null)}
                  >
                    ✕
                  </button>
                  <div className="modal-body">
                    <div className="modal-image">
                      <img
                        src={selectedNFT.imageUrl}
                        alt={selectedNFT.name}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes("ipfs.io")) {
                            target.src = ipfsService.getPublicImageUrl(
                              selectedNFT.ipfsHash,
                            );
                          } else {
                            target.src =
                              "https://via.placeholder.com/200?text=NFT";
                          }
                        }}
                      />
                    </div>
                    <div className="modal-details">
                      <h2>{selectedNFT.name}</h2>
                      <div className="detail-row">
                        <span>Rareté:</span>
                        <span
                          className="rarity-badge"
                          style={{
                            background: getRarityGradient(
                              selectedNFT.rewardTypeName,
                            ),
                            color: "white",
                            padding: "5px 15px",
                            borderRadius: "20px",
                          }}
                        >
                          {selectedNFT.rewardTypeName}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>Token ID:</span>
                        <span>#{selectedNFT.tokenId}</span>
                      </div>
                      <div className="detail-row">
                        <span>Propriétaire:</span>
                        <span>{formatAddress(selectedNFT.owner)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Créé le:</span>
                        <span>
                          {new Date(
                            selectedNFT.createdAt * 1000,
                          ).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span>IPFS:</span>
                        <a
                          href={selectedNFT.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#3b82f6" }}
                        >
                          Voir sur IPFS
                        </a>
                      </div>
                      <div className="modal-actions">
                        <a href="/trade" className="trade-button">
                          Échanger ce NFT
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Inventory;
