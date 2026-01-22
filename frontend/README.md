# Frontend - 5BLOC Casino

DApp décentralisée de casino (Roulette) construite avec React + Vite + TypeScript.

## Objectif du projet

Application décentralisée permettant de jouer à la roulette via un smart contract Ethereum. L'utilisateur connecte son wallet (MetaMask), place des paris, et le résultat est calculé on-chain de manière transparente et vérifiable.

## Technologies

- **React 19** - Bibliothèque UI
- **Vite 7** - Build tool
- **TypeScript 5.9** - Typage statique
- **Web3** - Interaction avec Ethereum (MetaMask)
- **Sepolia Testnet** - Réseau de test

## Structure du projet

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Roulette.tsx      # Page principale du jeu
│   │   └── Roulette.css
│   ├── components/           # Composants réutilisables (à créer)
│   ├── hooks/                # Hooks React personnalisés (à créer)
│   ├── services/
│   │   ├── config.ts         # Configuration Web3
│   │   ├── web3Service.ts    # Service MetaMask/Ethereum
│   │   └── contractService.ts # Interaction smart contract
│   ├── utils/
│   │   ├── constants.ts      # Constantes (adresse contrat, etc.)
│   │   ├── helpers.ts        # Fonctions utilitaires
│   │   └── validators.ts     # Validations
│   ├── types/
│   │   └── index.ts          # Types TypeScript
│   ├── App.tsx
│   ├── App.css
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Installation

```bash
# Installation des dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour la production
npm run build
```

## Prérequis

1. **MetaMask** installé dans votre navigateur
2. **Compte Sepolia** avec des ETH de test (faucet: https://sepoliafaucet.com/)
3. **Node.js** version 18+

## Utilisation

1. Lancer l'application : `npm run dev`
2. Ouvrir http://localhost:5173
3. Cliquer sur "Connecter Wallet"
4. Approuver la connexion dans MetaMask
5. Placer un pari (Rouge, Noir, ou 0)
6. Entrer un montant en ETH
7. Cliquer sur "Lancer la Roulette"
8. Attendre le résultat on-chain

## Sécurité

### Bonnes pratiques implémentées

- Aucune logique métier critique côté frontend
- Validation des entrées utilisateur
- Vérification du réseau blockchain
- Gestion des erreurs MetaMask
- Pas de clés privées dans le code

### Points de vigilance

- Ne jamais stocker de clés privées
- Toujours vérifier le réseau actif
- Valider les montants de paris
- Gérer les rejets utilisateur
- Limiter les appels au smart contract

## Fichiers hors `src/`

### Fichiers **INDISPENSABLES**

| Fichier              | Rôle                                 |
| -------------------- | ------------------------------------ |
| `package.json`       | Dépendances npm et scripts de build  |
| `package-lock.json`  | Verrous des versions exactes         |
| `tsconfig.json`      | Configuration TypeScript globale     |
| `tsconfig.app.json`  | Config TS spécifique à l'app         |
| `tsconfig.node.json` | Config TS pour Vite/Node             |
| `vite.config.ts`     | Configuration de Vite                |
| `index.html`         | Point d'entrée HTML                  |
| `.gitignore`         | Fichiers ignorés par Git             |
| `node_modules/`      | Dépendances (généré automatiquement) |

### Fichiers **OPTIONNELS**

| Fichier            | Rôle                       | Action possible                    |
| ------------------ | -------------------------- | ---------------------------------- |
| `eslint.config.js` | Linting du code            | Peut être personnalisé ou supprimé |
| `README.md`        | Documentation              | À garder et personnaliser          |
| `.env.example`     | Exemple de variables d'env | Utile pour l'équipe                |

## Prochaines étapes

### Phase 1 : Smart Contract

- [ ] Développer le smart contract Solidity
- [ ] Déployer sur Sepolia
- [ ] Mettre à jour `ROULETTE_CONTRACT_ADDRESS` dans constants.ts

### Phase 2 : Intégration Web3

- [ ] Installer `ethers.js` : `npm install ethers`
- [ ] Compléter `contractService.ts` avec l'ABI du contrat
- [ ] Implémenter la méthode `placeBet()`
- [ ] Implémenter la méthode `spinRoulette()`

### Phase 3 : Composants UI

- [ ] Créer `WalletConnect.tsx`
- [ ] Créer `RouletteWheel.tsx` (animation)
- [ ] Créer `BettingPanel.tsx`
- [ ] Créer `GameResult.tsx`

### Phase 4 : Hooks personnalisés

- [ ] Créer `useWallet.tsx` (gestion wallet)
- [ ] Créer `useContract.tsx` (interaction contrat)

### Phase 5 : Améliorations

- [ ] Historique des parties
- [ ] Animations de la roue
- [ ] Gestion multi-utilisateurs
- [ ] Tests unitaires

## Architecture DApp

```
┌─────────────┐
│   Frontend  │
│  (React UI) │
└──────┬──────┘
       │
       ├─> MetaMask (wallet)
       │
       ├─> Smart Contract (Ethereum)
       │
       └─> Blockchain (Sepolia)
```

**Principe :**

- Frontend = Interface utilisateur uniquement
- Smart Contract = Logique métier sécurisée
- Blockchain = Source de vérité immuable

## Dépendances actuelles

```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0"
}
```

**À ajouter plus tard :**

- `ethers` ou `web3.js` - Interaction avec Ethereum
- `@rainbow-me/rainbowkit` (optionnel) - UI wallet avancée


## Licence

Voir LICENSE à la racine du projet.

## Troubleshooting

### MetaMask ne se connecte pas

- Vérifier que MetaMask est installé
- Actualiser la page
- Vérifier le réseau (doit être Sepolia)

### Transaction échouée

- Vérifier le solde ETH
- Vérifier que le montant est valide
- Vérifier les limites du contrat

### Erreur de réseau

- Vérifier que vous êtes sur Sepolia
- Utiliser le bouton "Changer de réseau"

## Ressources

- [Documentation React](https://react.dev)
- [Documentation Vite](https://vite.dev)
- [Documentation MetaMask](https://docs.metamask.io)
- [Documentation Ethers.js](https://docs.ethers.org)
- [Sepolia Faucet](https://sepoliafaucet.com)
