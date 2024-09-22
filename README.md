This project includes a AWS Lambda function, which consumes messages from AWS SQS, gets data from AWS DynamoDB, then notifies remote systems by calling webhook APIs.

The project is deployed to AWS using the [Serverless Framework](https://www.serverless.com/), and pipelined using Github Actions.

## System Components

- AWS Lambda function
- AWS SQS
- AWS DynamoDB
- Serverless Framework
- Github Actions
- [purify-ts](https://gigobyte.github.io/purify/): a small functional programming library for TypeScript
- [vitest](https://vitest.dev/): unit testing
- [zod](https://zod.dev/): schema validation
- [ky](https://github.com/sindresorhus/ky): delightful HTTP requests

## 1Pager

[1Pager](./docs/1pager.md)
