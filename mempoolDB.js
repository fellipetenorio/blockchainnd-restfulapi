/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
// let's use ttl functionality to facilitade our lives!
const ttl = require('level-ttl'); 
const mempoolDB = './mempooldata';
const mempool = ttl(level(mempoolDB));

exports.addWalletMemPool = function(key, data, ttl) {
  return new Promise((resolve, reject) => {
    mempool.put(key, data, {ttl: ttl}, function(err) {
      if(err) reject(err);
      resolve(data);
    })
  });
}