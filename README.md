# 5BLOC - Casino Roulette Blockchain

Application décentralisée (DApp) de casino basée sur la blockchain Ethereum, permettant de jouer à la roulette et de gagner des NFTs échangeables.

---

## Description du jeu

**5BLOC** est un projet DApp casino de roulette sur la blockchain Ethereum où les joueurs peuvent :

- **Jouer à la roulette** en achetant des tickets pour 0.01 ETH
- **Gagner des NFTs** de différentes raretés en fonction du type de pari
- **Échanger des NFTs** avec d'autres joueurs via un système de trade
- **Collectionner jusqu'à 20 NFTs** dans leur inventaire

Le jeu combine les mécaniques classiques de la roulette avec la technologie blockchain pour offrir une expérience de jeu transparente et vérifiable.

---

## Ce qu'on peut gagner

Le système de récompenses est basé sur 4 raretés de NFTs, chacune avec une image unique stockée sur IPFS :

### 1. **LEGENDARY - "Legendary Loo"** (Rareté maximale)

- **Comment gagner** : Parier sur le zéro et gagner
- **Probabilité** : 1/37
- **Récompense** : Le NFT le plus rare du jeu

### 2. **EPIC - "Epic Matthias"** (Très rare)

- **Comment gagner** : Parier sur un numéro spécifique (1-36) et gagner
- **Probabilité** : 1/37 par numéro
- **Récompense** : NFT de haute valeur

### 3. **RARE - "Rare Cat"** (Rare)

- **Comment gagner** : Gagner un pari sur :
  - Une **douzaine** (1-12, 13-24, 25-36) -> 12/37
  - Une **colonne** (1-34-7-..., 2-35-8-..., 3-36-9-...) -> 12/37
- **Récompense** : NFT intermédiaire

### 4. **COMMON - "Common Blahaj"** (Commun)

- **Comment gagner** : Gagner un pari sur :
  - **Rouge ou Noir** -> 18/37
  - **Pair ou Impair** -> 18/37
- **Récompense** : NFT de base, le plus facile à obtenir

> **Note importante** : L'inventaire est limité à 20 NFTs par joueur. Si votre inventaire est plein, vous ne recevrez pas de nouvelles récompenses même si vous gagnez !

---

## Règles du jeu

### Règles de la roulette

#### Prix du ticket

- **Coût par partie** : 0.01 ETH (fixe)
- Le paiement est vérifié automatiquement par le smart contract

#### Types de paris disponibles

| Type de pari | Description                    | Probabilité | NFT gagné |
| ------------ | ------------------------------ | ----------- | --------- |
| **ZERO**     | Parier sur le 0                | 1/37        | LEGENDARY |
| **NUMBER**   | Parier sur un numéro (1-36)    | 1/37        | EPIC      |
| **RED**      | Parier sur les numéros rouges  | 18/37       | COMMON    |
| **BLACK**    | Parier sur les numéros noirs   | 18/37       | COMMON    |
| **EVEN**     | Parier sur les numéros pairs   | 18/37       | COMMON    |
| **ODD**      | Parier sur les numéros impairs | 18/37       | COMMON    |
| **DOZEN_1**  | Numéros 1-12                   | 12/37       | RARE      |
| **DOZEN_2**  | Numéros 13-24                  | 12/37       | RARE      |
| **DOZEN_3**  | Numéros 25-36                  | 12/37       | RARE      |
| **COLUMN_1** | Colonne 1 (1,4,7,10...)        | 12/37       | RARE      |
| **COLUMN_2** | Colonne 2 (2,5,8,11...)        | 12/37       | RARE      |
| **COLUMN_3** | Colonne 3 (3,6,9,12...)        | 12/37       | RARE      |

#### Numéros rouges

```
1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
```

Tous les autres numéros (1-36) sont noirs.

### Cooldowns (temps d'attente)

#### Cooldown après victoire (Roulette)

