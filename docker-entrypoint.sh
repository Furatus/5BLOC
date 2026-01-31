#!/bin/sh
# filepath: docker-entrypoint.sh

npx hardhat node &

sleep 5

npx hardhat run scripts/deploy.js --network localhost

cp artifacts/contracts/Roulette.sol/Roulette.json frontend/src/abi/
cp artifacts/contracts/RewardNFT.sol/RewardNFT.json frontend/src/abi/
cp artifacts/contracts/Trade.sol/Trade.json frontend/src/abi/

node scripts/update-contracts.js

cd frontend
npm run dev -- --host 0.0.0.0

wait