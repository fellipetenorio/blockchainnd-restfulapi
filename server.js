'use strict';

const Hapi = require('hapi');
const blockchain = require('./blockchain.js');
const Block = require('./block');
const validationTimeSeconds = 10
const starStorySizeLimit = 250;


// to keep the register request we'll use cache with TTL
// In future implementation some database can be used
const NodeCache = require( "node-cache" );
// - perhaps change to a file storage to not lose the requests?
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
        return blockchain.getBlock(request.params.height)
        .then(function(block){
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
        
        // check story size limit
        let storyHex = new Buffer(body.star.story).toString('hex');
        if(storyHex.length > starStorySizeLimit)
            return 'the hex of star story is too large ('+storyHex.length
                    +') the limit is '+starStorySizeLimit+' characteres';
        
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