- **Durée** : 1 minute après chaque victoire
- **Raison** : Éviter le spam et maintenir l'équilibre du jeu
- **Effet** : Impossible de jouer pendant cette période

#### Cooldown d'échange (Trade)

- **Durée** : 5 minutes entre chaque action de trade
- **Actions concernées** : Proposer, accepter, refuser ou annuler un échange
- **Raison** : Prévenir les abus et les tentatives de manipulation

### Système d'échange de NFTs

#### Proposer un échange

- Vous pouvez proposer d'échanger un de vos NFTs contre celui d'un autre joueur
- Les deux joueurs doivent avoir de l'espace dans leur inventaire (< 20 NFTs)
- Un NFT ne peut être dans qu'une seule proposition d'échange à la fois

#### Répondre à une proposition

Le destinataire peut :

- **Accepter** : Les NFTs sont échangés automatiquement
- **Refuser** : La proposition est annulée
- Le proposant peut **annuler** sa proposition avant qu'elle soit acceptée

### Inventaire

- **Capacité maximale** : 20 NFTs par joueur
- **Protection** : Impossible de recevoir des NFTs si l'inventaire est plein
- **Échanges** : Les deux parties doivent avoir de la place pour échanger

---

## Architecture technique

### Technologies utilisées

**Blockchain & Smart Contracts**

- Solidity 0.8.20
- Hardhat (framework de développement)
- OpenZeppelin Contracts (ERC-721, Ownable)
- Ethers.js v6 (interaction blockchain)

**Frontend**

- React 19
- TypeScript
- Vite
- React Router

**Stockage décentralisé**

- IPFS (stockage des images NFT)

**Environnement**

- Docker & Docker Compose
- Node.js

---

## Smart Contracts

### 1. **RewardNFT.sol** - Gestion des NFTs ERC-721

#### Fonctionnalités principales

```solidity
contract RewardNFT is ERC721, Ownable {
    uint256 public constant MAX_INVENTORY = 20;

    enum RewardType {
        COMMON,      // Commun
        RARE,        // Rare
        EPIC,        // Épique
        LEGENDARY    // Légendaire
    }
}
```

#### Fonctions clés

**mintReward**

```solidity
function mintReward(
    address to,
    string memory name,
    RewardType rewardType,
    string memory ipfsHash
) external onlyOwner returns (uint256)
```

- Crée un nouveau NFT et l'attribue à un joueur
- Vérifie que l'inventaire n'est pas plein
- Stocke les métadonnées (nom, type, hash IPFS, historique)

**Métadonnées des NFTs**
Chaque NFT contient :

- `name` : Nom du NFT
- `rewardType` : Type de rareté
- `ipfsHash` : Hash IPFS de l'image
- `previousOwners` : Historique des propriétaires
- `createdAt` : Date de création
- `lastTransferAt` : Date du dernier transfert

**canReceiveReward**

```solidity
function canReceiveReward(address user) external view returns (bool)
```

- Vérifie si un utilisateur peut recevoir un nouveau NFT
- Retourne `false` si l'inventaire est plein (≥ 20)

### 2. **Roulette.sol** - Logique du jeu

#### Constantes et configuration

```solidity
uint256 public constant TICKET_PRICE = 0.01 ether;
uint256 public constant WIN_COOLDOWN = 1 minutes;
```

#### Fonction principale : buyTicketAndSpin

```solidity
function buyTicketAndSpin(
    BetType betType,
    uint8 numberBet
) external payable returns (uint256)
```

**Processus d'exécution :**

1. **Vérifications**

   - Le joueur a payé exactement 0.01 ETH
   - Le numéro est valide (0-36)
   - Le cooldown après victoire est respecté
   - Le type de pari correspond au numéro

2. **Création de la partie**

   - Un identifiant unique (gameId) est généré
   - Les détails du pari sont enregistrés

