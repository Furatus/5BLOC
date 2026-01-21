// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CasinoToken is ERC20, Ownable {
    
    // Montant donné à chaque claim
    uint256 public faucetAmount = 1000 * 10**18; // 1000 CSN
    
    // Cooldown entre chaque claim (en secondes)
    uint256 public faucetCooldown = 24 hours;
    
    // Dernier claim par adresse
    mapping(address => uint256) public lastClaim;
    
    event TokensClaimed(address indexed player, uint256 amount);
    event FaucetConfigUpdated(uint256 amount, uint256 cooldown);

    constructor() ERC20("CasinoToken", "CSN") Ownable(msg.sender) {
        // Mint initial pour le casino (pour payer les gains)
        _mint(msg.sender, 10_000_000 * 10**18); // 10 millions de tokens
    }

    function claimFreeTokens() external {
        require(canClaim(msg.sender), "Must wait before claiming again");
        
        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, faucetAmount);
        
        emit TokensClaimed(msg.sender, faucetAmount);
    }
    
    function canClaim(address player) public view returns (bool) {
        return block.timestamp >= lastClaim[player] + faucetCooldown;
    }
    
    function timeUntilNextClaim(address player) external view returns (uint256) {
        uint256 nextClaimTime = lastClaim[player] + faucetCooldown;
        
        if (block.timestamp >= nextClaimTime) {
            return 0;
        }
        
        return nextClaimTime - block.timestamp;
    }

    function setFaucetConfig(uint256 _amount, uint256 _cooldown) external onlyOwner {
        require(_amount > 0, "Amount must be > 0");
        faucetAmount = _amount;
        faucetCooldown = _cooldown;
        
        emit FaucetConfigUpdated(_amount, _cooldown);
    }
 
    function gift(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    function giftBatch(address[] calldata recipients, uint256 amount) external onlyOwner {
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amount);
        }
    }

    function mintForCasino(uint256 amount) external onlyOwner {
        _mint(owner(), amount);
    }
}