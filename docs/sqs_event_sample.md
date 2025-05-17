## Raw message that the lambda received

```json
{
  "Records": [
    {
      "messageId": "8d096ab8-a949-4b06-bb9f-532435695df6",
      "receiptHandle": "AQEBZqRypiBqkHpb16V0BhscwJjfji/PYaE9L4gW9Mdx2RP7IlVaEDHhl8832EBvCeI3eJT+wRCWpb2IwkIoW24D0dNgcoHDFhTJ6j0MXoyv1pNwvMauH5BRJeb2wAcgrkwD25G3IBibxC9oNJgFCDw1iE7C7p+6x/LWA+Zp1Sf4nQWGFL+8WpzSoM2PvJoYSlUbaKTXCMXRMDvg842uvRNiGcIRhPx1ruLOuUiFmQVb/7sauB+3BQ8T3r8iIjoiZWsqNKpEUZwr+Jsp0KPBOFOUD4YeMQ1JdCjdpZlCI5Llw/Joe/IVpHyGqcHv0XLpQNBa",
      "body": "{\n  \"Type\" : \"Notification\",\n  \"MessageId\" : \"8ad28c76-a0d3-552c-85bd-d3efafe87a80\",\n  \"SequenceNumber\" : \"10000000000000761000\",\n  \"TopicArn\" : \"arn:aws:sns:ap-southeast-2:123456789000:hub_members_change_sns.fifo\",\n  \"Subject\" : \"SUSPENSION_CREATED\",\n  \"Message\" : \"{\\\"memberId\\\":\\\"6f3cb92b-fb50-4dab-81b4-96b84c1659de\\\",\\\"contractId\\\":\\\"af8a4082-45be-4d6c-9ab4-83e5225f27d0\\\",\\\"eventType\\\":\\\"SUSPENSION_CREATED\\\"}\",\n  \"Timestamp\" : \"2024-10-28T04:03:07.873Z\",\n  \"UnsubscribeURL\" : \"https://sns.ap-southeast-2.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:ap-southeast-2:123456789000:hub_members_change_sns.fifo:39ad5e55-8ea1-45a0-8f85-3e43ade95b6b\"\n}",
      "attributes": {
        "ApproximateReceiveCount": "1",
        "AWSTraceHeader": "Root=1-671f0cf7-3776b2636ca88c57146b03a9;Parent=6a3c53b9bad6367e;Sampled=0;Lineage=2:41d054fa:0",
        "SentTimestamp": "1730088187901",
        "SequenceNumber": "37336390723521759232",
        "MessageGroupId": "6f3cb92b-fb50-4dab-81b4-96b84c1659de",
        "SenderId": "AIDA4B3L5DHZGA5FAHUSD",
        "MessageDeduplicationId": "b217e47e5cba27e740bd9a0c814ef1c322447ea281dbcd1cb4231dfabff63528",
        "ApproximateFirstReceiveTimestamp": "1730088187901"
      },
      "messageAttributes": {},
      "md5OfBody": "8a444cecab3936300e1010389b3b6f3c",
      "eventSource": "aws:sqs",
      "eventSourceARN": "arn:aws:sqs:ap-southeast-2:123456789000:member_update_queue.fifo",
      "awsRegion": "ap-southeast-2"
    }
  ]
}
```

## SNS message body for manual/scheduled trigger

```json
{
  "memberId": "f70ce841-d654-449b-ac66-7da4d2305d70",
  "eventType": "MEMBER_JOINED"
}
```

## SQS message for manual/scheduled trigger

```json
{
  "Message": "{\"memberId\": \"f70ce841-d654-449b-ac66-7da4d2305d70\", \"eventType\": \"MEMBER_JOINED\"}"
}
```