3. **Génération du résultat aléatoire**

   ```solidity
   uint8 result = uint8(
       uint256(
           keccak256(
               abi.encodePacked(
                   block.timestamp,
                   block.prevrandao,
                   msg.sender,
                   gameId
               )
           )
       ) % 37
   );
   ```

   - Utilise `keccak256` pour créer un hash
   - Combine timestamp, prevrandao (ancien difficulty), adresse joueur et gameId
   - Résultat entre 0 et 36

4. **Vérification de la victoire**

   - Compare le résultat avec le type de pari
   - Applique la logique spécifique (rouge/noir, pair/impair, etc.)

5. **Distribution des récompenses**
   - Si victoire : mint d'un NFT selon le type de pari
   - Activation du cooldown de 1 minute

#### Logique de vérification des victoires

**checkWin** : Détermine si le pari est gagnant

- Pour les paris simples : vérifie la correspondance directe
- Pour rouge/noir : vérifie si le numéro est dans RED_NUMBERS
- Pour douzaines/colonnes : vérifie les plages ou modulos

### 3. **Trade.sol** - Système d'échange

#### Structure d'une proposition d'échange

```solidity
struct SwapProposal {
    uint256 swapId;           // ID unique de l'échange
    address proposer;         // Celui qui propose
    address target;           // Celui qui reçoit la proposition
    uint256 proposerTokenId;  // NFT proposé
    uint256 targetTokenId;    // NFT demandé
    SwapStatus status;        // PENDING, ACCEPTED, CANCELLED, REJECTED
    uint256 createdAt;        // Date de création
    uint256 resolvedAt;       // Date de résolution
}
```

#### Fonctions principales

**proposeSwap** : Propose un échange

```solidity
function proposeSwap(
    uint256 myTokenId,
    uint256 targetTokenId,
    address targetOwner
) external withCooldown returns (uint256)
```

- Vérifie la propriété des NFTs
- Vérifie que les deux parties ont de la place
- Marque les NFTs comme "en échange actif"
- Applique le cooldown de 5 minutes

**acceptSwap** : Accepte une proposition

```solidity
function acceptSwap(uint256 swapId) external withCooldown
```

- Vérifie que le destinataire est bien la cible
- Effectue le double transfert des NFTs
- Marque l'échange comme ACCEPTED
- Libère les NFTs de l'état "en échange"

**cancelSwap / rejectSwap** : Annule ou refuse

- Le proposant peut annuler
- Le destinataire peut refuser
- Libère les NFTs et met à jour le statut

#### Protection contre les abus

**Modifier withCooldown**

```solidity
modifier withCooldown() {
    require(
        block.timestamp >= lastActionTimestamp[msg.sender] + TRADE_COOLDOWN,
        "Cooldown: Veuillez patienter 5 minutes"
    );
    _;
    lastActionTimestamp[msg.sender] = block.timestamp;
}
```

- Empêche les actions trop fréquentes
- S'applique à toutes les actions de trade

---

## Choix des outils

### Blockchain et Smart Contracts

#### **Hardhat** (Framework principal)

**Pourquoi Hardhat ?**

- **Environnement de développement complet** : Compilation, déploiement, tests
- **Console interactive** : Debug et interaction avec les contrats
- **Excellent support TypeScript** : Typage fort pour les contrats
- **Framework de test intégré** : Avec Chai et Ethers.js
- **Réseau local** : Node Ethereum local pour le développement

**Alternatives considérées :**

- Truffle : Moins actif, moins de fonctionnalités modernes
- Foundry : Excellent mais courbe d'apprentissage plus raide (Rust-based)

#### **Solidity 0.8.20**

**Pourquoi cette version ?**

- **Protection contre les overflows** : Arithmétique sécurisée par défaut
- **Custom errors** : Économie de gas
- **Version stable** : Largement testé et supporté
- **Compatible OpenZeppelin** : Support total des bibliothèques

#### **OpenZeppelin Contracts**

**Pourquoi OpenZeppelin ?**

- **Sécurité auditée** : Standards industriels pour ERC-721
- **Documentation complète** : Exemples et best practices
- **ERC-721 optimisé** : Implementation efficace des NFTs
- **Ownable** : Gestion des permissions simplifiée

