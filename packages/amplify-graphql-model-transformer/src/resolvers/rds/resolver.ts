import path from 'path';
import { CfnMapping, Duration, Fn } from 'aws-cdk-lib';
import {
  Expression,
  compoundExpression,
  ifElse,
  iff,
  list,
  methodCall,
  not,
  obj,
  printBlock,
  qref,
  ref,
  set,
  str,
  toJson,
} from 'graphql-mapping-template';
import { ResourceConstants, isArrayOrObject, isListType } from 'graphql-transformer-common';
import { RDSConnectionSecrets, setResourceName } from '@aws-amplify/graphql-transformer-core';
import {
  GraphQLAPIProvider,
  RDSLayerMapping,
  SubnetAvailabilityZone,
  TransformerContextProvider,
  VpcConfig,
  ProvisionedConcurrencyConfig,
} from '@aws-amplify/graphql-transformer-interfaces';
import { Effect, IRole, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IFunction, LayerVersion, Runtime, Alias, Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { EnumTypeDefinitionNode, FieldDefinitionNode, Kind, ObjectTypeDefinitionNode } from 'graphql';
import { CfnVPCEndpoint } from 'aws-cdk-lib/aws-ec2';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';

/**
 * Define RDS Lambda operations
 */
export type OPERATIONS = 'CREATE' | 'UPDATE' | 'DELETE' | 'GET' | 'LIST' | 'SYNC';

const OPERATION_KEY = '__operation';

/**
 * Define RDS Lambda Layer region mappings. The optional `mapping` can be specified in place of the defaults that are hardcoded at the time
 * this package is published. For the CLI flow, the `mapping` will be downloaded at runtime during the `amplify push` flow. For the CDK,
 * the layer version will be resolved by a custom CDK resource.
 * @param scope Construct
 * @param mapping an RDSLayerMapping to use in place of the defaults
 */
export const setRDSLayerMappings = (scope: Construct, mapping: RDSLayerMapping): CfnMapping =>
  new CfnMapping(scope, ResourceConstants.RESOURCES.SQLLayerMappingID, {
    mapping,
  });

/**
 * Create RDS Lambda function
 * @param scope Construct
 * @param apiGraphql GraphQLAPIProvider
 * @param lambdaRole IRole
 */
export const createRdsLambda = (
  scope: Construct,
  apiGraphql: GraphQLAPIProvider,
  lambdaRole: IRole,
  layerVersionArn: string,
  environment?: { [key: string]: string },
  sqlLambdaVpcConfig?: VpcConfig,
  sqlLambdaProvisionedConcurrencyConfig?: ProvisionedConcurrencyConfig,
): IFunction => {
  const { SQLLambdaLogicalID, SQLLambdaAliasLogicalID, SQLLambdaLayerVersionLogicalID } = ResourceConstants.RESOURCES;

  let ssmEndpoint = Fn.join('', ['ssm.', Fn.ref('AWS::Region'), '.amazonaws.com']); // Default SSM endpoint
  if (sqlLambdaVpcConfig) {
    const endpoints = addVpcEndpointForSecretsManager(scope, sqlLambdaVpcConfig);
    const ssmEndpointEntries = endpoints.find((endpoint) => endpoint.service === 'ssm')?.endpoint.attrDnsEntries;
    if (ssmEndpointEntries) {
      ssmEndpoint = Fn.select(0, ssmEndpointEntries);
    }
  }

  const fn = apiGraphql.host.addLambdaFunction(
    SQLLambdaLogicalID,
    `functions/${SQLLambdaLogicalID}.zip`,
    'handler.run',
    path.resolve(__dirname, '..', '..', '..', 'lib', 'rds-lambda.zip'),
    Runtime.NODEJS_18_X,
    [LayerVersion.fromLayerVersionArn(scope, SQLLambdaLayerVersionLogicalID, layerVersionArn)],
    lambdaRole,
    {
      ...environment,
      SSM_ENDPOINT: ssmEndpoint,
    },
    Duration.seconds(30),
    scope,
    sqlLambdaVpcConfig,
  );

  if (sqlLambdaProvisionedConcurrencyConfig) {
    const { provisionedConcurrentExecutions } = sqlLambdaProvisionedConcurrencyConfig;

    const alias = new Alias(scope, SQLLambdaAliasLogicalID, {
      aliasName: `${SQLLambdaLogicalID}Alias`,
      version: (fn as LambdaFunction).currentVersion,
      provisionedConcurrentExecutions,
    });
    setResourceName(alias, { name: 'SQLLambdaFunctionAlias', setOnDefaultChild: true });
    return alias;
  }

  return fn;
};

export const createLayerVersionCustomResource = (scope: Construct): AwsCustomResource => {
  const {
    SQLLayerVersionCustomResourceID,
    SQLLayerVersionManifestBucket,
    SQLLayerVersionManifestBucketRegion,
    SQLLayerVersionManifestKeyPrefix,
  } = ResourceConstants.RESOURCES;

  const key = Fn.join('', [SQLLayerVersionManifestKeyPrefix, Fn.ref('AWS::Region')]);

  const manifestArn = `arn:aws:s3:::${SQLLayerVersionManifestBucket}/${key}`;

  const customResource = new AwsCustomResource(scope, SQLLayerVersionCustomResourceID, {
    resourceType: `Custom::${SQLLayerVersionCustomResourceID}`,
    onUpdate: {
      service: 'S3',
      action: 'getObject',
      region: SQLLayerVersionManifestBucketRegion,
      parameters: {
        Bucket: SQLLayerVersionManifestBucket,
        Key: key,
      },
      // Make the physical ID change each time we do a deployment, so we always check for the latest version. This means we will never have
      // a strictly no-op deployment, but the SQL Lambda configuration won't change unless the actual layer value changes
      physicalResourceId: PhysicalResourceId.of(`${SQLLayerVersionCustomResourceID}-${Date.now().toString()}`),
    },
    policy: AwsCustomResourcePolicy.fromSdkCalls({
      resources: [manifestArn],
    }),
  });

  setResourceName(customResource, { name: SQLLayerVersionCustomResourceID, setOnDefaultChild: true });
  return customResource;
};

const addVpcEndpoint = (scope: Construct, sqlLambdaVpcConfig: VpcConfig, serviceSuffix: string): CfnVPCEndpoint => {
  const serviceEndpointPrefix = 'com.amazonaws';
  const endpoint = new CfnVPCEndpoint(scope, `${ResourceConstants.RESOURCES.SQLVpcEndpointLogicalIDPrefix}${serviceSuffix}`, {
    serviceName: Fn.join('', [serviceEndpointPrefix, '.', Fn.ref('AWS::Region'), '.', serviceSuffix]), // Sample: com.amazonaws.us-east-1.ssmmessages
    vpcEndpointType: 'Interface',
    vpcId: sqlLambdaVpcConfig.vpcId,
    subnetIds: extractSubnetForVpcEndpoint(sqlLambdaVpcConfig.subnetAvailabilityZoneConfig),
    securityGroupIds: sqlLambdaVpcConfig.securityGroupIds,
    privateDnsEnabled: false,
  });
  setResourceName(endpoint, { name: endpoint.logicalId, setOnDefaultChild: true });

  return endpoint;
};

const addVpcEndpointForSecretsManager = (
  scope: Construct,
  sqlLambdaVpcConfig: VpcConfig,
): { service: string; endpoint: CfnVPCEndpoint }[] => {
  const services = ['ssm', 'ssmmessages', 'ec2', 'ec2messages', 'kms'];
  return services.map((service) => {
    return {
      service,
      endpoint: addVpcEndpoint(scope, sqlLambdaVpcConfig, service),
    };
  });
};

/**
 * Extract subnet ids for VPC endpoint - We only need one subnet per AZ.
 * This is mandatory requirement for creating VPC endpoint.
 * CDK Deployment will fail if you provide more than one subnet per AZ.
 * @param avaliabilityZoneMappings SubnetAvailabilityZone[]
 * @returns string[]
 */
const extractSubnetForVpcEndpoint = (avaliabilityZoneMappings: SubnetAvailabilityZone[]): string[] => {
  const avaliabilityZones = [] as string[];
  const result = [];
  for (const subnet of avaliabilityZoneMappings) {
    if (!avaliabilityZones.includes(subnet.availabilityZone)) {
      avaliabilityZones.push(subnet.availabilityZone);
      result.push(subnet.subnetId);
    }
  }
  return result;
};

/**
 * Create RDS Patching Lambda function
 * @param scope Construct
 * @param apiGraphql GraphQLAPIProvider
 * @param lambdaRole IRole
 */
export const createRdsPatchingLambda = (
  scope: Construct,
  apiGraphql: GraphQLAPIProvider,
  lambdaRole: IRole,
  environment?: { [key: string]: string },
  sqlLambdaVpcConfig?: VpcConfig,
): IFunction => {
  const { SQLPatchingLambdaLogicalID } = ResourceConstants.RESOURCES;
  return apiGraphql.host.addLambdaFunction(
    SQLPatchingLambdaLogicalID,
    `functions/${SQLPatchingLambdaLogicalID}.zip`,
    'index.handler',
    path.resolve(__dirname, '..', '..', '..', 'lib', 'rds-patching-lambda.zip'),
    Runtime.NODEJS_18_X,
    [],
    lambdaRole,
    environment,
    Duration.minutes(6), // We have an arbituary wait time of up to 5 minutes in the lambda function to avoid throttling errors
    scope,
    sqlLambdaVpcConfig,
  );
};

/**
 * Create RDS Lambda IAM role
 * @param roleName string
 * @param scope Construct
 * @param secretEntry RDSConnectionSecrets
 */
export const createRdsLambdaRole = (roleName: string, scope: Construct, secretEntry: RDSConnectionSecrets): IRole => {
  const { SQLLambdaIAMRoleLogicalID, SQLLambdaLogAccessPolicy } = ResourceConstants.RESOURCES;
  const role = new Role(scope, SQLLambdaIAMRoleLogicalID, {
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    roleName,
  });
  setResourceName(role, { name: SQLLambdaIAMRoleLogicalID, setOnDefaultChild: true });
  const policyStatements = [
    new PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      effect: Effect.ALLOW,
      resources: ['arn:aws:logs:*:*:*'],
    }),
  ];
  if (secretEntry) {
    policyStatements.push(
      new PolicyStatement({
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        effect: Effect.ALLOW,
        resources: [
          `arn:aws:ssm:*:*:parameter${secretEntry.username}`,
          `arn:aws:ssm:*:*:parameter${secretEntry.password}`,
          `arn:aws:ssm:*:*:parameter${secretEntry.host}`,
          `arn:aws:ssm:*:*:parameter${secretEntry.database}`,
          `arn:aws:ssm:*:*:parameter${secretEntry.port}`,
        ],
      }),
    );
  }

  role.attachInlinePolicy(
    new Policy(scope, SQLLambdaLogAccessPolicy, {
      statements: policyStatements,
      policyName: `${roleName}Policy`,
    }),
  );

  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['ec2:CreateNetworkInterface', 'ec2:DescribeNetworkInterfaces', 'ec2:DeleteNetworkInterface'],
    }),
  );

  return role;
};

