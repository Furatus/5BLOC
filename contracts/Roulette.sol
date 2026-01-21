// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IRewardNFT {
    enum RewardType { COMMON, RARE, EPIC, LEGENDARY }
    function mintReward(address to, string memory name, RewardType rewardType, string memory ipfsHash) external returns (uint256);
    function canReceiveReward(address user) external view returns (bool);
}

interface ICasinoToken {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract RouletteVRF is VRFConsumerBaseV2Plus, ReentrancyGuard {
    
    // ============ CHAINLINK VRF CONFIG ============

    uint256 public s_subscriptionId;
    address public vrfCoordinator;
    bytes32 public s_keyHash;
    
    uint32 public callbackGasLimit = 500000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;
    
    // ============ CONTRACTS ============
    
    IRewardNFT public rewardNFT;
    ICasinoToken public casinoToken;
    
    // ============ GAME TYPES ============
    
    enum BetType {
        SINGLE,         // Numéro unique (0-36) - paye 35:1
        SPLIT,          // 2 numéros adjacents - paye 17:1
        STREET,         // 3 numéros (ligne) - paye 11:1
        CORNER,         // 4 numéros (carré) - paye 8:1
        SIX_LINE,       // 6 numéros (2 lignes) - paye 5:1
        DOZEN,          // 12 numéros (1-12, 13-24, 25-36) - paye 2:1
        COLUMN,         // 12 numéros (colonne) - paye 2:1
        RED_BLACK,      // Rouge ou Noir - paye 1:1
        ODD_EVEN,       // Pair ou Impair - paye 1:1
        HIGH_LOW        // 1-18 ou 19-36 - paye 1:1
    }
    
    enum BetStatus {
        PENDING,        // En attente du random
        WON,
        LOST,
        CANCELLED
    }
    
    struct Bet {
        address player;
        BetType betType;
        uint256 amount;
        uint256[] numbers;
        uint256 timestamp;
        BetStatus status;
        uint256 winningNumber;
        uint256 payout;
    }
    
    // ============ STORAGE ============
    
    // Mapping requestId => betId
    mapping(uint256 => uint256) public requestToBet;
    
    // Mapping betId => Bet
    mapping(uint256 => Bet) public bets;
    uint256 public betCounter;
    
    // Configuration des mises
    uint256 public minBet = 10 * 10**18;
    uint256 public maxBet = 1000 * 10**18;
    
    // Numéros rouges
    uint8[18] public redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    
    // Probabilités de rareté [COMMON, RARE, EPIC, LEGENDARY] sur 1000
    mapping(BetType => uint16[4]) public rewardProbabilities;
    
    // Noms des peluches
    string[] public commonNames;
    string[] public rareNames;
    string[] public epicNames;
    string[] public legendaryNames;
    
    // IPFS hashes
    mapping(IRewardNFT.RewardType => string[]) public ipfsHashes;
    
    // ============ EVENTS ============
    
    event BetPlaced(
        uint256 indexed betId, 
        uint256 indexed requestId,
        address indexed player, 
        BetType betType, 
        uint256 amount
    );
    
    event BetResolved(
        uint256 indexed betId, 
        address indexed player, 
        uint256 winningNumber, 
        BetStatus status, 
        uint256 payout
    );
    
    event RewardWon(
        uint256 indexed betId, 
        address indexed player, 
        uint256 tokenId, 
        IRewardNFT.RewardType rewardType,
        string name
    );
    
    event RandomnessRequested(uint256 indexed requestId, uint256 indexed betId);
    
    // ============ CONSTRUCTOR ============
    
    constructor(
        uint256 subscriptionId,
        address _vrfCoordinator,
        bytes32 keyHash,
        address _rewardNFT,
        address _casinoToken
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        s_subscriptionId = subscriptionId;
        vrfCoordinator = _vrfCoordinator;
        s_keyHash = keyHash;
        rewardNFT = IRewardNFT(_rewardNFT);
        casinoToken = ICasinoToken(_casinoToken);
        
        _initializeRewardProbabilities();
        _initializePlushNames();
    }
    
