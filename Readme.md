# Readme

## Running this project

1. Create secrets.js before running

`cp secrets.js.template secrets.js`


2.  Make sure pm2 & elasticsearch are installed on the system (configure elasticsearch url on secrets.js) 

npm install
// Runs data collector
npx hardhat run --network mainnet data.js
// Runs backend
node index.js
