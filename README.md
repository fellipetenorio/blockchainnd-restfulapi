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

# Project Title

One Paragraph of project description goes here

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

What things you need to install the software and how to install them

```
Give examples
```

### Installing

A step by step series of examples that tell you how to get a development env running

Say what the step will be

```
Give the example
```

And repeat

```
until finished
```

End with an example of getting some data out of the system or using it for a little demo

## Running the tests

Explain how to run the automated tests for this system

### Break down into end to end tests

Explain what these tests test and why

```
Give an example
```

### And coding style tests

Explain what these tests test and why

```
Give an example
```

## Deployment

Add additional notes about how to deploy this on a live system

## Built With

* [Dropwizard](http://www.dropwizard.io/1.0.2/docs/) - The web framework used
* [Maven](https://maven.apache.org/) - Dependency Management
* [ROME](https://rometools.github.io/rome/) - Used to generate RSS Feeds

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags). 

## Authors

* **Billie Thompson** - *Initial work* - [PurpleBooth](https://github.com/PurpleBooth)

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Hat tip to anyone whose code was used
* Inspiration
* etc
