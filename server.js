'use strict';

const Hapi = require('hapi');
const blockchain = require('./blockchain.js');
const Block = require('./block');
const validationTimeSeconds = 10

// to keep the register request we'll use cache with TTL
// In future implementation some database can be used
const NodeCache = require( "node-cache" );
const regCache = new NodeCache({ stdTTL: validationTimeSeconds });
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
        console.log(blockchain);
        return blockchain.getBlock(request.params.height).then(function(block){
            return block;
        }, function(err){
            return 'Not Found!';
        });
        //return 'Hello, ' + encodeURIComponent(request.params.height) + '!';
    }
});

// post a block
server.route({
    method: 'POST',
    path: '/block',
    handler: (request, h) => {
        if(null === request.payload || !request.payload.hasOwnProperty('body'))
            return 'invalid block data';

        return blockchain.addBlock(new Block(request.payload.body)).then(function(result){
            return result;
        }, function(err){
            return err;
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

        // put the message in the cache with the action required
        const register = regCache.set(request.payload.address, {"action":starRegistryLabel, "timestamp":ts}, validationTimeSeconds, function(err, success){
            if(err) console.log('some error', err);
            if(!success) console.log('problem in register the request');
        });

        if(!register) {
            console.log('problem in register the request');
            return 'problem in register the request';
        }

        // new registration
        return {
            "address": request.payload.address,
            "requestTimeStamp": ts,
            "message": message+":"+starRegistryLabel,
            "validationWindow": validationTimeSeconds
        }
    }
});

server.route({
    method: 'POST',
    path: '/message-signature/validate2',
    handler: (request, h) => {
        if(null === request.payload || !request.payload.hasOwnProperty('address'))
            return 'missing address';
            
        if(null === request.payload || !request.payload.hasOwnProperty('signature'))
            return 'missing signature';

        // retrieve registration
        return new Promise((resolve, reject) => {
            regCache.get(request.payload.address, function(err, value){
                if(err) reject(err);
                resolve(value);
            });
        }).then(function(value){
            if(value == undefined) return 'expired or invalid';
            // for now return success
            return {
                "registerStar": true,
                "status": {
                    "address": request.payload.address,
                    "requestTimeStamp": value.timestamp,
                    "message": request.payload.address+":"+value.timestamp+":"+value.action,
                    "validationWindow": validationTimeSeconds-(new Date().getTime().toString().slice(0,-3)-value.timestamp),
                    "messageSignature": "valid"
                }
            };
        }, function(err){
            return 'problem to access cache';
        });;
    }
});

const init = async () => {
    // create blockchain
    console.log(blockchain);
    await server.start();
    console.log(`Server running at: ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {

    console.log(err);
    process.exit(1);
});

init();