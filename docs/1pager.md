## System Diagram

![Whitehaven diagram](./whitehaven_diagram.png)

## Github Actions Configuration

### Create an STS role for each environment

Permissions example:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "StatementForBasic",
      "Effect": "Allow",
      "Action": ["s3:*", "logs:*", "lambda:*", "cloudformation:*"],
      "Resource": ["*"]
    },
    {
      "Sid": "StatementForIAM",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:PutRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:DeleteRole",
        "iam:PassRole",
        "iam:TagRole",
        "iam:GetRole",
        "iam:DeleteRolePolicy"
      ],
      "Resource": ["*"]
    }
  ]
}
```

Trust relationships example:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456780000:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:sub": "repo:nkcoder/whitehaven:environment:dev",
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
```

**Notes**

- The format of `token.actions.githubusercontent.com:sub`: "repo:<owner>/<repo>:environment:<environment>"

Add a Identity Provider

- Provider type: OpenID Connect
- Provider URL: https://token.actions.githubusercontent.com
- Audience: sts.amazonaws.com

### Create `dev` and `prod` env

For each env, configure the following environment variables

- CONTRACTS_TABLE
- MEMBERS_TABLE
- SQS_ARN
- WEBHOOK_MEMBER_URL

And, configure the following environment secrets:

- AWS_STS_ROLE (the role that we configured in the above step)
- SERVERLESS_ACCESS_KEY

## Trouble shooting

### Error: The specified bucket does not exist

Error message:

```
Deploying "whitehaven" to stage "prod" (ap-southeast-2)
✖ Stack whiteheaven-stack-prod failed to deploy (3s)
✖ ServerlessError2: Could not locate deployment bucket: "whiteheaven-deployment-bucket-prod". Error: The specified bucket does not exist
    at AwsDeploy.ensureValidBucketExists (file:///home/runner/.serverless/releases/4.4.0/package/dist/sf-core.js:714:26611)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async aws:deploy:deploy:checkForChanges (file:///home/runner/.serverless/releases/4.4.0/package/dist/sf-core.js:725:4471)
...
```

We configured the deployment bucket in `serverless.yml`:

```json
  deploymentBucket:
    name: whiteheaven-deployment-bucket-${self:provider.stage}
```

If **Serverless** didn't create the bucket automatically, we might need to create it manually.
