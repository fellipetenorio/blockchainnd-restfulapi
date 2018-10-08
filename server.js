'use strict';

const Hapi = require('hapi');
const blockchain = require('./blockchain.js');
const Block = require('./block');
const validationTimeSeconds = 5 * 60; // project specification
const starStorySizeLimit = 250;
const bitcoin = require('bitcoinjs-lib');
const bitcoinMessage = require('bitcoinjs-message');
const mempool = require('./mempoolDB');

// to keep the register request we'll use cache with TTL
// In future implementation some database can be used
const NodeCache = require( "node-cache" );
// - perhaps change to a file storage to not lose the requests?
//const regCache = new NodeCache({ stdTTL: validationTimeSeconds });
// The name of the action
const starRegistryLabel = "starRegistry";

const server = Hapi.server({
    port: 8000,
    host: 'localhost'
});

// Initial Test
server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => {
        return 'Hello, world!';
    }
});

// get block
server.route({
    method: 'GET',
    path: '/block/{height}',
    handler: (request, h) => {
        return blockchain.getBlock(request.params.height)
        .then(function(blockStr){
            let block = JSON.parse(blockStr);
            if(block.body.star == undefined) {
                return 'Not found';
            }

            block.body.star.storyDecoded = Buffer.from(block.body.star.story, 'hex').toString();
            return block;
        }, function(err){
            return 'Not Found!';
        });
    }
});

// star registry request validation
server.route({
    method: 'POST',
    path: '/requestValidation',
    handler: (request, h) => {
        if(null === request.payload || !request.payload.hasOwnProperty('address'))
            return 'invalid block data';

        // put in cache with the TTL
        const ts = new Date().getTime().toString().slice(0,-3);
        const message = request.payload.address+":"+ts;

        //When re-submitting within validation window, validation window should reduce until it expires.
        // if is a re-submitting. If exists, only show the updated ttl
        return mempool.get(request.payload.address)
        .then(function(starRegistration){
            // return the registration with updated ttl
            let currentTTL = validationTimeSeconds-(new Date().getTime().toString().slice(0,-3)-starRegistration.timestamp);
            return {
                "address": request.payload.address,
                "requestTimeStamp": starRegistration.timestamp,
                "message": message+":"+starRegistryLabel,
                "validationWindow": currentTTL
            }
        }, function(err){
            // new registry
            // put the message in the cache with the action required
            return mempool.set(request.payload.address, 
            {"action":starRegistryLabel, "timestamp":ts, "valid":false}, validationTimeSeconds)
            .then(function(data){
                return {
                    "address": request.payload.address,
                    "requestTimeStamp": ts,
                    "message": message+":"+starRegistryLabel,
                    "validationWindow": validationTimeSeconds
                }
            }, function(err){
                console.log('problem in register the request');
                return 'problem in register the request';
            });
        });
    }
});

// validate message-signature
server.route({
    method: 'POST',
    path: '/message-signature/validate',
    handler: (request, h) => {
        if(null === request.payload || !request.payload.hasOwnProperty('address'))
            return 'missing address';
            
        if(null === request.payload || !request.payload.hasOwnProperty('signature'))
            return 'missing signature';

        let validateResult = {
            "registerStar": false, // by default is not valid
            "status": {
                "address": request.payload.address,
                "requestTimeStamp": 0,
                "message": "",
                "validationWindow": 0,
                "messageSignature": "invalid"
            }
        };
        // retrieve registration
        return mempool.get(request.payload.address).then(function(value){
            if(value == undefined) return 'expired or invalid';
            // check validation
            let address = request.payload.address;
            let signature = request.payload.signature;
            let message = address+":"+value.timestamp+":"+value.action;
            
            let valid = bitcoinMessage.verify(message, address, signature);
            let newTTLInSec = validationTimeSeconds-(new Date().getTime().toString().slice(0,-3)-value.timestamp);
            
            if(0 >= newTTLInSec)  return 'expired or invalid'; // zero

            validateResult.status.message = message;
            validateResult.status.validationWindow = newTTLInSec;
            validateResult.status.requestTimeStamp = value.timestamp;
            
            // save in mempool and return
            return mempool.set(address,
                {"action":starRegistryLabel, "timestamp":value.timestamp, "valid":valid}, newTTLInSec).then(function(success){
                if(success) {
                    // status updated
                    validateResult.registerStar = valid;
                    validateResult.status.messageSignature = (valid?"valid":"invalid");
                } else {
                    console.log('problem to update mempool');
                    validateResult.registerStar = false;
                } 
                return validateResult;
            }, function(err){
                return validateResult;
            });
        }, function(err){
            return validateResult;
        });;
    }
});

