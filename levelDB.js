/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

exports.db = db;
// Add data to levelDB with key/value pair
exports.addLevelDBData = function (key,value){
  return new Promise((resolve, reject) => {
    db.put(key, value, function(err) {
      if (err) reject(err);
      else resolve(value);
    });
  });
}

// Get data from levelDB with key
exports.getLevelDBData = function(key){
  return new Promise((resolve, reject) => {
    db.get(key, function(err, value) {
      if (err) reject(err);
      else resolve(value);
    });
  });
}

// Get latest block (bigger height)
exports.getLatestBlockDB = function() {
  return new Promise((resolve, reject) => {
  	let i = -1;
    db.createReadStream().on('data', function(data) {
      i++;
    }).on('error', function(err) {
      reject(err);
    }).on('close', function() {
      resolve(i);
    });
  });
}
 
// Get latest block (bigger height)
exports.filterBlocksDB = function(filter, value, handler) {
  return new Promise((resolve, reject) => {
  	let blocks = [];
    db.createReadStream().on('data', function(data) {
      let obj = JSON.parse(data.value);
      if(filter(obj, value))
        blocks.push(handler(obj));
    }).on('error', function(err) {
      reject(err);
    }).on('close', function() {
      resolve(blocks);
    });
  });
}