    function _initializeRewardProbabilities() internal {
        // Plus la mise est risquée, plus on peut gagner de raretés
        rewardProbabilities[BetType.SINGLE] = [400, 300, 200, 100];
        rewardProbabilities[BetType.SPLIT] = [500, 350, 150, 0];
        rewardProbabilities[BetType.STREET] = [550, 300, 150, 0];
        rewardProbabilities[BetType.CORNER] = [700, 300, 0, 0];
        rewardProbabilities[BetType.SIX_LINE] = [800, 200, 0, 0];
        rewardProbabilities[BetType.DOZEN] = [1000, 0, 0, 0];
        rewardProbabilities[BetType.COLUMN] = [1000, 0, 0, 0];
        rewardProbabilities[BetType.RED_BLACK] = [1000, 0, 0, 0];
        rewardProbabilities[BetType.ODD_EVEN] = [1000, 0, 0, 0];
        rewardProbabilities[BetType.HIGH_LOW] = [1000, 0, 0, 0];
    }
    
    function _initializePlushNames() internal {
        commonNames.push("Teddy Bear");
        commonNames.push("Bunny Plush");
        commonNames.push("Puppy Plush");
        commonNames.push("Kitty Plush");
        
        rareNames.push("Golden Bear");
        rareNames.push("Silver Bunny");
        rareNames.push("Diamond Puppy");
        
        epicNames.push("Crystal Dragon");
        epicNames.push("Rainbow Unicorn");
        epicNames.push("Mystic Phoenix");
        
        legendaryNames.push("Cosmic Guardian");
        legendaryNames.push("Ethereal Spirit");
    }
    
    // ============ MAIN FUNCTIONS ============
    
