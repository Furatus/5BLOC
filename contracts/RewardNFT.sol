// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract RewardNFT is ERC721, Ownable {
    

    uint256 public constant MAX_INVENTORY = 20;
    
    
    enum RewardType { 
        COMMON,      
        RARE,        
        EPIC,        
        LEGENDARY    
    }
    
    struct RewardMetadata {
        string name;                    
        RewardType rewardType;          
        string ipfsHash;                
        address[] previousOwners;       
        uint256 createdAt;              
        uint256 lastTransferAt;         
    }
    
    uint256 private _tokenIdCounter;
    
    
    mapping(uint256 => RewardMetadata) public tokenMetadata;
    
    
    mapping(address => uint256) public userInventoryCount;
    

    event RewardMinted(
        address indexed to,
        uint256 indexed tokenId,
        RewardType rewardType,
        string name
    );

    
    constructor() ERC721("RouletteReward", "REWARD") Ownable(msg.sender) {}

    function mintReward(
        address to,
        string memory name,
        RewardType rewardType,
        string memory ipfsHash
    ) external onlyOwner returns (uint256) {
        
        require(
            userInventoryCount[to] < MAX_INVENTORY, 
            "Inventory is full (max 20 rewards)"
        );
        
        uint256 tokenId = _tokenIdCounter++;
        
        tokenMetadata[tokenId] = RewardMetadata({
            name: name,
            rewardType: rewardType,
            ipfsHash: ipfsHash,
            previousOwners: new address[](0), 
            createdAt: block.timestamp,
            lastTransferAt: block.timestamp
        });
        
        _safeMint(to, tokenId);
        
        
        emit RewardMinted(to, tokenId, rewardType, name);
        
        return tokenId;
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        if (from != address(0)) {
            
            userInventoryCount[from]--;
            
            tokenMetadata[tokenId].previousOwners.push(from);
            
            tokenMetadata[tokenId].lastTransferAt = block.timestamp;
        }
        
        if (to != address(0)) {
            require(
                userInventoryCount[to] < MAX_INVENTORY,
                "Recipient inventory is full"
            );
            
            userInventoryCount[to]++;
        }
        
        return super._update(to, tokenId, auth);
    }
    
    function getTokenMetadata(uint256 tokenId) 
        external 
        view 
        returns (RewardMetadata memory) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenMetadata[tokenId];
    }
    
    function canReceiveReward(address user) external view returns (bool) {
        return userInventoryCount[user] < MAX_INVENTORY;
    }
    
    function getInventoryCount(address user) external view returns (uint256) {
        return userInventoryCount[user];
    }

    function totalSupply() public view returns (uint256) {
    return _tokenIdCounter;
    }
}