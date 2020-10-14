const { expect, matchTemplate, MatchStyle } = require('@aws-cdk/assert');
const cdk = require('@aws-cdk/core');
const MultiRegionAppsync = require('../lib/multi-region-appsync-stack');

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new MultiRegionAppsync.MultiRegionAppsyncStack(app, 'MyTestStack');
    // THEN
    expect(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