/**
 * Create RDS Patching Lambda IAM role
 * @param roleName string
 * @param scope Construct
 * @param functionArn FunctionArn
 */
export const createRdsPatchingLambdaRole = (roleName: string, scope: Construct, functionArn: string): IRole => {
  const { SQLPatchingLambdaIAMRoleLogicalID, SQLPatchingLambdaLogAccessPolicy } = ResourceConstants.RESOURCES;
  const role = new Role(scope, SQLPatchingLambdaIAMRoleLogicalID, {
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    roleName,
  });
  setResourceName(role, { name: SQLPatchingLambdaIAMRoleLogicalID, setOnDefaultChild: true });
  const policyStatements = [
    new PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      effect: Effect.ALLOW,
      resources: ['arn:aws:logs:*:*:*'],
    }),
    new PolicyStatement({
      actions: ['lambda:UpdateFunctionConfiguration'],
      effect: Effect.ALLOW,
      resources: [functionArn],
    }),
    new PolicyStatement({
      actions: ['lambda:GetLayerVersion', 'lambda:GetLayerVersionPolicy'],
      effect: Effect.ALLOW,
      resources: ['*'],
    }),
  ];

  role.attachInlinePolicy(
    new Policy(scope, SQLPatchingLambdaLogAccessPolicy, {
      statements: policyStatements,
      policyName: `${roleName}Policy`,
    }),
  );

  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['ec2:CreateNetworkInterface', 'ec2:DescribeNetworkInterfaces', 'ec2:DeleteNetworkInterface'],
    }),
  );

  return role;
};