**Contrats utilisés :**

- `ERC721` : Standard pour les NFTs
- `Ownable` : Contrôle d'accès pour le minting

#### **Ethers.js v6**

**Pourquoi Ethers.js ?**

- **Léger** : Plus petit que Web3.js
- **API moderne** : Syntaxe claire et async/await
- **Excellent typage TypeScript** : Sécurité du code frontend
- **Intégration parfaite avec Hardhat** : Même bibliothèque dans les tests

### Frontend

#### **React 19**

**Pourquoi React ?**

- **Version la plus récente** : Fonctionnalités modernes
- **Composants réutilisables** : Structure modulaire
- **Écosystème riche** : Nombreuses bibliothèques disponibles
- **Réactivité** : Gestion d'état efficace pour la blockchain

#### **TypeScript**

**Pourquoi TypeScript ?**

- **Sécurité du typage** : Détection des erreurs à la compilation
- **Contrats typés** : Types automatiques depuis les ABIs
- **Meilleure documentation** : Les types documentent le code
- **Refactoring sûr** : Changements sans risque

#### **Vite**

**Pourquoi Vite ?**

- **Vitesse** : HMR instantané, démarrage ultra-rapide
- **Optimisé pour React** : Configuration minimale
- **Build optimisé** : Production avec Rollup
- **Expérience développeur** : Feedback immédiat

**Alternatives considérées :**

- Create React App : Plus lent, configuration plus lourde
- Webpack : Plus complexe à configurer

### Stockage décentralisé

#### **IPFS (InterPlanetary File System)**

**Pourquoi IPFS ?**

- **Décentralisé** : Pas de point de défaillance unique
- **Content-addressed** : Hash garantit l'intégrité des images
- **Persistance** : Les fichiers restent disponibles
- **Gratuit** : Pas de frais de stockage on-chain

**Utilisation dans le projet :**

- Images des NFTs stockées sur IPFS
- Hash IPFS stocké dans le smart contract
- Images accessibles via gateway IPFS

**Hashes IPFS des récompenses :**

```
COMMON: QmTZ9vWJ8iyesqumUR4GzkEyb6KpUhtcEJZi2qjR1wz43Q
RARE: QmVdaKvrMdvnXyjBsN1CxgLpyGCDv9aYL8YgcGYj5kWCpy
EPIC: QmNtADXt3aA2PqPXRh6LGGrPaW3m9HJgLTuTmT8MEb5RxE
LEGENDARY: QmbHBHbrvMYb2B7KkkfXd9N3dixfCa7AWHr9mPfKYweZn3
```

### Environnement de développement

#### **Docker & Docker Compose**

**Pourquoi Docker ?**

- **Reproductibilité** : Environnement identique partout
- **Déploiement simplifié** : Un seul fichier de configuration
- **Isolation** : Pas de conflits de dépendances
- **Services multiples** : Hardhat + IPFS + Frontend

**Configuration Docker Compose :**

```yaml
services:
  - hardhat: Node Ethereum local
  - ipfs: Node IPFS local
  - frontend: Application React
```

---

## Tests

Le projet inclut des tests complets pour chaque smart contract.

### Lancer les tests

```bash
# Tous les tests
npx hardhat test

# Un fichier spécifique
npx hardhat test test/RouletteTest.js

# Avec rapport de couverture
npx hardhat coverage
```

### Tests du contrat **RewardNFT**

#### Scénarios testés :

1. **Déploiement**

   - Vérifie le nom et le symbole du contrat
   - Vérifie le propriétaire initial

2. **Minting de NFTs**

   - Le propriétaire peut minter des NFTs
   - Les non-propriétaires ne peuvent pas minter
   - Vérification de l'inventaire maximum (20 NFTs)
   - Métadonnées correctement enregistrées

3. **Transferts**

   - Les transferts mettent à jour l'inventaire
   - L'historique des propriétaires est enregistré
   - Impossible de transférer si l'inventaire du destinataire est plein

