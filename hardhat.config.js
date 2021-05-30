// hardhat.config.js
require('@nomiclabs/hardhat-ethers');
require('@openzeppelin/hardhat-upgrades');

const secrets = require('./secrets');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
 module.exports = {
  networks: {
    rinkeby: {
      url :secrets.network.rinkeby.url,
      accounts:  secrets.network.rinkeby.accounts
  },
  mainnet: {
    url :secrets.network.mainnet.url,
    accounts:  secrets.network.mainnet.accounts
  }
  
},
  solidity: "0.8.0"
};
