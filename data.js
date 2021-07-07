const { ethers, upgrades } = require("hardhat");

const { Client } = require('@elastic/elasticsearch')
require('dotenv').config()

const client = new Client({ node: process.env.ELK_URL || "http://localhost:9200" })

const UNISWAP_FEES = 0.03;
const REPEAT_SECS = 600;

let provider = new ethers.providers.InfuraProvider("homestead", { projectId: process.env.INFURA_projectId , projectSecret: process.env.INFURA_projectSecret } );

// IUniswapV2Pair
const IUniswapV2Pair = require('@uniswap/v2-core/build/IUniswapV2Pair.json');
let ETH_FEI = new ethers.Contract("0x94B0A3d511b6EcDb17eBF877278Ab030acb0A878", IUniswapV2Pair.abi, provider);
let FEI_USDC = new ethers.Contract("0x40c6bc1db179a5c3d464cac557ab890825c638f3", IUniswapV2Pair.abi, provider);

const EthUniswapPCVDeposit_ABI = require('./contracts/custom/EthUniswapPCVDeposit.json');
let EthUniswapPCVDeposit = new ethers.Contract("0x5d6446880fcd004c851ea8920a628c70ca101117", EthUniswapPCVDeposit_ABI, provider);

const EthReserveStabilizer_ABI = require('./contracts/custom/EthReserveStabilizer.json');
let EthReserveStabilizer_Address = "0xa08A721dFB595753FFf335636674D76C455B275C"
let EthReserveStabilizer = new ethers.Contract(EthReserveStabilizer_Address, EthReserveStabilizer_ABI, provider);

const EthLidoPCVDeposit_ABI = require('./contracts/custom/EthLidoPCVDeposit.json');
let EthLidoPCVDeposit_Address = "0xAc38Ee05C0204A1E119C625d0a560D6731478880"
let EthLidoPCVDeposit = new ethers.Contract(EthLidoPCVDeposit_Address, EthLidoPCVDeposit_ABI, provider);


const FEIToken_ABI = require('./contracts/custom/Fei.json');
let FeiToken = new ethers.Contract("0x956F47F50A910163D8BF957Cf5846D573E7f87CA", FEIToken_ABI, provider);

const FEIUniswapOracle_ABI = require('./contracts/custom/UniswapOracle.json');
let FEIUniswapOracle = new ethers.Contract("0x087F35bd241e41Fc28E43f0E8C58d283DD55bD65", FEIUniswapOracle_ABI, provider);

let ETHPCVDripper_Address = "0xDa079A280FC3e33Eb11A78708B369D5Ca2da54fE"

