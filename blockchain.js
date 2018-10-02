const SHA256 = require('crypto-js/sha256')
const level = require('./levelDB')
const Block = require('./block')

/* ===== Blockchain ===================================
|  Class with a constructor for blockchain data model  |
|  with functions to support:                          |
|     - createGenesisBlock()                           |
|     - getLatestBlock()                               |
|     - addBlock()                                     |
|     - getBlock()                                     |
|     - validateBlock()                                |
|     - validateChain()                                |
|  ====================================================*/
class Blockchain {
  constructor() {
    let t = this;
    level.getLatestBlockDB().then(function(result) {
      if(-1 != result) return;
      t.createGenesisBlock();
    }, function(err){
    	console.log('Unable to open DB!', err);
    });
  }
  
  createGenesisBlock() {
    this.addBlock(new Block('Tenorio First Block (Genesis)'));
  }
  
  // get Block height
  addBlock(newBlock) {
    return new Promise((resolve, reject) => {
      level.getLatestBlockDB().then(function(result) {
        // if this is the genesis, so the heigth will be -1 + 1 = 0
        let height = result+1;
        newBlock.height = height;
        newBlock.time = new Date().getTime().toString().slice(0,-3);
        if(height == 0) {
          // genesis
          newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
          level.addLevelDBData(height, JSON.stringify(newBlock).toString()).then(resolve, reject);
          return;
        }
      
        level.getLevelDBData(result).then(function(result2) {
          // new block in the chain
          let previousBlock = JSON.parse(result2);
          newBlock.previousHash = previousBlock.hash;
          newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();

          // add block to DB
          level.addLevelDBData(height, JSON.stringify(newBlock).toString()).then(resolve, reject);
        }, reject);
      }, reject);
    });
  }
  
  // Get current chain height
  getBlockHeight() {
    return new Promise((resolve, reject) => {
      level.getLatestBlockDB().then(resolve, reject);
    });
  }
  
  // get a block by it's height
  getBlock(height) {
    return new Promise((resolve, reject) => {
      level.getLevelDBData(height).then(resolve, reject);
    });
  }
  
  validateBlock(height) {
    return new Promise((resolve, reject) => {
      level.getLevelDBData(height).then(function(result){
        // compare block chain hash to the object
        let candidate = JSON.parse(result);
        let blockChainHash = candidate.hash;
        candidate.hash = "";
        let newHash = SHA256(JSON.stringify(candidate)).toString();
        resolve(blockChainHash === newHash)
      },reject);
    });
  }
  
  // validate all chain
  validateChain() {
    let bc = this;
    return new Promise((resolve, reject) =>{
      let promisesBlock = [];
      bc.getBlockHeight().then((result) => {
        if(result < 0) // empty chain, so it's validated
          resolve(true);
        
        // put all promises together
        for(let i = result; i >= 0; i--) {
          promisesBlock.push(bc.getBlock(i));
        }
        
        // now iterate over all
        Promise.all(promisesBlock).then(values => {
          if(values.length == 1) {
            // only genesis
            bc.validateBlock(values[0]).then(resolve, reject);
            return;
          }
          for(let i=0, j=values.length; i < j; i++) {
            if(i==j-1) {
              // last block (genesis)
              bc.validateBlock(i).then(resolve, reject);
              return;
            }
            let currentBlock = JSON.parse(values[i]);
            let previousBlock = JSON.parse(values[i+1]);
            
            if(currentBlock.previousHash != previousBlock.hash) 
              resolve(false);
            
          }
          resolve(true);
        });
      });
    });
  }
  
  // method to change some block data to test validation
  changeBlockData(height, newData) {
    return new Promise((resolve, reject) => {
      level.getLevelDBData(height).then(function(result){
        // compare block chain hash to the object
        let dirtyBlock = JSON.parse(result);
        dirtyBlock.data = newData;
        level.addLevelDBData(height, JSON.stringify(dirtyBlock).toString()).then(resolve, reject);
      }, reject);
    });
  }
  
  // equal changeBlockData, but change both data and block hash
  changeChainData(height, newData) {
    return new Promise((resolve, reject) => {
      level.getLevelDBData(height).then(function(result){
        // compare block chain hash to the object
        let dirtyChain = JSON.parse(result);
        dirtyChain.data = newData;
        dirtyChain.hash = "";
        dirtyChain.hash = SHA256(JSON.stringify(dirtyChain)).toString();
        level.addLevelDBData(height, JSON.stringify(dirtyChain).toString()).then(resolve, reject);
      }, reject);
    });
  }
}
module.exports = new Blockchain()
/*
// test
let blockchain = new Blockchain();

// validate chain
function testValidateChain() {
  blockchain.validateChain().then((validated) => {
    console.log('the chain is '+(validated?'OK':'WRONG'));
  });
}

// validating blocks
function testValidateBlock (i) {
  setTimeout(function () {
    console.log('validate '+i);
    let blockTest = new Block("Test Block - " + (i + 1));
    blockchain.validateBlock(i).then(function(result){
      console.log('#'+i+': '+result);
      i++;
      testValidateBlock(i);
    }, function(err){
      // now validate the chain, must found the adultered block (height = 1)
      testValidateChain();
    });
  }, 1000);
}

// getting block
function testGetBlock (i) {
  setTimeout(function () {
    console.log('get '+i);
    let blockTest = new Block("Test Block - " + (i + 1));
    blockchain.getBlock(i).then(function(result){
      console.log('#'+i+': '+result);
      i++;
      testGetBlock(i);
    }, function(err){
      testValidateBlock(0);
      // uncomment to insert some problems
      /*
      blockchain.changeChainData(1, 'asdf').then(function(result) {
        testValidateBlock(0);
      }, function(err){
        console.log(err);
      });
      */
     /*
    });
  }, 1000);
}
/*
// inserting
(
  function testAddBlock (i) {
  setTimeout(function () {
    console.log('add '+i);
    let blockTest = new Block("Test Block - " + (i + 1));
    blockchain.addBlock(blockTest).then((result) => {
      console.log(result);
      i++;
      if (i < 2)  testAddBlock(i);
      else testGetBlock(0);
    });
  }, 1000);
}
)(0);
*/