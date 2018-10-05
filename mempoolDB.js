/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

const level = require('level');
// let's use ttl functionality to facilitade our lives!
const ttl = require('level-ttl'); 
const mempoolDB = './mempooldata';
const mempool = ttl(level(mempoolDB));

exports.set = function(key, data, ttlInSeconds) {
  return new Promise((resolve, reject) => {
    mempool.put(key, JSON.stringify(data), {ttl: ttlInSeconds*1000}, function(err) {
      if(err) reject(err);
      resolve(data);
    });
  });
}

exports.get = function(key) {
  return new Promise((resolve, reject) => {
    mempool.get(key, function(err, data) {
      if (err) reject(err);
      else resolve(JSON.parse(data));
    });
  });
}

exports.del = function(key) {
  return new Promise((resolve, reject) => {
    mempool.del(key, function(err) {
      if (err) reject(err);
      resolve();
    });
  });
}