## Github Actions Configuration

### Create an STS role for Github Actions

Permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "StatementForBasic",
            "Effect": "Allow",
            "Action": [
                "s3:*",
                "logs:*",
                "lambda:*",
                "cloudformation:*"
            ],
            "Resource": [
                "*"
            ]
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
            "Resource": [
                "*"
            ]
        }
    ]
}
```

Trust relationships:
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

### Add a Identity Provider

- Provider type: OpenID Connect
- Provider URL: https://token.actions.githubusercontent.com
- Audience: sts.amazonaws.com

## Create a S3 deployment bucket

We configured the deployment bucket in `serverless.yml`:
```json
  deploymentBucket:
    name: whiteheaven-deployment-bucket-${self:provider.stage}
```

We need to create 