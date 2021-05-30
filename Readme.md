# Readme

## Running this project

1. Initialize environment variables before running

`cp sample.env .env`


2.  Make sure pm2 & elasticsearch are installed on the system (configure elasticsearch url on secrets.js) 

npm install
// Runs data collector
npx hardhat run --network mainnet data.js

// Runs backend
node index.js