async function main() {

    // FEI Related CONTRACTS
    let FEI_ETH_protocol_LP = ethers.utils.formatUnits(await EthUniswapPCVDeposit.liquidityOwned(), 18) // LP tokens owned by PCV
    let Stablizer_ETH = ethers.utils.formatUnits((await provider.getBalance(EthReserveStabilizer_Address)).toString(), 18) // Balance of stablizer
    let PCV_Dripper_ETH = ethers.utils.formatUnits((await provider.getBalance(ETHPCVDripper_Address)).toString(), 18)  // Balance of dripper
    let FEISupply = await FeiToken.totalSupply() // TOTAL FEI Supply
    let FEISupply_Decimal = ethers.utils.formatUnits(FEISupply.toString(), 18) // TOTAL FEI Supply

    // UNI ETH-FEI CONTRACT
    let FEI_ETH_LP_ETH_reserves = await ETH_FEI.getReserves() // FEI-ETH UNI RESERVES
    let FEI_ETH_LP_ETH_amt = ethers.utils.formatUnits(FEI_ETH_LP_ETH_reserves[1].toString(), 18) // FEI-ETH UNI ETH RESERVES
    let FEI_ETH_LP_FEI_amt = ethers.utils.formatUnits(FEI_ETH_LP_ETH_reserves[0].toString(), 18) // FEI-ETH UNI ETH RESERVES
    let FEI_ETHuniswap_LP = ethers.utils.formatUnits(await ETH_FEI.totalSupply(), 18) // LP Tokens on UNI FEI-ETH

    let LIDOStakedETH_Decimal = ethers.utils.formatUnits(await EthLidoPCVDeposit.balance(), 18) // LP Tokens on UNI FEI-ETH

    // Other Contracts: FEI/USDC Pair & ETH ORACLE
    let ETHFEI_Oracle = (await FEIUniswapOracle.read())[0][0];

    // Calculate Collaterization Ratio
    let LP_PERCENT = FEI_ETH_protocol_LP/FEI_ETHuniswap_LP
    let ETH_ON_FEI_PCV = LP_PERCENT * FEI_ETH_LP_ETH_amt
    let FEI_ON_FEI_PCV = LP_PERCENT * FEI_ETH_LP_FEI_amt

    let CIRCULATING_FEI = parseFloat(FEISupply_Decimal - FEI_ON_FEI_PCV)
    let TOTAL_ETH_PCV = parseFloat(Stablizer_ETH) + parseFloat(ETH_ON_FEI_PCV) + parseFloat(PCV_Dripper_ETH) + parseFloat(LIDOStakedETH_Decimal)
    let ETH_PRICE = parseFloat(ethers.utils.formatUnits(ETHFEI_Oracle.toString(), 18) )
    let collaterization_ratio = TOTAL_ETH_PCV*ETH_PRICE/CIRCULATING_FEI*100

    let FEI_ETH_protocol_pricee_FEI = ETH_PRICE/(parseFloat(FEI_ETH_LP_FEI_amt)/parseFloat(FEI_ETH_LP_ETH_amt))

    let data_to_store = {
        pcv_lp_percent: LP_PERCENT,
        eth_on_lp_pcv: parseFloat(ETH_ON_FEI_PCV),
        eth_on_lp_uni: parseFloat(FEI_ETH_LP_ETH_amt),
        fei_on_lp_uni: parseFloat(FEI_ETH_LP_FEI_amt),
        fei_on_lp_pcv: parseFloat(FEI_ON_FEI_PCV),
        circulating_fei: CIRCULATING_FEI,
        total_eth_pcv: TOTAL_ETH_PCV,
        eth_oracle_price: ETH_PRICE,
        total_fei_supply: parseFloat(FEISupply_Decimal),
        collaterization_ratio: collaterization_ratio,
        fei_usd_oracle_price: FEI_ETH_protocol_pricee_FEI,
        staked_eth_amt: parseFloat(LIDOStakedETH_Decimal),
        ts: new Date(),
        block: FEI_ETH_LP_ETH_reserves[2]
    }

    let trail_data = {}
    let fei_metadata = {}
    let was_caught = false;
    try {
        trail_data = await client.search({ index: 'fei-data', body: {"query": {"match_all": {}},"size": 1,"sort": [{"timestamp_": {"order": "desc"}}]}  })
        fei_metadata = await client.get({ index: 'fei-metadata', id: 'data' })
        console.log("Grabbed old data.")
    } catch (e) {
        was_caught = true;
        // Inserting new data again
        console.log("Error not initialized! Initializing.");
        await client.index({ index: 'fei-data', body: { timestamp_: data_to_store.ts, fei_data: data_to_store } })
        await client.index({ index: 'fei-metadata', id:"data", body: { ts_: new Date(), trail_block_profit: 0, new_block_profit: 0, cumulative_profit: 0 } })

    } finally { // Update metadata
        if(was_caught) {
            console.log("Skipping metadata insertion since trail data was not found.")
        } else {
            console.log("Inserting metadata since both trail & current data is available")
            // Inserting new data again
            trail_data = trail_data.body.hits.hits[0]._source.fei_data
            let fei_diff_uni = Math.abs(trail_data.fei_on_lp_uni - data_to_store.fei_on_lp_uni) * data_to_store.pcv_lp_percent * UNISWAP_FEES;
            fei_metadata = fei_metadata.body._source;
            console.log(`Date:${data_to_store.ts}, Block: ${data_to_store.block}, CR: ${data_to_store.collaterization_ratio}, lp_profit: ${fei_diff_uni}`)
            let new_metadata = {  
                ts_: new Date(), 
                trail_block_profit: fei_metadata.new_block_profit, 
                new_block_profit: fei_diff_uni, 
                cumulative_profit: fei_diff_uni + fei_metadata.cumulative_profit,
                stablizer_eth: parseFloat(Stablizer_ETH),
                dripped_eth: parseFloat(PCV_Dripper_ETH)

            }
            await client.index({ index: 'fei-data', body: { timestamp_: data_to_store.ts, fei_data: data_to_store } })
            await client.index({ index: 'fei-metadata', id: "data", body: new_metadata })
        }
    }
}

main();

setInterval(function(){
    main();
}, REPEAT_SECS*1000);