    /**
     * @notice Place une mise et demande un random à Chainlink
     * @param betType Type de mise
     * @param amount Montant misé
     * @param numbers Numéros sur lesquels miser
     */
    function placeBet(
        BetType betType,
        uint256 amount,
        uint256[] calldata numbers
    ) external nonReentrant returns (uint256 betId, uint256 requestId) {
        require(amount >= minBet && amount <= maxBet, "Bet amount out of range");
        require(_validateBet(betType, numbers), "Invalid bet configuration");
        require(rewardNFT.canReceiveReward(msg.sender), "Inventory full");
        
        // Transférer les tokens
        require(
            casinoToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
        betId = betCounter++;
        
        bets[betId] = Bet({
            player: msg.sender,
            betType: betType,
            amount: amount,
            numbers: numbers,
            timestamp: block.timestamp,
            status: BetStatus.PENDING,
            winningNumber: 0,
            payout: 0
        });
        
        // Demander le random à Chainlink VRF
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: s_keyHash,
                subId: s_subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
        
        requestToBet[requestId] = betId;
        
        emit BetPlaced(betId, requestId, msg.sender, betType, amount);
        emit RandomnessRequested(requestId, betId);
        
        return (betId, requestId);
    }
    
    /**
     * @notice Callback appelé par Chainlink avec le random
     * @dev Cette fonction est appelée automatiquement par le VRF Coordinator
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        uint256 betId = requestToBet[requestId];
        Bet storage bet = bets[betId];
        
        require(bet.status == BetStatus.PENDING, "Bet already resolved");
        require(bet.player != address(0), "Bet does not exist");
        
        // Calculer le numéro gagnant (0-36)
        uint256 winningNumber = randomWords[0] % 37;
        bet.winningNumber = winningNumber;
        
        // Vérifier si le joueur a gagné
        bool won = _checkWin(bet.betType, bet.numbers, winningNumber);
        
        if (won) {
            bet.status = BetStatus.WON;
            bet.payout = _calculatePayout(bet.betType, bet.amount);
            
            // Payer les gains
            if (bet.payout > 0 && casinoToken.balanceOf(address(this)) >= bet.payout) {
                casinoToken.transfer(bet.player, bet.payout);
            }
            
            // Donner une récompense NFT
            _awardReward(betId, bet.player, bet.betType, randomWords[0]);
        } else {
            bet.status = BetStatus.LOST;
        }
        
        emit BetResolved(betId, bet.player, winningNumber, bet.status, bet.payout);
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    function _validateBet(BetType betType, uint256[] calldata numbers) internal pure returns (bool) {
        if (betType == BetType.SINGLE) {
            return numbers.length == 1 && numbers[0] <= 36;
        } else if (betType == BetType.SPLIT) {
            return numbers.length == 2 && _areAdjacent(numbers[0], numbers[1]);
        } else if (betType == BetType.STREET) {
            return numbers.length == 3 && _isValidStreet(numbers);
        } else if (betType == BetType.CORNER) {
            return numbers.length == 4;
        } else if (betType == BetType.SIX_LINE) {
            return numbers.length == 6;
        } else if (betType == BetType.DOZEN) {
            return numbers.length == 1 && numbers[0] >= 1 && numbers[0] <= 3;
        } else if (betType == BetType.COLUMN) {
            return numbers.length == 1 && numbers[0] >= 1 && numbers[0] <= 3;
        } else if (betType == BetType.RED_BLACK) {
            return numbers.length == 1 && numbers[0] <= 1;
        } else if (betType == BetType.ODD_EVEN) {
            return numbers.length == 1 && numbers[0] <= 1;
        } else if (betType == BetType.HIGH_LOW) {
            return numbers.length == 1 && numbers[0] <= 1;
        }
        return false;
    }
    
    function _checkWin(
        BetType betType, 
        uint256[] memory numbers, 
        uint256 winningNumber
    ) internal view returns (bool) {
        if (betType == BetType.SINGLE) {
            return numbers[0] == winningNumber;
        } else if (betType == BetType.SPLIT || betType == BetType.STREET || 
                   betType == BetType.CORNER || betType == BetType.SIX_LINE) {
            for (uint i = 0; i < numbers.length; i++) {
                if (numbers[i] == winningNumber) return true;
            }
            return false;
        } else if (betType == BetType.DOZEN) {
            if (winningNumber == 0) return false;
            uint256 dozen = (winningNumber - 1) / 12 + 1;
            return dozen == numbers[0];
        } else if (betType == BetType.COLUMN) {
            if (winningNumber == 0) return false;
            uint256 column = winningNumber % 3;
            if (column == 0) column = 3;
            return column == numbers[0];
        } else if (betType == BetType.RED_BLACK) {
            if (winningNumber == 0) return false;
            bool isRed = _isRed(winningNumber);
            return (numbers[0] == 0 && isRed) || (numbers[0] == 1 && !isRed);
        } else if (betType == BetType.ODD_EVEN) {
            if (winningNumber == 0) return false;
            bool isOdd = winningNumber % 2 == 1;
            return (numbers[0] == 0 && isOdd) || (numbers[0] == 1 && !isOdd);
        } else if (betType == BetType.HIGH_LOW) {
            if (winningNumber == 0) return false;
            bool isLow = winningNumber <= 18;
            return (numbers[0] == 0 && isLow) || (numbers[0] == 1 && !isLow);
        }
        return false;
    }
    
    function _calculatePayout(BetType betType, uint256 amount) internal pure returns (uint256) {
        if (betType == BetType.SINGLE) return amount * 36;
        if (betType == BetType.SPLIT) return amount * 18;
        if (betType == BetType.STREET) return amount * 12;
        if (betType == BetType.CORNER) return amount * 9;
        if (betType == BetType.SIX_LINE) return amount * 6;
        if (betType == BetType.DOZEN || betType == BetType.COLUMN) return amount * 3;
        return amount * 2; // 50/50 bets
    }
    
    function _awardReward(
        uint256 betId, 
        address player, 
        BetType betType, 
        uint256 randomSeed
    ) internal {
        if (!rewardNFT.canReceiveReward(player)) return;
        
        uint16[4] memory probs = rewardProbabilities[betType];
        uint256 rarityRand = uint256(keccak256(abi.encodePacked(randomSeed, "rarity"))) % 1000;
        
        IRewardNFT.RewardType rewardType = IRewardNFT.RewardType.COMMON;
        string memory name;
        
        uint256 cumulative = 0;
        for (uint i = 0; i < 4; i++) {
            cumulative += probs[i];
            if (rarityRand < cumulative && probs[i] > 0) {
                rewardType = IRewardNFT.RewardType(i);
                break;
            }
        }
        
        uint256 nameRand = uint256(keccak256(abi.encodePacked(randomSeed, "name")));
        
        if (rewardType == IRewardNFT.RewardType.COMMON && commonNames.length > 0) {
            name = commonNames[nameRand % commonNames.length];
        } else if (rewardType == IRewardNFT.RewardType.RARE && rareNames.length > 0) {
            name = rareNames[nameRand % rareNames.length];
        } else if (rewardType == IRewardNFT.RewardType.EPIC && epicNames.length > 0) {
            name = epicNames[nameRand % epicNames.length];
        } else if (legendaryNames.length > 0) {
            name = legendaryNames[nameRand % legendaryNames.length];
        } else {
            name = "Mystery Plush";
        }
        
        string memory ipfsHash = _getIpfsHash(rewardType, nameRand);
        
        uint256 tokenId = rewardNFT.mintReward(player, name, rewardType, ipfsHash);
        
        emit RewardWon(betId, player, tokenId, rewardType, name);
    }
    
    function _getIpfsHash(
        IRewardNFT.RewardType rewardType, 
        uint256 rand
    ) internal view returns (string memory) {
        string[] storage hashes = ipfsHashes[rewardType];
        if (hashes.length == 0) return "QmDefaultPlaceholder";
        return hashes[rand % hashes.length];
    }
    
    function _isRed(uint256 number) internal view returns (bool) {
        for (uint i = 0; i < 18; i++) {
            if (redNumbers[i] == number) return true;
        }
        return false;
    }
    
    function _areAdjacent(uint256 a, uint256 b) internal pure returns (bool) {
        if (a > b) (a, b) = (b, a);
        return b - a == 1 || b - a == 3;
    }
    
    function _isValidStreet(uint256[] calldata numbers) internal pure returns (bool) {
        if (numbers[0] == 0) return false;
        uint256 start = ((numbers[0] - 1) / 3) * 3 + 1;
        return numbers[0] == start && numbers[1] == start + 1 && numbers[2] == start + 2;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getBet(uint256 betId) external view returns (Bet memory) {
        return bets[betId];
    }
    
    function getBetStatus(uint256 betId) external view returns (BetStatus) {
        return bets[betId].status;
    }
    
    function getPlayerBets(
        address player, 
        uint256 offset, 
        uint256 limit
    ) external view returns (uint256[] memory) {
        uint256[] memory playerBetIds = new uint256[](limit);
        uint256 count = 0;
        uint256 found = 0;
        
        for (uint256 i = 0; i < betCounter && count < limit; i++) {
            if (bets[i].player == player) {
                if (found >= offset) {
                    playerBetIds[count] = i;
                    count++;
                }
                found++;
            }
        }
        
        assembly {
            mstore(playerBetIds, count)
        }
        
        return playerBetIds;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function setMinMaxBet(uint256 _min, uint256 _max) external onlyOwner {
        minBet = _min;
        maxBet = _max;
    }
    
    function setCallbackGasLimit(uint32 _limit) external onlyOwner {
        callbackGasLimit = _limit;
    }
    
    function setRequestConfirmations(uint16 _confirmations) external onlyOwner {
        requestConfirmations = _confirmations;
    }
    
    function addPlushName(IRewardNFT.RewardType rewardType, string memory name) external onlyOwner {
        if (rewardType == IRewardNFT.RewardType.COMMON) {
            commonNames.push(name);
        } else if (rewardType == IRewardNFT.RewardType.RARE) {
            rareNames.push(name);
        } else if (rewardType == IRewardNFT.RewardType.EPIC) {
            epicNames.push(name);
        } else {
            legendaryNames.push(name);
        }
    }
    
    function addIpfsHash(IRewardNFT.RewardType rewardType, string memory hash) external onlyOwner {
        ipfsHashes[rewardType].push(hash);
    }
    
    function updateRewardProbabilities(
        BetType betType, 
        uint16[4] calldata probs
    ) external onlyOwner {
        require(probs[0] + probs[1] + probs[2] + probs[3] == 1000, "Probs must sum to 1000");
        rewardProbabilities[betType] = probs;
    }
    
    function withdrawTokens(uint256 amount) external onlyOwner {
        casinoToken.transfer(owner(), amount);
    }
    
    function fundCasino(uint256 amount) external {
        casinoToken.transferFrom(msg.sender, address(this), amount);
    }
    
    // Annuler une mise bloquée (si le VRF ne répond pas)
    function cancelBet(uint256 betId) external onlyOwner {
        Bet storage bet = bets[betId];
        require(bet.status == BetStatus.PENDING, "Bet not pending");
        require(block.timestamp > bet.timestamp + 1 hours, "Too early to cancel");
        
        bet.status = BetStatus.CANCELLED;
        casinoToken.transfer(bet.player, bet.amount);
        
        emit BetResolved(betId, bet.player, 0, BetStatus.CANCELLED, bet.amount);
    }
}