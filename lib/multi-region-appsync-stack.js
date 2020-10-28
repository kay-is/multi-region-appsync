const apigateway = require("@aws-cdk/aws-apigatewayv2");
const appsync = require("@aws-cdk/aws-appsync");
const cdk = require("@aws-cdk/core");
const certificatemanager = require("@aws-cdk/aws-certificatemanager");
const dynamodb = require("@aws-cdk/aws-dynamodb");
const route53 = require("@aws-cdk/aws-route53");

// This stack has to be instanciated for every region
// every instance gets some region specific props
// the props are passed in bin/multi-region-appsync.js
class MultiRegionAppsyncStack extends cdk.Stack {
  constructor(scope, id, props = {}) {
    super(scope, id, props);

    const globalTable = this.createGlobalTable(props);

    const graphqlApi = this.createGraphQLApi(globalTable);

    const certificate = this.createCertificate(props);

    const httpProxy = this.createHttpProxy(props, graphqlApi, certificate);

    this.createDnsRecord(props, httpProxy.url);

    this.createStackOutputs(props, graphqlApi);
  }

  createGlobalTable(props) {
    const demoTable = "DemoTable";

    // only the main deployment needs to create a table
    if (!props.main)
      return dynamodb.Table.fromTableName(this, demoTable, demoTable);

    return new dynamodb.Table(this, demoTable, {
      tableName: demoTable,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      // replicationRegions creates a table in another region
      // they replicated everything between each other
      replicationRegions: props.replicationRegions,
    });
  }

  createGraphQLApi(table) {
    // a managed GraphQL API with API key authentication
    const api = new appsync.GraphqlApi(this, "DemoApi", {
      name: "DemoApi",
      schema: appsync.Schema.fromAsset(__dirname + "/schema.graphql"),
    });

    const dataSource = api.addDynamoDbDataSource("DemoDataSource", table);

    dataSource.createResolver({
      typeName: "Query",
      fieldName: "getDemos",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });

    dataSource.createResolver({
      typeName: "Mutation",
      fieldName: "addDemo",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition("id").auto(),
        appsync.Values.projecting("demo")
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    return api;
  }

  createCertificate(props) {
    // Using the hosted zone we created with the AWS console
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "DemoZone",
      { zoneName: props.hostedZoneName, hostedZoneId: props.hostedZoneId }
    );

    return new certificatemanager.Certificate(this, "DemoCert", {
      domainName: props.hostedDomain,
      // Certs for Route53 zones can be automatically validated via DNS
      validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
    });
  }

  createHttpProxy(props, api, certificate) {
    // AppSync needs a proxy for custom domains

    // API Gateway uses certificates to check that we own the domain
    const domainName = new apigateway.DomainName(this, "DemoDomain", {
      domainName: props.hostedDomain,
      certificate,
    });

    // API Gateway needs to know every domain used for it
    // if we define a mapping key, all routes will start with it
    const httpProxy = new apigateway.HttpApi(this, "DemoProxy", {
      defaultDomainMapping: { domainName, mappingKey: "graphql" },
    });

    const graphqlApiIntegration = new apigateway.HttpProxyIntegration({
      url: api.graphqlUrl,
    });

    // GraphQL only uses POST requests
    // routes require at least a / path
    // so the final URL will always end with "graphql/"
    httpProxy.addRoutes({
      path: "/",
      methods: [apigateway.HttpMethod.POST],
      integration: graphqlApiIntegration,
    });

    return httpProxy;
  }

  createDnsRecord(props, proxyUrl) {
    // API Gateway URL includes protocol,
    // but we only need the domain
    const dnsName = cdk.Fn.select(2, cdk.Fn.split("/", proxyUrl));

    // CDK doesn't have a construct for geolocation records
    // so we use a CFN resource
    new route53.CfnRecordSet(this, "DemoRecordSet", {
      type: "A",
      name: props.hostedDomain,
      setIdentifier: "DemoApiRecordSet-" + props.geoLocation,
      hostedZoneId: props.hostedZoneId,
      geoLocation: { continentCode: props.geoLocation },
      aliasTarget: { dnsName, hostedZoneId: props.apiGatewayHostedZoneId },
    });
  }

  createStackOutputs(props, graphqlApi) {
    // These URLs and the key are required to use the API

    new cdk.CfnOutput(this, "GlobalApiUrl", {
      exportName: "GlobalApiUrl",
      value: `https://${props.hostedDomain}/graphql/`,
      description: "The global API URL, trailing slash is required.",
    });

    new cdk.CfnOutput(this, "RegionApiUrl", {
      exportName: "RegionApiUrl",
      value: graphqlApi.graphqlUrl,
      description: "The local API URL of this deployment.",
    });

    new cdk.CfnOutput(this, "ApiKey", {
      exportName: "ApiKey",
      value: graphqlApi.apiKey,
      description: "The API key, use with x-api-key header.",
    });
  }
}

module.exports = { MultiRegionAppsyncStack };
