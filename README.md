# Multi-Region Serverless with AppSync

This is an [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html) project. 

Two instance of the stack are configured and created in `bin/multi-region-appsync.js`,
one for North-America and one for Europe.

The CDK needs to be bootstrapped for each region you want deploy to.

You need a domain managed by AWS Route53 and insert your credentials to `bin/multi-region-appsync.js`.

## Commands

- `cdk bootstrap accountId/region1 accountId/region2`
- `cdk deploy DemoAPI-EU`
- `cdk deploy DemoAPI-US`