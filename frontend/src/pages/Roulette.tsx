import { useState } from 'react';
import roueCasino from '../images/roue_casino.jpg';
import './Roulette.css';

function Roulette() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedChip, setSelectedChip] = useState(0.1);
  const [lastNumber, setLastNumber] = useState<number | null>(null);

  const chipValues = [0.01, 0.1, 0.5, 1];

  // Numéros de la roulette avec leurs couleurs
  const rouletteNumbers = [
    { num: 0, color: 'green' },
    { num: 1, color: 'red' }, { num: 2, color: 'black' }, { num: 3, color: 'red' },
    { num: 4, color: 'black' }, { num: 5, color: 'red' }, { num: 6, color: 'black' },
    { num: 7, color: 'red' }, { num: 8, color: 'black' }, { num: 9, color: 'red' },
    { num: 10, color: 'black' }, { num: 11, color: 'black' }, { num: 12, color: 'red' },
    { num: 13, color: 'black' }, { num: 14, color: 'red' }, { num: 15, color: 'black' },
    { num: 16, color: 'red' }, { num: 17, color: 'black' }, { num: 18, color: 'red' },
    { num: 19, color: 'red' }, { num: 20, color: 'black' }, { num: 21, color: 'red' },
    { num: 22, color: 'black' }, { num: 23, color: 'red' }, { num: 24, color: 'black' },
    { num: 25, color: 'red' }, { num: 26, color: 'black' }, { num: 27, color: 'red' },
    { num: 28, color: 'black' }, { num: 29, color: 'black' }, { num: 30, color: 'red' },
    { num: 31, color: 'black' }, { num: 32, color: 'red' }, { num: 33, color: 'black' },
    { num: 34, color: 'red' }, { num: 35, color: 'black' }, { num: 36, color: 'red' },
  ];

  // Organisation des numéros en 3 lignes de 12 colonnes
  const row1 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
  const row2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
  const row3 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

  const connectWallet = async () => {
    console.log('Connexion au wallet...');
    setWalletConnected(true);
    setWalletAddress('0x1234...5678');
  };

  const handleNumberClick = (num: number) => {
    console.log(`Pari placé sur le ${num} avec un jeton de ${selectedChip} ETH`);
  };

  const handleSpin = () => {
    const randomNum = Math.floor(Math.random() * 37);
    setLastNumber(randomNum);
    console.log('Résultat:', randomNum);
  };

  const getNumberColor = (num: number): string => {
    const numData = rouletteNumbers.find(n => n.num === num);
    return numData?.color || 'green';
  };

  return (
    <div className="roulette">
      <header className="roulette-header">
        <h1>Casino</h1>
        <button 
          className="wallet-button"
          onClick={connectWallet}
        >
          {walletConnected ? ` ${walletAddress}` : ' Connecter Wallet'}
        </button>
      </header>

      <main className="roulette-content">
        {!walletConnected ? (
          <div className="connect-prompt">
            <h2>Connectez votre wallet pour jouer</h2>
            <p>Utilisez MetaMask ou un wallet compatible Ethereum</p>
          </div>
        ) : (
          <div className="game-container">
            {/* Zone supérieure avec la roue et infos */}
            <div className="top-section">
              <div className="info-left">
                <div className="last-number-display">
                  <div className={`number-box ${lastNumber !== null ? getNumberColor(lastNumber) : ''}`}>
                    {lastNumber !== null ? lastNumber : '--'}
                  </div>
                </div>
                <div className="limits">
                  <p>MIN: 0.01 ETH</p>
                  <p>MAX: 1 ETH</p>
                </div>
              </div>

              <div className="wheel-container">
                <img src={roueCasino} alt="Roue de roulette" className="wheel-image" />
              </div>

              <div className="info-right">
                <div className="history">
                  <p>HISTORIQUE</p>
                  <div className="history-grid">
                    {/* Placeholder pour l'historique */}
                  </div>
                </div>
              </div>
            </div>

            {/* Zone de paris */}
            <div className="betting-area">
              {/* Sélection des jetons */}
              <div className="chips-selector">
                {chipValues.map(value => (
                  <button
                    key={value}
                    className={`chip ${selectedChip === value ? 'selected' : ''}`}
                    onClick={() => setSelectedChip(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>

              {/* Table de paris */}
              <div className="betting-table">
                {/* Zone du 0 */}
                <div className="zero-section">
                  <button 
                    className="number-cell green"
                    onClick={() => handleNumberClick(0)}
                  >
                    0
                  </button>
                </div>

                {/* Grille principale */}
                <div className="numbers-grid">
                  {/* Ligne 1 */}
                  <div className="numbers-row">
                    {row1.map(num => (
                      <button
                        key={num}
                        className={`number-cell ${getNumberColor(num)}`}
                        onClick={() => handleNumberClick(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button className="column-bet">2to1</button>
                  </div>

                  {/* Ligne 2 */}
                  <div className="numbers-row">
                    {row2.map(num => (
                      <button
                        key={num}
                        className={`number-cell ${getNumberColor(num)}`}
                        onClick={() => handleNumberClick(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button className="column-bet">2to1</button>
                  </div>

                  {/* Ligne 3 */}
                  <div className="numbers-row">
                    {row3.map(num => (
                      <button
                        key={num}
                        className={`number-cell ${getNumberColor(num)}`}
                        onClick={() => handleNumberClick(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button className="column-bet">2to1</button>
                  </div>

                  {/* Douzaines */}
                  <div className="dozen-row">
                    <button className="dozen-bet">1st 12</button>
                    <button className="dozen-bet">2nd 12</button>
                    <button className="dozen-bet">3rd 12</button>
                  </div>

                  {/* Boutons d'action */}
                  <div className="action-buttons">
                    <button className="action-btn clear-btn">Effacer</button>
                    <button className="action-btn spin-btn" onClick={handleSpin}>LANCER</button>
                    <button className="action-btn double-btn">Doubler</button>
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
