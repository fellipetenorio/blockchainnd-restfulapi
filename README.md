Providing a RESTFUL api for my private blockchain.
This project is used only to educational purpose and do not have any intend to run in production environment.
Node.js Framework selected: hapijs

There is two endpoints:
GET /block/{heigth} retrieves the block indicated by the heigth in URL
POST /block insert a block in the blockchain. The request should both be in JSON and have the body attribute.
Example of body to the POST:
{
      "body": "My new Block"
}

The body can be of any type that can be stringyfied