// post a block
server.route({
    method: 'POST',
    path: '/block',
    handler: (request, h) => {
        const body = request.payload;
        if(null === body.address  || !body.hasOwnProperty('address'))
            return 'missing address';
        // validate star properties
        if(null === body.star  || !body.hasOwnProperty('star'))
            return 'missing star object';
        if(null === body.star.ra  || !body.star.hasOwnProperty('ra'))
            return 'missing right_ascension';
        if(null === body.star.dec  || !body.star.hasOwnProperty('dec'))
            return 'missing declination';
        if(null === body.star.story  || !body.star.hasOwnProperty('story'))
            return 'missing start story';
        
        // check if the story only contains ASCII characters
        if(!(/^[\x00-\x7F]*$/.test(body.star.story))) 
            return 'star story should contain ASCII characters';

        // check story size limit
        let storyHex = Buffer.from(body.star.story).toString('hex');
        if(storyHex.length > starStorySizeLimit)
            return 'the hex of star story is too large (' + storyHex.length + ') the limit is '+starStorySizeLimit+' characteres';
        
        // get validation from mempool
        return mempool.get(request.payload.address).then(function(starRegistration){
            if(starRegistration == undefined) return 'expired or invalid';
            // check validation and ttl
            let newTTLInSec = validationTimeSeconds-(new Date().getTime().toString().slice(0,-3)-starRegistration.timestamp);
            console.log(starRegistration);
            console.log(newTTLInSec);
            
            if(!starRegistration.valid || 0 >= newTTLInSec) {
                // invalid, remove from mempool e return
                return mempool.del(request.payload.address)
                .then(function(){
                    return 'expired or invalid';
                }, function(err){
                    return 'expired or invalid';
                });
            }
            // valid and not expired, let's save the block
            // create a new star object to sanitize the data
            let newStart = {
                "ra": body.star.ra,
                "dec": body.star.dec,
                "story": storyHex
            };
            // add optionals fields if exists
            // magnitude (mag)
            if(null !== body.star.story.mag  && body.star.hasOwnProperty('mag'))
                newStart.mag = body.star.mag;
            // constellation (con)
            if(null !== body.star.story.con  && body.star.hasOwnProperty('con'))
                newStart.con = body.star.con;

            // put the sanitize data back
            body.star = newStart;
            
            // save the start in block block chain
            return blockchain.addBlock(new Block(body))
            .then(function(result){
                // remove request from mempool
                return mempool.del(request.payload.address)
                .then(function(){
                    return JSON.parse(result);
                }, function(err){
                    return 'expired or invalid';
                });
            }, function(err){
                return err;
            });
        }, function(err){
            return "expired or invalid";
        });
    }
});

// get block by star attributes
server.route({
    method: 'GET',
    path: '/stars/{attr}:{value}',
    handler: (request, h) => {
        // fimple filter strategy
        let filter;
        // validate
        if(request.params.attr === 'address') {
            filter = function(block, value){
                return block.body.address != undefined && block.body.address === value;
            }
        } else if(request.params.attr === 'hash') {
            filter = function(block, value){
                return block.hash != undefined && block.hash === value;
            }
        } else {
            return 'invalid search';
        }
        
        // handle block after filter
        let handler = function(block) {
            block.body.star.storyDecoded = Buffer.from(block.body.star.story, 'hex').toString();
            return block;
        }

        return blockchain.filterBlocks(filter, request.params.value, handler)
        .then(function(blocks){
            return blocks;
        }, function(err){
            return 'Not Found!';
        });
        //return 'Hello, ' + encodeURIComponent(request.params.height) + '!';
    }
});

// get block star by height (just like get block/heigth)
server.route({
    method: 'GET',
    path: '/stars/{height}',
    handler: (request, h) => {
        return blockchain.getBlock(request.params.height)
        .then(function(blockStr){
            let block = JSON.parse(blockStr);
            if(block.body.star == undefined) {
                return 'Not found';
            }

            block.body.star.storyDecoded = Buffer.from(block.body.star.story, 'hex').toString();
            return block;
        }, function(err){
            return 'Not Found!';
        });
    }
});

const init = async () => {
    // create blockchain
    await server.start();
    console.log(`Server running at: ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();