FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/

RUN npm install
RUN cd frontend && npm install

COPY . .

RUN npx hardhat compile

RUN mkdir -p frontend/src/abi && \
    cp artifacts/contracts/Roulette.sol/Roulette.json frontend/src/abi/ && \
    cp artifacts/contracts/RewardNFT.sol/RewardNFT.json frontend/src/abi/ && \
    cp artifacts/contracts/Trade.sol/Trade.json frontend/src/abi/

EXPOSE 8545 5173

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]