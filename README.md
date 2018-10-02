Providing a RESTFUL api for my private blockchain.
This project is used only to educational purpose and do not have any intend to run in production environment.
Node.js Framework selected: hapijs

This node project runs in the port 8000.
You can change this by modifing the file server.js.
To run this project go to terminal, change to the project folder and type:
node server.js

There is two endpoints:
GET /block/{heigth} retrieves the block indicated by the heigth in URL.
There is one block by default (the genesis block) in the blockchain.
You can get it by the URL: http://localhost:8000/block/0

POST /block insert a block in the blockchain. The request should both be in JSON and have the body attribute.
Example of body to the POST:
{
      "body": "My new Block"
}

The body can be of any type that can be stringyfied.
Notice that there is no consensus algorithm and you can add a lot of the same block.
Use by yourself and by your own risk.

Access any other end point (e.g. /blocks) will generate a JSON with 404 information:
{"statusCode":404,"error":"Not Found","message":"Not Found"}
