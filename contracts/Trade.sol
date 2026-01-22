// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "./RewardNFT.sol";

contract Trade {
    enum SwapStatus {
        PENDING,
        ACCEPTED,
        CANCELLED,
        REJECTED
    }

    struct SwapProposal {
        uint256 swapId;
        address proposer;
        address target;
        uint256 proposerTokenId;
        uint256 targetTokenId;
        SwapStatus status;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    RewardNFT public rewardNFT;

    uint256 private _swapIdCounter;

    mapping(uint256 => SwapProposal) public swaps;

    mapping(address => uint256[]) public proposerSwaps;

    mapping(address => uint256[]) public receivedSwaps;

    mapping(uint256 => uint256) public activeSwapForToken;

    event SwapProposed(
        uint256 indexed swapId,
        address indexed proposer,
        address indexed target,
        uint256 proposerTokenId,
        uint256 targetTokenId
    );

    event SwapAccepted(
        uint256 indexed swapId,
        address indexed proposer,
        address indexed target,
        uint256 proposerTokenId,
        uint256 targetTokenId
    );

    event SwapCancelled(uint256 indexed swapId, address indexed proposer);

    event SwapRejected(uint256 indexed swapId, address indexed target);

    constructor(address _rewardNFTAddress) {
        rewardNFT = RewardNFT(_rewardNFTAddress);
    }

    function proposeSwap(
        uint256 myTokenId,
        uint256 targetTokenId,
        address targetOwner
    ) external returns (uint256) {
        require(targetOwner != address(0), "Invalid target address");
        require(targetOwner != msg.sender, "Cannot swap with yourself");
        require(
            rewardNFT.ownerOf(myTokenId) == msg.sender,
            "You don't own this NFT"
        );
        require(
            rewardNFT.ownerOf(targetTokenId) == targetOwner,
            "Target doesn't own the NFT"
        );
        require(
            activeSwapForToken[myTokenId] == 0,
            "NFT already in active swap"
        );

        require(
            rewardNFT.canReceiveReward(msg.sender),
            "Your inventory is full"
        );
        require(
            rewardNFT.canReceiveReward(targetOwner),
            "Target inventory is full"
        );

        uint256 swapId = ++_swapIdCounter;

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

        activeSwapForToken[myTokenId] = swapId;
        activeSwapForToken[targetTokenId] = swapId;

        emit SwapProposed(
            swapId,
            msg.sender,
            targetOwner,
            myTokenId,
            targetTokenId
        );

        return swapId;
    }

    function acceptSwap(uint256 swapId) external {
        SwapProposal storage swap = swaps[swapId];

        require(swap.swapId != 0, "Swap does not exist");
        require(swap.target == msg.sender, "Not the target of this swap");
        require(swap.status == SwapStatus.PENDING, "Swap is not pending");

        require(
            rewardNFT.ownerOf(swap.proposerTokenId) == swap.proposer,
            "Proposer no longer owns the NFT"
        );
        require(
            rewardNFT.ownerOf(swap.targetTokenId) == swap.target,
            "You no longer own the NFT"
        );

        rewardNFT.transferFrom(
            swap.proposer,
            swap.target,
            swap.proposerTokenId
        );
        rewardNFT.transferFrom(swap.target, swap.proposer, swap.targetTokenId);

        swap.status = SwapStatus.ACCEPTED;
        swap.resolvedAt = block.timestamp;

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

    function cancelSwap(uint256 swapId) external {
        SwapProposal storage swap = swaps[swapId];

        require(swap.swapId != 0, "Swap does not exist");
        require(swap.proposer == msg.sender, "Not the proposer");
        require(swap.status == SwapStatus.PENDING, "Swap is not pending");

        swap.status = SwapStatus.CANCELLED;
        swap.resolvedAt = block.timestamp;

        delete activeSwapForToken[swap.proposerTokenId];
        delete activeSwapForToken[swap.targetTokenId];

        emit SwapCancelled(swapId, msg.sender);
    }

    function rejectSwap(uint256 swapId) external {
        SwapProposal storage swap = swaps[swapId];

        require(swap.swapId != 0, "Swap does not exist");
        require(swap.target == msg.sender, "Not the target of this swap");
        require(swap.status == SwapStatus.PENDING, "Swap is not pending");

        swap.status = SwapStatus.REJECTED;
        swap.resolvedAt = block.timestamp;

        delete activeSwapForToken[swap.proposerTokenId];
        delete activeSwapForToken[swap.targetTokenId];

        emit SwapRejected(swapId, msg.sender);
    }

    function getProposerSwaps(
        address proposer
    ) external view returns (uint256[] memory) {
        return proposerSwaps[proposer];
    }

    function getReceivedSwaps(
        address target
    ) external view returns (uint256[] memory) {
        return receivedSwaps[target];
    }

    function getSwap(
        uint256 swapId
    ) external view returns (SwapProposal memory) {
        require(swaps[swapId].swapId != 0, "Swap does not exist");
        return swaps[swapId];
    }

    function getPendingSwapsForUser(
        address user
    ) external view returns (SwapProposal[] memory) {
        uint256[] memory received = receivedSwaps[user];
        uint256 pendingCount = 0;

        for (uint i = 0; i < received.length; i++) {
            if (swaps[received[i]].status == SwapStatus.PENDING) {
                pendingCount++;
            }
        }

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

    function isTokenInActiveSwap(uint256 tokenId) external view returns (bool) {
        return activeSwapForToken[tokenId] != 0;
    }
}
