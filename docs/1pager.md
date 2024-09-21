## STS role for Github Actions

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
                "Federated": "arn:aws:iam::360683066129:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:sub": "repo:viva-leisure/keepme-integration:environment:dev",
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                }
            }
        }
    ]
}
```