/**
 * Generate RDS Lambda request template
 * @param tableName string
 * @param operation string
 * @param operationName string
 */
export const generateLambdaRequestTemplate = (
  tableName: string,
  operation: string,
  operationName: string,
  ctx: TransformerContextProvider,
): string => {
  const mappedTableName = ctx.resourceHelper.getModelNameMapping(tableName);
  return printBlock('Invoke RDS Lambda data source')(
    compoundExpression([
      set(ref('lambdaInput'), obj({})),
      set(ref('lambdaInput.args'), obj({})),
      set(ref('lambdaInput.table'), str(mappedTableName)),
      set(ref('lambdaInput.operation'), str(operation)),
      set(ref('lambdaInput.operationName'), str(operationName)),
      set(ref('lambdaInput.args.metadata'), obj({})),
      set(ref('lambdaInput.args.metadata.keys'), list([])),
      constructAuthFilterStatement('lambdaInput.args.metadata.authFilter'),
      constructNonScalarFieldsStatement(tableName, ctx),
      constructArrayFieldsStatement(tableName, ctx),
      constructFieldMappingInput(),
      qref(
        methodCall(ref('lambdaInput.args.metadata.keys.addAll'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.keys'), list([]))),
      ),
      set(ref('lambdaInput.args.input'), methodCall(ref('util.defaultIfNull'), ref('ctx.stash.defaultValues'), obj({}))),
      qref(methodCall(ref('lambdaInput.args.input.putAll'), methodCall(ref('util.defaultIfNull'), ref('context.arguments'), obj({})))),
      obj({
        version: str('2018-05-29'),
        operation: str('Invoke'),
        payload: methodCall(ref('util.toJson'), ref('lambdaInput')),
      }),
    ]),
  );
};

/**
 * Generate RDS Lambda response template
 * @param isSyncEnabled boolean
 */
export const generateGetLambdaResponseTemplate = (isSyncEnabled: boolean): string => {
  const statements: Expression[] = [];
  if (isSyncEnabled) {
    statements.push(
      ifElse(
        ref('ctx.error'),
        methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type'), ref('ctx.result')),
        toJson(ref('ctx.result')),
      ),
    );
  } else {
    statements.push(
      ifElse(ref('ctx.error'), methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type')), toJson(ref('ctx.result'))),
    );
  }

  return printBlock('ResponseTemplate')(compoundExpression(statements));
};

/**
 * Generate common response template used by most of the resolvers.
 * Append operation if response is coming from a mutation, this is to protect field resolver for subscriptions
 * @param isSyncEnabled boolean
 * @param mutation boolean
 */
export const generateDefaultLambdaResponseMappingTemplate = (isSyncEnabled: boolean, mutation = false): string => {
  const statements: Expression[] = [];
  if (mutation) statements.push(qref(methodCall(ref('ctx.result.put'), str(OPERATION_KEY), str('Mutation'))));
  if (isSyncEnabled) {
    statements.push(
      ifElse(
        ref('ctx.error'),
        methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type'), ref('ctx.result')),
        toJson(ref('ctx.result')),
      ),
    );
  } else {
    statements.push(
      ifElse(ref('ctx.error'), methodCall(ref('util.error'), ref('ctx.error.message'), ref('ctx.error.type')), toJson(ref('ctx.result'))),
    );
  }

  return printBlock('ResponseTemplate')(compoundExpression(statements));
};

export const getNonScalarFields = (object: ObjectTypeDefinitionNode | undefined, ctx: TransformerContextProvider): string[] => {
  if (!object) {
    return [];
  }
  const enums = ctx.output.getTypeDefinitionsOfKind(Kind.ENUM_TYPE_DEFINITION) as EnumTypeDefinitionNode[];
  return object.fields?.filter((f: FieldDefinitionNode) => isArrayOrObject(f.type, enums)).map((f) => f.name.value) || [];
};

export const getArrayFields = (object: ObjectTypeDefinitionNode | undefined, ctx: TransformerContextProvider): string[] => {
  if (!object) {
    return [];
  }
  return object.fields?.filter((f: FieldDefinitionNode) => isListType(f.type)).map((f) => f.name.value) || [];
};

export const constructNonScalarFieldsStatement = (tableName: string, ctx: TransformerContextProvider): Expression =>
  set(ref('lambdaInput.args.metadata.nonScalarFields'), list(getNonScalarFields(ctx.output.getObject(tableName), ctx).map(str)));

export const constructArrayFieldsStatement = (tableName: string, ctx: TransformerContextProvider): Expression =>
  set(ref('lambdaInput.args.metadata.arrayFields'), list(getArrayFields(ctx.output.getObject(tableName), ctx).map(str)));

export const constructFieldMappingInput = (): Expression => {
  return compoundExpression([
    set(ref('lambdaInput.args.metadata.fieldMap'), obj({})),
    qref(
      methodCall(
        ref('lambdaInput.args.metadata.fieldMap.putAll'),
        methodCall(ref('util.defaultIfNull'), ref('context.stash.fieldMap'), obj({})),
      ),
    ),
  ]);
};

export const constructAuthFilterStatement = (keyName: string): Expression =>
  iff(not(methodCall(ref('util.isNullOrEmpty'), ref('ctx.stash.authFilter'))), set(ref(keyName), ref('ctx.stash.authFilter')));