4. **Fonctions de lecture**
   - `getTokenMetadata` retourne les bonnes données
   - `canReceiveReward` fonctionne correctement
   - `getInventoryCount` est à jour

**Exemple de test :**

```javascript
it("Should not allow minting if inventory is full", async function () {
  // Mint 20 NFTs
  for (let i = 0; i < 20; i++) {
    await rewardNFT.mintReward(
      addr1.address,
      `Reward ${i}`,
      0, // COMMON
      "QmHash",
    );
  }

  // Le 21ème devrait échouer
  await expect(
    rewardNFT.mintReward(addr1.address, "Reward 21", 0, "QmHash"),
  ).to.be.revertedWith("Inventory is full");
});
```

### Tests du contrat **Roulette**

#### Scénarios testés :

1. **Achat de ticket**

   - Vérifie le prix du ticket (0.01 ETH)
   - Refuse si le paiement est incorrect
   - Génère un gameId unique

2. **Types de paris**

   - Teste chaque type de pari (RED, BLACK, EVEN, ODD, etc.)
   - Vérifie la logique de victoire pour chaque type
   - Vérifie les contraintes (ex: NUMBER entre 1-36)

3. **Génération aléatoire**

   - Le résultat est entre 0 et 36
   - Le résultat est déterministe pour un même hash

4. **Distribution des récompenses**

   - Victoire sur ZERO → NFT LEGENDARY
   - Victoire sur NUMBER → NFT EPIC
   - Victoire sur DOZEN/COLUMN → NFT RARE
   - Victoire sur RED/BLACK/EVEN/ODD → NFT COMMON

5. **Cooldown**

   - Impossible de rejouer immédiatement après victoire
   - Le cooldown expire après 1 minute
   - `getCooldownRemaining` retourne le temps restant

6. **Gestion de l'inventaire plein**
   - Pas de NFT minté si l'inventaire est plein
   - La partie continue normalement

**Exemple de test :**

```javascript
it("Should enforce cooldown after winning", async function () {
  // Première partie (victoire)
  await roulette
    .connect(addr1)
    .buyTicketAndSpin(BetType.RED, 1, { value: ethers.parseEther("0.01") });

  // Deuxième partie immédiate (devrait échouer)
  await expect(
    roulette
      .connect(addr1)
      .buyTicketAndSpin(BetType.BLACK, 2, { value: ethers.parseEther("0.01") }),
  ).to.be.revertedWith("Cooldown actif apres victoire");

  // Avancer le temps de 1 minute
  await time.increase(60);

  // Maintenant ça devrait marcher
  await expect(
    roulette
      .connect(addr1)
      .buyTicketAndSpin(BetType.BLACK, 2, { value: ethers.parseEther("0.01") }),
  ).to.not.be.reverted;
});
```

### Tests du contrat **Trade**

#### Scénarios testés :

1. **Proposition d'échange**

   - Vérification de la propriété des NFTs
   - Impossible d'échanger avec soi-même
   - Vérification de l'inventaire des 2 parties
   - Un NFT ne peut être dans plusieurs propositions

2. **Acceptation d'échange**

   - Le destinataire peut accepter
   - Les NFTs sont bien échangés
   - Le statut passe à ACCEPTED
   - Les NFTs sont libérés

3. **Refus/Annulation**

   - Le proposant peut annuler sa proposition
   - Le destinataire peut refuser
   - Les statuts sont corrects

4. **Cooldown**

   - 5 minutes entre chaque action
   - S'applique à toutes les actions (propose, accept, cancel, reject)
   - `getCooldownRemaining` fonctionne

5. **Cas limites**
   - NFT n'existe pas
   - NFT déjà vendu/transféré
   - Inventaire plein

**Exemple de test :**

