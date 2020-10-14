#!/usr/bin/env node

const cdk = require('@aws-cdk/core');
const { MultiRegionAppsyncStack } = require('../lib/multi-region-appsync-stack');

const app = new cdk.App();
new MultiRegionAppsyncStack(app, 'MultiRegionAppsyncStack');
