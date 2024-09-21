This project includes a AWS Lambda function, which consumes messages from AWS SQS, get data from AWS DynamoDB, then notify remote systems by calling a webhook API.

The project is deployed to AWS using the [Serverless Framework](https://www.serverless.com/), and pipelined using Github Actions.

## System Components

- AWS Lambda function
- AWS SQS
- AWS DynamoDB
- Serverless Framework
- Github Actions