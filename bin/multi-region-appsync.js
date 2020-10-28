#!/usr/bin/env node

const cdk = require("@aws-cdk/core");
const {
  MultiRegionAppsyncStack,
} = require("../lib/multi-region-appsync-stack");

// configuration for all deployments
const account = process.env.CDK_DEFAULT_ACCOUNT;
const dnsConfig = {
  hostedZoneName: "<YOUR_DOMAIN>",
  hostedZoneId: "<YOUR_HOSTED_ZONE_ID>",
  hostedDomain: "<YOUR_SUB_DOMAIN>",
};

const config = {
  mainRegion: {
    name: "DemoAPI-EU",
    region: "eu-west-1",
    props: {
      geoLocation: "EU",
      // zone ID of AWS managed API Gateway domains in eu-west-1
      // a list can be found here: https://docs.aws.amazon.com/general/latest/gr/apigateway.html
      apiGatewayHostedZoneId: "ZLY8HYME6SFDD",
    },
  },
  replicas: [
    {
      name: "DemoAPI-US",
      region: "us-east-1",
      props: {
        geoLocation: "NA",
        // zone ID of AWS managed API Gateway domains in us-east-1
        // a list can be found here: https://docs.aws.amazon.com/general/latest/gr/apigateway.html
        apiGatewayHostedZoneId: "Z1UJRXOUMOOFQ8",
      },
    },
  ],
};

// main region needs to know where to replicate to
config.mainRegion.props.replicationRegions = config.replicas.map(
  (config) => config.region
);

config.mainRegion.props.main = true;
const allRegions = [config.mainRegion, ...config.replicas];

const app = new cdk.App();
allRegions.forEach(({ name, props, region }) => {
  new MultiRegionAppsyncStack(app, name, {
    ...dnsConfig,
    ...props,
    env: { account, region },
  });
});
