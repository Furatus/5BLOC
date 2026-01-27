import { useState, useEffect } from "react";
import web3Service from "../services/ethersService";
import tradeService, { TradeOffer } from "../services/tradeService";
import nftService, { NFTMetadata } from "../services/rewardNFTService";
import Navigation from "../components/Navigation";
import { formatAddress } from "../utils/helpers";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../utils/constants";
import "./Trade.css";

function Trade() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const [myNFTs, setMyNFTs] = useState<NFTMetadata[]>([]);

  const [selectedMyNFT, setSelectedMyNFT] = useState<number | null>(null);
  const [requestedNFTId, setRequestedNFTId] = useState<string>("");

  const [myOffers, setMyOffers] = useState<TradeOffer[]>([]);
  const [allOffers, setAllOffers] = useState<TradeOffer[]>([]);
  const [activeTab, setActiveTab] = useState<"create" | "myOffers" | "browse">(
    "create",
  );

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
      loadData();
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
      loadData();
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

  const loadData = async () => {
    try {
      setLoading(true);

      const nfts = await nftService.getUserNFTs(walletAddress);

      setMyNFTs(nfts);

      const offers = await tradeService.getUserOffers(walletAddress);

      const activeUserOffers = offers.filter((o) => o.isActive);

      setMyOffers(activeUserOffers);

      const active = await tradeService.getActiveOffers();

      const othersOffers = active.filter(
        (o) => o.creator.toLowerCase() !== walletAddress.toLowerCase(),
      );

      setAllOffers(othersOffers);
    } catch (error) {
      console.error("Erreur chargement données:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    if (selectedMyNFT === null || !requestedNFTId) {
      alert(
        "Veuillez sélectionner un NFT à proposer et entrer l'ID du NFT demandé",
      );
      return;
    }

    try {
      setLoading(true);

      const requestedId = parseInt(requestedNFTId);

      try {
        await nftService.getNFTMetadata(requestedId);
      } catch (error) {
        alert(`Le NFT #${requestedId} n'existe pas. Vérifiez l'ID.`);
        setLoading(false);
        return;
      }

      const isApproved = await nftService.isApprovedForTrading(selectedMyNFT);

      if (!isApproved) {
        const approvalHash = await nftService.approveTradeContract(
          selectedMyNFT,
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const isNowApproved = await nftService.isApprovedForTrading(
          selectedMyNFT,
        );
        if (!isNowApproved) {
          throw new Error("L'approbation n'a pas été confirmée");
        }
      }

      const offerId = await tradeService.createOffer(
        selectedMyNFT,
        requestedId,
      );

      alert(
        `Offre créée avec succès ! ID: ${offerId}\n\nIMPORTANT: Votre NFT reste approuvé jusqu'à l'échange.`,
      );

      setSelectedMyNFT(null);
      setRequestedNFTId("");

      await loadData();
    } catch (error: any) {
      console.error("Erreur création offre:", error);

      if (error.code === 4001) {
        alert(ERROR_MESSAGES.USER_REJECTED);
      } else if (
        error.message?.includes("does not exist") ||
        error.message?.includes("execution reverted")
      ) {
        alert("Le NFT demandé n'existe pas ou n'est plus disponible.");
      } else {
        alert("Erreur: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOffer = async (offerId: number) => {
    if (!confirm(`Voulez-vous vraiment annuler l'offre #${offerId} ?`)) {
      return;
    }

    try {
      setLoading(true);

      await tradeService.cancelOffer(offerId);

      alert(" Offre annulée avec succès !");

      await loadData();
    } catch (error: any) {
      console.error("Erreur annulation offre:", error);
      alert("Erreur: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (offer: TradeOffer) => {
    if (
      !confirm(
        `Voulez-vous échanger votre NFT #${offer.requestedNFT} contre le NFT #${offer.creatorNFT} ?`,
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      const ownsNFT = myNFTs.some((nft) => nft.tokenId === offer.requestedNFT);
      if (!ownsNFT) {
        alert("Vous ne possédez pas le NFT demandé");
        setLoading(false);
        return;
      }

      const creatorNFTApproved = await nftService.isApprovedForTrading(
        offer.creatorNFT,
      );
      if (!creatorNFTApproved) {
        alert(
          "Le créateur de l'offre n'a plus approuvé son NFT. L'offre ne peut pas être acceptée.",
        );
        setLoading(false);
        return;
      }

      const isApproved = await nftService.isApprovedForTrading(
        offer.requestedNFT,
      );

      if (!isApproved) {
        const approvalHash = await nftService.approveTradeContract(
          offer.requestedNFT,
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const isNowApproved = await nftService.isApprovedForTrading(
          offer.requestedNFT,
        );
        if (!isNowApproved) {
          throw new Error("L'approbation n'a pas été confirmée");
        }
      }

      await tradeService.acceptOffer(offer.offerId);

      alert("Échange effectué avec succès !");

      await loadData();
    } catch (error: any) {
      console.error("Erreur acceptation offre:", error);

      if (
        error.message?.includes("NotApproved") ||
        error.data?.includes("177e802f")
      ) {
        alert(
          "Erreur d'approbation. Assurez-vous que tous les NFTs sont approuvés pour l'échange.",
        );
      } else if (error.message?.includes("does not own")) {
        alert("Vous ne possédez pas le NFT demandé");
      } else if (error.code === 4001) {
        alert(ERROR_MESSAGES.USER_REJECTED);
      } else {
        alert("Erreur: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getNFTById = (tokenId: number): NFTMetadata | undefined => {
    return myNFTs.find((nft) => nft.tokenId === tokenId);
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

  return (
    <div className="trade">
      <header className="trade-header">
        <h1> Trading NFT</h1>
        <Navigation />
        <button className="wallet-button" onClick={connectWallet}>
          {walletConnected
            ? formatAddress(walletAddress)
            : " Connecter MetaMask"}
        </button>
      </header>

      <main className="trade-content">
        {!walletConnected ? (
          <div className="connect-prompt">
            <h2>Connectez votre wallet pour échanger des NFTs</h2>
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
            <div className="tabs">
              <button
                className={`tab ${activeTab === "create" ? "active" : ""}`}
                onClick={() => setActiveTab("create")}
              >
                Créer une offre
              </button>
              <button
                className={`tab ${activeTab === "myOffers" ? "active" : ""}`}
                onClick={() => setActiveTab("myOffers")}
              >
                Mes offres ({myOffers.length})
              </button>
              <button
                className={`tab ${activeTab === "browse" ? "active" : ""}`}
                onClick={() => setActiveTab("browse")}
              >
                Parcourir ({allOffers.length})
              </button>
            </div>

            <div className="tab-content">
              {activeTab === "create" && (
                <div className="create-offer">
                  <h2>Créer une nouvelle offre d'échange</h2>

                  {myNFTs.length === 0 ? (
                    <div className="empty-state">
                      <p>Vous n'avez aucun NFT à échanger</p>
                      <a href="/roulette" className="play-button">
                        Jouer à la roulette
                      </a>
                    </div>
                  ) : (
                    <>
                      <div className="form-section">
                        <h3>1. Sélectionnez le NFT que vous proposez</h3>
                        <div className="nft-grid">
                          {myNFTs.map((nft) => (
                            <div
                              key={nft.tokenId}
                              className={`nft-card ${
                                selectedMyNFT === nft.tokenId ? "selected" : ""
                              }`}
                              onClick={() => setSelectedMyNFT(nft.tokenId)}
                            >
                              <div className="nft-image">
                                <img
                                  src={nft.imageUrl}
                                  alt={nft.name}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "https:/via.placeholder.com/150?text=NFT";
                                  }}
                                />
                              </div>
                              <div className="nft-info">
                                <h4>{nft.name}</h4>
                                <span
                                  className="nft-rarity"
                                  style={{
                                    color: getRarityColor(nft.rewardTypeName),
                                  }}
                                >
                                  {nft.rewardTypeName}
                                </span>
                                <span className="nft-id">#{nft.tokenId}</span>
                              </div>
                              {selectedMyNFT === nft.tokenId && (
                                <div className="selected-badge">✓</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="form-section">
                        <h3>2. Entrez l'ID du NFT que vous demandez</h3>
                        <input
                          type="number"
                          placeholder="Ex: 42"
                          value={requestedNFTId}
                          onChange={(e) => setRequestedNFTId(e.target.value)}
                          className="nft-id-input"
                          min="0"
                        />
                        <p className="help-text">
                          Trouvez l'ID du NFT dans l'inventaire du joueur ou
                          dans l'onglet "Parcourir"
                        </p>
                      </div>

                      <button
                        className="create-button"
                        onClick={handleCreateOffer}
                        disabled={
                          loading || selectedMyNFT === null || !requestedNFTId
                        }
                      >
                        {loading ? "Création..." : "Créer l'offre"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {activeTab === "myOffers" && (
                <div className="my-offers">
                  <div className="section-header">
                    <h2>Mes offres actives</h2>
                    <button
                      onClick={loadData}
                      disabled={loading}
                      className="refresh-btn"
                    >
                      {loading ? "" : ""} Rafraîchir
                    </button>
                  </div>

                  {myOffers.length === 0 ? (
                    <div className="empty-state">
                      <p>Vous n'avez aucune offre active</p>
                    </div>
                  ) : (
                    <div className="offers-list">
                      {myOffers.map((offer) => {
                        const myNFT = getNFTById(offer.creatorNFT);
                        return (
                          <div key={offer.offerId} className="offer-card">
                            <div className="offer-header">
                              <h3>Offre #{offer.offerId}</h3>
                              <span className="offer-date">
                                {new Date(
                                  offer.createdAt * 1000,
                                ).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <div className="offer-body">
                              <div className="offer-nft">
                                <span className="label">Vous proposez</span>
                                {myNFT ? (
                                  <div className="nft-preview">
                                    <img
                                      src={myNFT.imageUrl}
                                      alt={myNFT.name}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          "https://oops.com";
                                      }}
                                    />
                                    <div>
                                      <div>{myNFT.name}</div>
                                      <div
                                        style={{
                                          color: getRarityColor(
                                            myNFT.rewardTypeName,
                                          ),
                                        }}
                                      >
                                        {myNFT.rewardTypeName}
                                      </div>
                                      <div className="token-id">
                                        #{offer.creatorNFT}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div>NFT #{offer.creatorNFT}</div>
                                )}
                              </div>
                              <div className="exchange-arrow">⇄</div>
                              <div className="offer-nft">
                                <span className="label">Vous demandez</span>
                                <div className="nft-preview">
                                  <div className="token-id-big">
                                    #{offer.requestedNFT}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="offer-actions">
                              <button
                                className="cancel-button"
                                onClick={() => handleCancelOffer(offer.offerId)}
                                disabled={loading}
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "browse" && (
                <div className="browse-offers">
                  <div className="section-header">
                    <h2>Offres disponibles</h2>
                    <button
                      onClick={loadData}
                      disabled={loading}
                      className="refresh-btn"
                    >
                      {loading ? "" : ""} Rafraîchir
                    </button>
                  </div>

                  {allOffers.length === 0 ? (
                    <div className="empty-state">
                      <p>Aucune offre disponible pour le moment</p>
                    </div>
                  ) : (
                    <div className="offers-list">
                      {allOffers.map((offer) => {
                        const canAccept = myNFTs.some(
                          (nft) => nft.tokenId === offer.requestedNFT,
                        );
                        return (
                          <div key={offer.offerId} className="offer-card">
                            <div className="offer-header">
                              <h3>Offre #{offer.offerId}</h3>
                              <span className="offer-creator">
                                Par {formatAddress(offer.creator)}
                              </span>
                            </div>
                            <div className="offer-body">
                              <div className="offer-nft">
                                <span className="label">Offre</span>
                                <div className="token-id-big">
                                  #{offer.creatorNFT}
                                </div>
                              </div>
                              <div className="exchange-arrow">⇄</div>
                              <div className="offer-nft">
                                <span className="label">Demande</span>
                                <div className="token-id-big">
                                  #{offer.requestedNFT}
                                  {canAccept && (
                                    <span className="badge-own">
                                      Vous l'avez !
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="offer-actions">
                              <button
                                className="accept-button"
                                onClick={() => handleAcceptOffer(offer)}
                                disabled={loading || !canAccept}
                              >
                                {canAccept
                                  ? " Accepter l'échange"
                                  : " Vous n'avez pas ce NFT"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Trade;
