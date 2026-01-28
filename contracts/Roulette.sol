// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "./RewardNFT.sol";

contract Roulette {
    uint256 public constant TICKET_PRICE = 0.01 ether;

    uint8[] private RED_NUMBERS = [
        1,
        3,
        5,
        7,
        9,
        12,
        14,
        16,
        18,
        19,
        21,
        23,
        25,
        27,
        30,
        32,
        34,
        36
    ];

    enum BetType {
        RED,
        BLACK,
        EVEN,
        ODD,
        DOZEN_1,
        DOZEN_2,
        DOZEN_3,
        COLUMN_1,
        COLUMN_2,
        COLUMN_3,
        NUMBER,
        ZERO
    }

    struct Game {
        address player;
        BetType betType;
        uint8 numberBet;
        uint8 result;
        bool hasWon;
        bool isPlayed;
        uint256 timestamp;
    }

    RewardNFT public rewardNFT;

    uint256 private _gameIdCounter;

    mapping(uint256 => Game) public games;

    mapping(address => uint256[]) public playerGames;

    event TicketPurchased(
        address indexed player,
        uint256 indexed gameId,
        BetType betType,
        uint8 numberBet
    );

    event RouletteSpun(
        uint256 indexed gameId,
        address indexed player,
        uint8 result,
        bool hasWon
    );

    event RewardDistributed(
        address indexed player,
        uint256 indexed gameId,
        uint256 nftTokenId,
        RewardNFT.RewardType rewardType
    );

    constructor(address _rewardNFTAddress) {
        rewardNFT = RewardNFT(_rewardNFTAddress);
    }

    function buyTicketAndSpin(
        BetType betType,
        uint8 numberBet
    ) external payable returns (uint256) {

        require(msg.value == TICKET_PRICE, "Incorrect ticket price");


        require(numberBet <= 36, "Number must be between 0 and 36");


        if (betType == BetType.NUMBER) {
            require(
                numberBet >= 1 && numberBet <= 36,
                "Number bet must be 1-36"
            );
        } else if (betType == BetType.ZERO) {
            require(numberBet == 0, "Zero bet must specify number 0");
        }


        uint256 gameId = _gameIdCounter++;

        games[gameId] = Game({
            player: msg.sender,
            betType: betType,
            numberBet: numberBet,
            result: 0,
            hasWon: false,
            isPlayed: false,
            timestamp: block.timestamp
        });

        playerGames[msg.sender].push(gameId);

        emit TicketPurchased(msg.sender, gameId, betType, numberBet);


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

        games[gameId].result = result;
        games[gameId].isPlayed = true;

        bool hasWon = _checkWin(betType, numberBet, result);
        games[gameId].hasWon = hasWon;

        emit RouletteSpun(gameId, msg.sender, result, hasWon);

        if (hasWon) {
            _distributeReward(msg.sender, betType, gameId);
        }

        return gameId;
    }

    function _checkWin(
        BetType betType,
        uint8 numberBet,
        uint8 result
    ) private view returns (bool) {
        if (betType == BetType.ZERO) {
            return result == 0;
        }

        if (result == 0) return false;

        if (betType == BetType.RED) {
            return _isRed(result);
        } else if (betType == BetType.BLACK) {
            return !_isRed(result);
        } else if (betType == BetType.EVEN) {
            return result % 2 == 0;
        } else if (betType == BetType.ODD) {
            return result % 2 == 1;
        } else if (betType == BetType.DOZEN_1) {
            return result >= 1 && result <= 12;
        } else if (betType == BetType.DOZEN_2) {
            return result >= 13 && result <= 24;
        } else if (betType == BetType.DOZEN_3) {
            return result >= 25 && result <= 36;
        } else if (betType == BetType.COLUMN_1) {
            return result % 3 == 1;
        } else if (betType == BetType.COLUMN_2) {
            return result % 3 == 2;
        } else if (betType == BetType.COLUMN_3) {
            return result % 3 == 0;
        } else if (betType == BetType.NUMBER) {
            return result == numberBet;
        }

        return false;
    }

    function _isRed(uint8 number) private view returns (bool) {
        for (uint i = 0; i < RED_NUMBERS.length; i++) {
            if (RED_NUMBERS[i] == number) {
                return true;
            }
        }
        return false;
    }

    function _distributeReward(
        address player,
        BetType betType,
        uint256 gameId
    ) private {
        if (!rewardNFT.canReceiveReward(player)) {
            return;
        }

        RewardNFT.RewardType rewardType;
        string memory rewardName;

        if (betType == BetType.ZERO) {
            rewardType = RewardNFT.RewardType.LEGENDARY;
            rewardName = "Diamond Teddy - Zero";
        } else if (betType == BetType.NUMBER) {
            rewardType = RewardNFT.RewardType.EPIC;
            rewardName = "Golden Teddy";
        } else if (
            betType == BetType.DOZEN_1 ||
            betType == BetType.DOZEN_2 ||
            betType == BetType.DOZEN_3 ||
            betType == BetType.COLUMN_1 ||
            betType == BetType.COLUMN_2 ||
            betType == BetType.COLUMN_3
        ) {
            rewardType = RewardNFT.RewardType.RARE;
            rewardName = "Silver Teddy";
        } else {
            rewardType = RewardNFT.RewardType.COMMON;
            rewardName = "Bronze Teddy";
        }

        uint256 nftTokenId = rewardNFT.mintReward(
            player,
            rewardName,
            rewardType,
            "QmPlaceholder"
        );

        emit RewardDistributed(player, gameId, nftTokenId, rewardType);
    }

    function getPlayerGames(
        address player
    ) external view returns (uint256[] memory) {
        return playerGames[player];
    }

    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
