// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "./RewardNFT.sol";

/**
 * @title Trade
 * @dev Système d'échange P2P de NFTs RewardNFT
 * 
 * Fonctionnalités :
 * - Proposer un échange NFT contre NFT
 * - Accepter/Refuser une proposition
 * - Annuler sa propre proposition
 * - Historique des échanges
 */
contract Trade {
    
    // ========== TYPES ==========
    
    /// @notice Statut d'une proposition d'échange
    enum SwapStatus {
        PENDING,    // En attente
        ACCEPTED,   // Acceptée
        CANCELLED,  // Annulée par le proposant
        REJECTED    // Refusée par le destinataire
    }
    
    /// @notice Structure représentant une proposition d'échange
    struct SwapProposal {
        uint256 swapId;                 // ID de l'échange
        address proposer;               // Celui qui propose
        address target;                 // Celui qui reçoit la proposition
        uint256 proposerTokenId;        // NFT offert par le proposant
        uint256 targetTokenId;          // NFT demandé au destinataire
        SwapStatus status;              // Statut de la proposition
        uint256 createdAt;              // Date de création
        uint256 resolvedAt;             // Date de résolution (accepté/refusé/annulé)
    }
    
    // ========== VARIABLES D'ÉTAT ==========
    
    /// @notice Contrat RewardNFT
    RewardNFT public rewardNFT;
    
    /// @notice Compteur de propositions
    uint256 private _swapIdCounter;
    
    /// @notice Mapping swapId => SwapProposal
    mapping(uint256 => SwapProposal) public swaps;
    
    /// @notice Mapping proposer => swapIds
    mapping(address => uint256[]) public proposerSwaps;
    
    /// @notice Mapping target => swapIds
    mapping(address => uint256[]) public receivedSwaps;
    
    /// @notice Mapping tokenId => swapId actif (pour éviter les doubles propositions)
    mapping(uint256 => uint256) public activeSwapForToken;
    
    // ========== ÉVÉNEMENTS ==========
    
    /// @notice Émis quand une proposition est créée
    event SwapProposed(
        uint256 indexed swapId,
        address indexed proposer,
        address indexed target,
        uint256 proposerTokenId,
        uint256 targetTokenId
    );
    
    /// @notice Émis quand une proposition est acceptée
    event SwapAccepted(
        uint256 indexed swapId,
        address indexed proposer,
        address indexed target,
        uint256 proposerTokenId,
        uint256 targetTokenId
    );
    
    /// @notice Émis quand une proposition est annulée
    event SwapCancelled(
        uint256 indexed swapId,
        address indexed proposer
    );
    
    /// @notice Émis quand une proposition est refusée
    event SwapRejected(
        uint256 indexed swapId,
        address indexed target
    );
    
    // ========== CONSTRUCTEUR ==========
    
    /**
     * @notice Initialise le contrat Trade
     * @param _rewardNFTAddress Adresse du contrat RewardNFT
     */
    constructor(address _rewardNFTAddress) {
        rewardNFT = RewardNFT(_rewardNFTAddress);
    }
    
    // ========== FONCTIONS PRINCIPALES ==========
    
    /**
     * @notice Proposer un échange de NFT
     * @param myTokenId Le NFT que je propose
     * @param targetTokenId Le NFT que je veux recevoir
     * @param targetOwner Le propriétaire du NFT que je veux
     */
    function proposeSwap(
        uint256 myTokenId,
        uint256 targetTokenId,
        address targetOwner
    ) external returns (uint256) {
        // Vérifications
        require(targetOwner != address(0), "Invalid target address");
        require(targetOwner != msg.sender, "Cannot swap with yourself");
        require(rewardNFT.ownerOf(myTokenId) == msg.sender, "You don't own this NFT");
        require(rewardNFT.ownerOf(targetTokenId) == targetOwner, "Target doesn't own the NFT");
        require(activeSwapForToken[myTokenId] == 0, "NFT already in active swap");
        
        // Vérifier que les deux utilisateurs ont de la place dans leur inventaire
        // (en cas d'échange, le nombre reste le même, mais on vérifie quand même)
        require(rewardNFT.canReceiveReward(msg.sender), "Your inventory is full");
        require(rewardNFT.canReceiveReward(targetOwner), "Target inventory is full");
        
        uint256 swapId = ++_swapIdCounter; // Commence à 1 (0 = pas de swap actif)
        
        swaps[swapId] = SwapProposal({
            swapId: swapId,
            proposer: msg.sender,
            target: targetOwner,
            proposerTokenId: myTokenId,
            targetTokenId: targetTokenId,
            status: SwapStatus.PENDING,
            createdAt: block.timestamp,
            resolvedAt: 0
        });
        
        proposerSwaps[msg.sender].push(swapId);
        receivedSwaps[targetOwner].push(swapId);
        
        // Marquer les tokens comme étant dans un swap actif
        activeSwapForToken[myTokenId] = swapId;
        activeSwapForToken[targetTokenId] = swapId;
        
        emit SwapProposed(swapId, msg.sender, targetOwner, myTokenId, targetTokenId);
        
        return swapId;
    }
    
    /**
     * @notice Accepter une proposition d'échange
     * @param swapId ID de la proposition
     */
    function acceptSwap(uint256 swapId) external {
        SwapProposal storage swap = swaps[swapId];
        
        require(swap.swapId != 0, "Swap does not exist");
        require(swap.target == msg.sender, "Not the target of this swap");
        require(swap.status == SwapStatus.PENDING, "Swap is not pending");
        
        // Vérifier que les deux parties possèdent toujours leurs NFTs
        require(
            rewardNFT.ownerOf(swap.proposerTokenId) == swap.proposer,
            "Proposer no longer owns the NFT"
        );
        require(
            rewardNFT.ownerOf(swap.targetTokenId) == swap.target,
            "You no longer own the NFT"
        );
        
        // Effectuer l'échange
        // Note: Le contrat Trade doit être approuvé pour transférer les NFTs
        // Les utilisateurs doivent faire: rewardNFT.setApprovalForAll(tradeAddress, true)
        
        rewardNFT.transferFrom(swap.proposer, swap.target, swap.proposerTokenId);
        rewardNFT.transferFrom(swap.target, swap.proposer, swap.targetTokenId);
        
        // Mettre à jour le statut
        swap.status = SwapStatus.ACCEPTED;
        swap.resolvedAt = block.timestamp;
        
        // Libérer les tokens
        delete activeSwapForToken[swap.proposerTokenId];
        delete activeSwapForToken[swap.targetTokenId];
        
        emit SwapAccepted(
            swapId,
            swap.proposer,
            swap.target,
            swap.proposerTokenId,
            swap.targetTokenId
        );
    }
    
    /**
     * @notice Annuler sa propre proposition
     * @param swapId ID de la proposition
     */
    function cancelSwap(uint256 swapId) external {
        SwapProposal storage swap = swaps[swapId];
        
        require(swap.swapId != 0, "Swap does not exist");
        require(swap.proposer == msg.sender, "Not the proposer");
        require(swap.status == SwapStatus.PENDING, "Swap is not pending");
        
        swap.status = SwapStatus.CANCELLED;
        swap.resolvedAt = block.timestamp;
        
        // Libérer les tokens
        delete activeSwapForToken[swap.proposerTokenId];
        delete activeSwapForToken[swap.targetTokenId];
        
        emit SwapCancelled(swapId, msg.sender);
    }
    
    /**
     * @notice Refuser une proposition reçue
     * @param swapId ID de la proposition
     */
    function rejectSwap(uint256 swapId) external {
        SwapProposal storage swap = swaps[swapId];
        
        require(swap.swapId != 0, "Swap does not exist");
        require(swap.target == msg.sender, "Not the target of this swap");
        require(swap.status == SwapStatus.PENDING, "Swap is not pending");
        
        swap.status = SwapStatus.REJECTED;
        swap.resolvedAt = block.timestamp;
        
        // Libérer les tokens
        delete activeSwapForToken[swap.proposerTokenId];
        delete activeSwapForToken[swap.targetTokenId];
        
        emit SwapRejected(swapId, msg.sender);
    }
    
    // ========== FONCTIONS DE LECTURE ==========
    
    /**
     * @notice Récupérer toutes les propositions faites par un utilisateur
     */
    function getProposerSwaps(address proposer) external view returns (uint256[] memory) {
        return proposerSwaps[proposer];
    }
    
    /**
     * @notice Récupérer toutes les propositions reçues par un utilisateur
     */
    function getReceivedSwaps(address target) external view returns (uint256[] memory) {
        return receivedSwaps[target];
    }
    
    /**
     * @notice Récupérer les détails d'une proposition
     */
    function getSwap(uint256 swapId) external view returns (SwapProposal memory) {
        require(swaps[swapId].swapId != 0, "Swap does not exist");
        return swaps[swapId];
    }
    
    /**
     * @notice Récupérer toutes les propositions en attente pour un utilisateur
     */
    function getPendingSwapsForUser(address user) external view returns (SwapProposal[] memory) {
        uint256[] memory received = receivedSwaps[user];
        uint256 pendingCount = 0;
        
        // Compter les propositions en attente
        for (uint i = 0; i < received.length; i++) {
            if (swaps[received[i]].status == SwapStatus.PENDING) {
                pendingCount++;
            }
        }
        
        // Créer le tableau de résultats
        SwapProposal[] memory pendingSwaps = new SwapProposal[](pendingCount);
        uint256 index = 0;
        
        for (uint i = 0; i < received.length; i++) {
            if (swaps[received[i]].status == SwapStatus.PENDING) {
                pendingSwaps[index] = swaps[received[i]];
                index++;
            }
        }
        
        return pendingSwaps;
    }
    
    /**
     * @notice Vérifier si un NFT est dans un échange actif
     */
    function isTokenInActiveSwap(uint256 tokenId) external view returns (bool) {
        return activeSwapForToken[tokenId] != 0;
    }
}