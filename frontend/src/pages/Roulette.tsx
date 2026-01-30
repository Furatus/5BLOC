import { useState, useEffect } from "react";
import "./Roulette.css";
import RouletteWheel from "../components/RouletteWheel";

import web3Service from "../services/ethersService";
import rouletteService, { GameResult, CooldownInfo } from "../services/rouletteService";

import { formatAddress } from "../utils/helpers";
import { BetType } from "../config/contracts";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../utils/constants";
import Navigation from "../components/Navigation";

function Roulette() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [balance, setBalance] = useState("0");

  const [ticketPrice, setTicketPrice] = useState("0");
  const [loading, setLoading] = useState(false);
  const [lastNumber, setLastNumber] = useState<number | null>(null);
  const [currentBet, setCurrentBet] = useState<{
    type: number;
    number: number;
  } | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);

  const [cooldown, setCooldown] = useState<CooldownInfo>({
    isActive: false,
    remainingSeconds: 0,
  });

  const rouletteNumbers = [
    { num: 0, color: "green" },
    { num: 1, color: "red" },
    { num: 2, color: "black" },
    { num: 3, color: "red" },
    { num: 4, color: "black" },
    { num: 5, color: "red" },
    { num: 6, color: "black" },
    { num: 7, color: "red" },
    { num: 8, color: "black" },
    { num: 9, color: "red" },
    { num: 10, color: "black" },
    { num: 11, color: "black" },
    { num: 12, color: "red" },
    { num: 13, color: "black" },
    { num: 14, color: "red" },
    { num: 15, color: "black" },
    { num: 16, color: "red" },
    { num: 17, color: "black" },
    { num: 18, color: "red" },
    { num: 19, color: "red" },
    { num: 20, color: "black" },
    { num: 21, color: "red" },
    { num: 22, color: "black" },
    { num: 23, color: "red" },
    { num: 24, color: "black" },
    { num: 25, color: "red" },
    { num: 26, color: "black" },
    { num: 27, color: "red" },
    { num: 28, color: "black" },
    { num: 29, color: "black" },
    { num: 30, color: "red" },
    { num: 31, color: "black" },
    { num: 32, color: "red" },
    { num: 33, color: "black" },
    { num: 34, color: "red" },
    { num: 35, color: "black" },
    { num: 36, color: "red" },
  ];

  const row1 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
  const row2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
  const row3 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

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
      loadTicketPrice();
      loadBalance();
      loadHistory();
      loadCooldown();
    }
  }, [walletConnected, walletAddress]);

  // Timer pour décrémenter le cooldown localement
  useEffect(() => {
    if (!cooldown.isActive || cooldown.remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => {
        const newRemaining = prev.remainingSeconds - 1;
        if (newRemaining <= 0) {
          return { ...prev, isActive: false, remainingSeconds: 0 };
        }
        return { ...prev, remainingSeconds: newRemaining };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown.isActive, cooldown.remainingSeconds]);

  const loadCooldown = async () => {
    try {
      const info = await rouletteService.getCooldownInfo(walletAddress);
      setCooldown(info);
    } catch (error) {
      console.error("Erreur chargement cooldown:", error);
    }
  };

  const formatCooldownTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
      setBalance("0");
    } else {
      setWalletAddress(accounts[0]);
      loadBalance();
      loadHistory();
      loadCooldown();
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
      console.log(SUCCESS_MESSAGES.WALLET_CONNECTED);
    } catch (error: any) {
      console.error("Erreur connexion wallet:", error);
      alert(error.message || ERROR_MESSAGES.WALLET_NOT_CONNECTED);
    }
  };

  const loadTicketPrice = async () => {
    try {
      const price = await rouletteService.getTicketPrice();
      setTicketPrice(price);
    } catch (error) {
      console.error("Erreur chargement prix:", error);
    }
  };

  const loadBalance = async () => {
    try {
      const bal = await web3Service.getBalance(walletAddress);
      setBalance(bal);
    } catch (error) {
      console.error("Erreur chargement balance:", error);
    }
  };

  const loadHistory = async () => {
    try {
      const games = await rouletteService.getPlayerGames(walletAddress);
      const results = games
        .filter((game) => game.result !== undefined)
        .map((game) => game.result)
        .slice(-10);
      setHistory(results);
    } catch (error) {
      console.error("Erreur chargement historique:", error);
    }
  };

  const handleNumberClick = (num: number) => {
    if (num === 0) {
      setCurrentBet({ type: BetType.ZERO, number: 0 });
    } else {
      setCurrentBet({ type: BetType.NUMBER, number: num });
    }
  };

  const handleColorBet = (color: "red" | "black") => {
    setCurrentBet({
      type: color === "red" ? BetType.RED : BetType.BLACK,
      number: 0,
    });
  };

  const handleEvenOddBet = (type: "even" | "odd") => {
    setCurrentBet({
      type: type === "even" ? BetType.EVEN : BetType.ODD,
      number: 0,
    });
  };

  const handleDozenBet = (dozen: 1 | 2 | 3) => {
    const betType =
      dozen === 1
        ? BetType.DOZEN_1
        : dozen === 2
        ? BetType.DOZEN_2
        : BetType.DOZEN_3;
    setCurrentBet({ type: betType, number: 0 });
  };

  const handleColumnBet = (column: 1 | 2 | 3) => {
    const betType =
      column === 1
        ? BetType.COLUMN_1
        : column === 2
        ? BetType.COLUMN_2
        : BetType.COLUMN_3;
    setCurrentBet({ type: betType, number: 0 });
  };

  const handleSpin = async () => {
    if (!currentBet) {
      alert(ERROR_MESSAGES.NO_BET_SELECTED);
      return;
    }

    if (isSpinning) {
      return;
    }

    if (cooldown.isActive) {
      alert(`Cooldown actif ! Attendez encore ${formatCooldownTime(cooldown.remainingSeconds)}`);
      return;
    }

    try {
      setIsSpinning(true);
      setLoading(true);
      setGameResult(null);

      const result = await rouletteService.buyTicketAndSpin(
        currentBet.type,
        currentBet.number,
      );

      console.log("Résultat obtenu:", result);

      setLastNumber(result.result);

      setTimeout(() => {
        setGameResult(result);
        setHistory((prev) => [...prev.slice(-9), result.result]);
        setCurrentBet(null);
        loadBalance();
        loadCooldown(); 
        setIsSpinning(false);
        setLoading(false);
      }, 500);
    } catch (error: any) {
      console.error("ERREUR:", error);
      setIsSpinning(false);
      setLoading(false);

      if (error.code === 4001) {
        alert(ERROR_MESSAGES.USER_REJECTED);
      } else if (error.message?.includes("insufficient funds")) {
        alert(ERROR_MESSAGES.INSUFFICIENT_FUNDS);
      } else if (error.message?.includes("Cooldown")) {
        alert("Cooldown actif ! Veuillez patienter avant de rejouer.");
        loadCooldown();
      } else {
        alert(ERROR_MESSAGES.UNKNOWN_ERROR + ": " + error.message);
      }
    }
  };

  const handleClear = () => {
    setCurrentBet(null);
    setGameResult(null);
  };

  const getNumberColor = (num: number): string => {
    const numData = rouletteNumbers.find((n) => n.num === num);
    return numData?.color || "green";
  };

  const getBetTypeName = (betType: number): string => {
    const names: { [key: number]: string } = {
      [BetType.RED]: "ROUGE",
      [BetType.BLACK]: "NOIR",
      [BetType.EVEN]: "PAIR",
      [BetType.ODD]: "IMPAIR",
      [BetType.DOZEN_1]: "1-12",
      [BetType.DOZEN_2]: "13-24",
      [BetType.DOZEN_3]: "25-36",
      [BetType.COLUMN_1]: "Colonne 1",
      [BetType.COLUMN_2]: "Colonne 2",
      [BetType.COLUMN_3]: "Colonne 3",
      [BetType.NUMBER]: "Numéro",
      [BetType.ZERO]: "ZÉRO",
    };
    return names[betType] || "Inconnu";
  };

  return (
    <div className="roulette">
      <header className="roulette-header">
        <h1>Casino</h1>
        <Navigation />
        <button className="wallet-button" onClick={connectWallet}>
          {walletConnected
            ? formatAddress(walletAddress)
            : "Connecter MetaMask"}
        </button>
      </header>

      <main className="roulette-content">
        {!walletConnected ? (
          <div className="connect-prompt">
            <h2>Connectez votre wallet pour jouer</h2>
            <p>Utilisez MetaMask ou un wallet compatible Ethereum</p>
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
          <div className="game-container">
            <div className="top-section">
              <div className="info-left">
                <div className="last-number-display">
                  <div
                    className={`number-box ${
                      lastNumber !== null ? getNumberColor(lastNumber) : ""
                    }`}
                  >
                    {lastNumber !== null ? lastNumber : "--"}
                  </div>
                </div>
                <div className="limits">
                  <p>TICKET: {ticketPrice} ETH</p>
                  <p>SOLDE: {parseFloat(balance).toFixed(4)} ETH</p>
                  {currentBet && (
                    <p
                      style={{
                        color: "#4ade80",
                        fontWeight: "bold",
                        marginTop: "10px",
                      }}
                    >
                      Pari: {getBetTypeName(currentBet.type)}
                      {currentBet.type === BetType.NUMBER &&
                        ` (${currentBet.number})`}
                    </p>
                  )}
                  {cooldown.isActive && (
                    <p style={{ 
                      color: "#ef4444", 
                      fontWeight: "bold", 
                      marginTop: "10px",
                      padding: "8px",
                      backgroundColor: "rgba(239, 68, 68, 0.2)",
                      borderRadius: "5px"
                    }}>
                       Cooldown: {formatCooldownTime(cooldown.remainingSeconds)}
                    </p>
                  )}
                </div>
              </div>

              <div className="wheel-container">
                <RouletteWheel
                  isSpinning={isSpinning}
                  winningNumber={lastNumber}
                  onSpinComplete={() => {}}
                />
                {loading && !isSpinning && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      color: "white",
                      fontSize: "24px",
                      fontWeight: "bold",
                      background: "rgba(0,0,0,0.8)",
                      padding: "20px",
                      borderRadius: "10px",
                      textAlign: "center",
                    }}
                  >
                    <div>Transaction en cours...</div>
                    <div style={{ fontSize: "14px", marginTop: "10px" }}>
                      Vérifiez MetaMask
                    </div>
                  </div>
                )}
              </div>

              <div className="info-right">
                <div className="history">
                  <p>HISTORIQUE</p>
                  <div className="history-grid">
                    {history.map((num, index) => (
                      <div
                        key={index}
                        className={`history-number ${getNumberColor(num)}`}
                        style={{
                          width: "30px",
                          height: "30px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "50%",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {num}
                      </div>
                    ))}
                  </div>
                  {gameResult && (
                    <div
                      style={{
                        marginTop: "15px",
                        padding: "10px",
                        backgroundColor: gameResult.hasWon
                          ? "#4ade80"
                          : "#f87171",
                        borderRadius: "5px",
                        color: "white",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          fontWeight: "bold",
                          fontSize: "16px",
                          margin: "5px 0",
                        }}
                      >
                        {gameResult.hasWon ? "GAGNÉ !" : "PERDU"}
                      </p>
                      <p style={{ fontSize: "12px", margin: "5px 0" }}>
                        Numéro: {gameResult.result}
                      </p>
                      <p
                        style={{
                          fontSize: "10px",
                          margin: "5px 0",
                          wordBreak: "break-all",
                        }}
                      >
                        TX: {gameResult.txHash?.slice(0, 10)}...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="betting-area">
              <div className="simple-bets-column">
                <button
                  onClick={() => handleColorBet("red")}
                  className={`simple-bet-btn red ${
                    currentBet?.type === BetType.RED ? "selected-bet" : ""
                  }`}
                  disabled={loading || cooldown.isActive}
                >
                  ROUGE
                </button>
                <button
                  onClick={() => handleColorBet("black")}
                  className={`simple-bet-btn black ${
                    currentBet?.type === BetType.BLACK ? "selected-bet" : ""
                  }`}
                  disabled={loading || cooldown.isActive}
                >
                  NOIR
                </button>
                <button
                  onClick={() => handleEvenOddBet("even")}
                  className={`simple-bet-btn neutral ${
                    currentBet?.type === BetType.EVEN ? "selected-bet" : ""
                  }`}
                  disabled={loading || cooldown.isActive}
                >
                  PAIR
                </button>
                <button
                  onClick={() => handleEvenOddBet("odd")}
                  className={`simple-bet-btn neutral ${
                    currentBet?.type === BetType.ODD ? "selected-bet" : ""
                  }`}
                  disabled={loading || cooldown.isActive}
                >
                  IMPAIR
                </button>
              </div>

              <div className="betting-table">
                <div className="zero-section">
                  <button
                    className={`number-cell green ${
                      currentBet?.type === BetType.ZERO &&
                      currentBet.number === 0
                        ? "selected-bet"
                        : ""
                    }`}
                    onClick={() => handleNumberClick(0)}
                    disabled={loading || cooldown.isActive}
                  >
                    0
                  </button>
                </div>

                <div className="numbers-grid">
                  <div className="numbers-row">
                    {row1.map((num) => (
                      <button
                        key={num}
                        className={`number-cell ${getNumberColor(num)} ${
                          currentBet?.type === BetType.NUMBER &&
                          currentBet.number === num
                            ? "selected-bet"
                            : ""
                        }`}
                        onClick={() => handleNumberClick(num)}
                        disabled={loading || cooldown.isActive}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      className={`column-bet ${
                        currentBet?.type === BetType.COLUMN_1
                          ? "selected-bet"
                          : ""
                      }`}
                      onClick={() => handleColumnBet(1)}
                      disabled={loading || cooldown.isActive}
                    >
                      2to1
                    </button>
                  </div>

                  <div className="numbers-row">
                    {row2.map((num) => (
                      <button
                        key={num}
                        className={`number-cell ${getNumberColor(num)} ${
                          currentBet?.type === BetType.NUMBER &&
                          currentBet.number === num
                            ? "selected-bet"
                            : ""
                        }`}
                        onClick={() => handleNumberClick(num)}
                        disabled={loading || cooldown.isActive}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      className={`column-bet ${
                        currentBet?.type === BetType.COLUMN_2
                          ? "selected-bet"
                          : ""
                      }`}
                      onClick={() => handleColumnBet(2)}
                      disabled={loading || cooldown.isActive}
                    >
                      2to1
                    </button>
                  </div>

                  <div className="numbers-row">
                    {row3.map((num) => (
                      <button
                        key={num}
                        className={`number-cell ${getNumberColor(num)} ${
                          currentBet?.type === BetType.NUMBER &&
                          currentBet.number === num
                            ? "selected-bet"
                            : ""
                        }`}
                        onClick={() => handleNumberClick(num)}
                        disabled={loading || cooldown.isActive}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      className={`column-bet ${
                        currentBet?.type === BetType.COLUMN_3
                          ? "selected-bet"
                          : ""
                      }`}
                      onClick={() => handleColumnBet(3)}
                      disabled={loading || cooldown.isActive}
                    >
                      2to1
                    </button>
                  </div>

                  <div className="dozen-row">
                    <button
                      className={`dozen-bet ${
                        currentBet?.type === BetType.DOZEN_1
                          ? "selected-bet"
                          : ""
                      }`}
                      onClick={() => handleDozenBet(1)}
                      disabled={loading || cooldown.isActive}
                    >
                      1st 12
                    </button>
                    <button
                      className={`dozen-bet ${
                        currentBet?.type === BetType.DOZEN_2
                          ? "selected-bet"
                          : ""
                      }`}
                      onClick={() => handleDozenBet(2)}
                      disabled={loading || cooldown.isActive}
                    >
                      2nd 12
                    </button>
                    <button
                      className={`dozen-bet ${
                        currentBet?.type === BetType.DOZEN_3
                          ? "selected-bet"
                          : ""
                      }`}
                      onClick={() => handleDozenBet(3)}
                      disabled={loading || cooldown.isActive}
                    >
                      3rd 12
                    </button>
                  </div>

                  <div className="action-buttons">
                    <button
                      className="action-btn clear-btn"
                      onClick={handleClear}
                      disabled={loading}
                    >
                      Effacer
                    </button>
                    <button
                      className="action-btn spin-btn"
                      onClick={handleSpin}
                      disabled={loading || !currentBet || cooldown.isActive}
                      style={cooldown.isActive ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                    >
                      {loading 
                        ? "EN COURS..." 
                        : cooldown.isActive 
                          ? `ATTENDRE ${formatCooldownTime(cooldown.remainingSeconds)}` 
                          : "LANCER"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="roulette-footer">
        <p>DApp décentralisée - Smart Contract Ethereum</p>
      </footer>
    </div>
  );
}

export default Roulette;
