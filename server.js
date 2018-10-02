'use strict';

const Hapi = require('hapi');
const blockchain = require('./blockchain.js');
const Block = require('./block');

const server = Hapi.server({
    port: 8000,
    host: 'localhost'
});

server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => {
        
        return 'Hello, world!';
    }
});

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