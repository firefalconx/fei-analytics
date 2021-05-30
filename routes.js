var express = require('express');
var router = express.Router();
const _ = require('lodash');
require('dotenv').config()

const { Client } = require('@elastic/elasticsearch')
const client = new Client({ node: process.env.ELK_URL || "http://localhost:9200" })


//////  TODO IN THIS ORDER: SETUP PANEL  

router.get('/refresh', async function(req, res, next) {
  // Sanitize via code in case app hasnt been deployed via proxy
  // if(req.headers.host != "localhost:3000") res.send(404);

  let newest_data = (await client.search({ index: 'fei-data', body: {"query": {"match_all": {}},"size": 1,"sort": [{"timestamp_": {"order": "desc"}}]}  })).body.hits.hits[0]._source.fei_data
  let oldest_data = (await client.search({ index: 'fei-data', body: { "query": {"match_all": {}},"size": 1,"sort": [{"timestamp_": {"order": "asc"}}]}  })).body.hits.hits[0]._source

  let timestamp_cr = await client.search({
    index: "fei-data",
    "_source": [ 
          "timestamp_",  
          "fei_data.collaterization_ratio", 
          "fei_data.total_eth_pcv", 
          "fei_data.circulating_fei", 
          "fei_data.fei_usd_oracle_price"],
    body: {
       size: 2000, // Aggregate this later on 
       sort: [{ "timestamp_": { "order": "asc" } }],
       query: { "range": {  "timestamp_": { "gte": "now-7d"  } } }
      }
  })
 
  let timestamp_ct = _.map(timestamp_cr.body.hits.hits, function(m){   return { 
        date: new Date(m._source.timestamp_), 
        collaterization_ratio: m._source.fei_data.collaterization_ratio.toString(),
        total_eth_pcv: m._source.fei_data.total_eth_pcv.toString(),
        circulating_fei: parseInt(m._source.fei_data.circulating_fei).toString(),
        fei_usd_oracle_price: m._source.fei_data.fei_usd_oracle_price.toString()
    }     
  })

  let fei_metadata = (await client.get({ index: 'fei-metadata', id: 'data' })).body._source

  // trail_block_profit + new_block_profit = cumulative_profit
  // trail_block_profit  add with new block profit until cumulative is reached

  let data_to_return = {
    cr: newest_data.collaterization_ratio,
    fei_usd_oracle_price: newest_data.fei_usd_oracle_price,
    fei_metadata,
    timestamp_ct
  }

  res.json(data_to_return)
  
});

module.exports = router;