```javascript
it("Should successfully swap NFTs", async function () {
  // Mint 1 NFT pour chaque joueur
  await rewardNFT.mintReward(addr1.address, "NFT 1", 0, "Hash1");
  await rewardNFT.mintReward(addr2.address, "NFT 2", 1, "Hash2");

  // Approuver le contrat Trade
  await rewardNFT.connect(addr1).approve(trade.address, 0);
  await rewardNFT.connect(addr2).approve(trade.address, 1);

  // Proposer l'échange
  await trade.connect(addr1).proposeSwap(0, 1, addr2.address);

  // Accepter l'échange
  await time.increase(300); // Cooldown
  await trade.connect(addr2).acceptSwap(1);

  // Vérifier les nouveaux propriétaires
  expect(await rewardNFT.ownerOf(0)).to.equal(addr2.address);
  expect(await rewardNFT.ownerOf(1)).to.equal(addr1.address);
});
```

### Helpers de test Hardhat

Le projet utilise les helpers Hardhat pour :

**@nomicfoundation/hardhat-network-helpers**

- `time.increase(seconds)` : Avancer le temps de la blockchain
- `loadFixture()` : Réutiliser les fixtures entre tests

**@nomicfoundation/hardhat-chai-matchers**

- `expect().to.be.revertedWith()` : Vérifier les erreurs
- `expect().to.emit()` : Vérifier les événements

### Couverture de code

Pour générer un rapport de couverture :

```bash
npx hardhat coverage
```

**Objectif** : > 90% de couverture sur tous les contrats

---

## Installation et déploiement

### Prérequis

- Node.js >= 18
- Docker & Docker Compose (optionnel mais recommandé)
- MetaMask ou un autre wallet Ethereum

### Installation locale

#### 1. Cloner le projet

```bash
git clone https://github.com/Furatus/5BLOC.git
cd 5BLOC
```

#### 2. Installer les dépendances

```bash
# Dépendances racine (Hardhat, Smart Contracts)
npm install

# Dépendances frontend
cd frontend
npm install
cd ..
```

#### 3. Compiler les smart contracts

```bash
npx hardhat compile
```

#### 4. Lancer le réseau local Hardhat

```bash
npx hardhat node
```

Cela démarre un node Ethereum local sur `http://localhost:8545` avec 20 comptes de test pré-financés.

#### 5. Déployer les contrats

Dans un nouveau terminal :

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Le script va :

1. Déployer RewardNFT
2. Déployer Roulette (avec l'adresse de RewardNFT)
3. Déployer Trade (avec l'adresse de RewardNFT)
4. Transférer la propriété de RewardNFT à Roulette
5. Sauvegarder les adresses dans `deployments/`

#### 6. Mettre à jour la configuration frontend

```bash
node scripts/update-contracts.js
```

Cela copie les ABIs et adresses des contrats dans `frontend/src/`.

#### 7. Démarrer le frontend

```bash
cd frontend
npm run dev
```

L'application est accessible sur `http://localhost:5173`

### Avec Docker Compose

```bash
# Construire et démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

Services lancés :

- Hardhat Node : Port 8545
- IPFS : Ports 5001 (API) et 8080 (Gateway)
- Frontend : Port 5173

### Configuration de MetaMask

1. **Ajouter le réseau local**

   - Nom : Hardhat Local
   - RPC URL : `http://localhost:8545`
   - Chain ID : `31337`
   - Symbole : ETH

2. **Importer un compte de test**

   - Copier une clé privée depuis les comptes Hardhat
   - Importer dans MetaMask

3. **Connecter MetaMask à l'application**
   - Ouvrir `http://localhost:5173`
   - Cliquer sur "Connect Wallet"
   - Approuver la connexion

---

## Sources : liens utiles

- [Documentation Hardhat](https://hardhat.org/docs)
- [Documentation OpenZeppelin](https://docs.openzeppelin.com/)
- [Documentation Ethers.js](https://docs.ethers.org/)
- [Documentation IPFS](https://docs.ipfs.tech/)
- [ERC-721 Standard](https://eips.ethereum.org/EIPS/eip-721)

---

**Merci**
