// This dependency cycle should go away once we refactor the internals to use ModelDataSourceStrategy instead of DataSourceType
import { DataSourceType } from '../transformer-context/transformer-datasource-provider';

// #########################################################################################################################################
// If you change types in this file (the internal implementation), be sure to make corresponding necessary changes to
// amplify-graphql-api-construct/src/model-datasource-strategy.ts (the customer-facing interface) and the adapter functions in this file.
// #########################################################################################################################################

/**
 * All known ModelDataSourceStrategies. Concrete strategies vary widely in their requirements and implementations.
 */
export type ModelDataSourceStrategy =
  | DefaultDynamoDbModelDataSourceStrategy
  | AmplifyDynamoDbModelDataSourceStrategy
  | SQLLambdaModelDataSourceStrategy;

export interface ModelDataSourceStrategyBase {
  dbType: ModelDataSourceStrategyDbType;
}

/**
 * All supported database types that can be used to resolve models.
 */
export type ModelDataSourceStrategyDbType = 'DYNAMODB' | ModelDataSourceStrategySqlDbType;

/**
 * All supported SQL database types that can be used to resolve models.
 */
export type ModelDataSourceStrategySqlDbType = 'MYSQL' | 'POSTGRES';

/**
 * Use default CloudFormation type 'AWS::DynamoDB::Table' to provision table.
 */
export interface DefaultDynamoDbModelDataSourceStrategy extends ModelDataSourceStrategyBase {
  readonly dbType: 'DYNAMODB';
  readonly provisionStrategy: 'DEFAULT';
}

/**
 * Use custom resource type 'Custom::AmplifyDynamoDBTable' to provision table.
 */
export interface AmplifyDynamoDbModelDataSourceStrategy extends ModelDataSourceStrategyBase {
  readonly dbType: 'DYNAMODB';
  readonly provisionStrategy: 'AMPLIFY_TABLE';
}

/**
 * A strategy that creates a Lambda to connect to a pre-existing SQL table to resolve model data.
 *
 */
export interface SQLLambdaModelDataSourceStrategy extends ModelDataSourceStrategyBase {
  /**
   * The name of the strategy. This will be used to name the AppSync DataSource itself, plus any associated resources like resolver Lambdas.
   * This name must be unique across all schema definitions in a GraphQL API.
   */
  readonly name: string;

  /**
   * The type of the SQL database used to process model operations for this definition.
   */
  readonly dbType: ModelDataSourceStrategySqlDbType;

  /**
   * The parameters the Lambda data source will use to connect to the database.
   */
  readonly dbConnectionConfig: SqlModelDataSourceDbConnectionConfig;

  /**
   * The configuration of the VPC into which to install the Lambda.
   */
  readonly vpcConfiguration?: VpcConfig;

  /**
   * Custom SQL statements. The key is the value of the `references` attribute of the `@sql` directive in the `schema`; the value is the SQL
   * to be executed.
   */
  readonly customSqlStatements?: Record<string, string>;

  /**
   * The configuration for the provisioned concurrency of the Lambda.
   */
  readonly sqlLambdaProvisionedConcurrencyConfig?: ProvisionedConcurrencyConfig;
}

/**
 * Configuration of the VPC in which to install a Lambda to resolve queries against a SQL-based data source. The SQL Lambda will be deployed
 * into the specified VPC, subnets, and security groups. The specified subnets and security groups must be in the same VPC. The VPC must
 * have at least one subnet. The construct will also create VPC service endpoints in the specified subnets, as well as inbound security
 * rules, to allow traffic on port 443 within each security group. This allows the Lambda to read database connection information from
 * Secure Systems Manager.
 */
export interface VpcConfig {
  /** The VPC to install the Lambda data source in. */
  readonly vpcId: string;

  /** The security groups to install the Lambda data source in. */
  readonly securityGroupIds: string[];

  /** The subnets to install the Lambda data source in, one per availability zone. */
  readonly subnetAvailabilityZoneConfig: SubnetAvailabilityZone[];
}

/**
 * The configuration for the provisioned concurrency of the Lambda.
 */
export interface ProvisionedConcurrencyConfig {
  /** The amount of provisioned concurrency to allocate. **/
  readonly provisionedConcurrentExecutions: number;
}

/**
 * Subnet configuration for VPC endpoints used by a Lambda resolver for a SQL-based data source. Although it is possible to create multiple
 * subnets in a single availability zone, VPC service endpoints may only be deployed to a single subnet in a given availability zone. This
 * structure ensures that the Lambda function and VPC service endpoints are mutually consistent.
 */
export interface SubnetAvailabilityZone {
  /** The subnet ID to install the Lambda data source in. */
  readonly subnetId: string;

  /** The availability zone of the subnet. */
  readonly availabilityZone: string;
}

/**
 * The Secure Systems Manager parameter paths the Lambda data source will use to connect to the database.
 *
 * These parameters are retrieved from Secure Systems Manager in the same region as the Lambda.
 */
export interface SqlModelDataSourceDbConnectionConfig {
  /** The Secure Systems Manager parameter containing the hostname of the database. For RDS-based SQL data sources, this can be the hostname
   * of a database proxy, cluster, or instance.
   */
  readonly hostnameSsmPath: string;

  /** The Secure Systems Manager parameter containing the port number of the database proxy, cluster, or instance. */
  readonly portSsmPath: string;

  /** The Secure Systems Manager parameter containing the username to use when connecting to the database. */
  readonly usernameSsmPath: string;

  /** The Secure Systems Manager parameter containing the password to use when connecting to the database. */
  readonly passwordSsmPath: string;

  /** The Secure Systems Manager parameter containing the database name. */
  readonly databaseNameSsmPath: string;
}

export interface CustomSqlDataSourceStrategy {
  readonly typeName: 'Query' | 'Mutation';
  readonly fieldName: string;
  // TODO: Replace this when we support heterogeneous SQL data sources in a single API
  readonly dataSourceType: DataSourceType;
}

export interface DataSourceStrategiesProvider {
  /** Maps GraphQL model names to the ModelDataSourceStrategy used to resolve it. The key of the record is the GraphQL type name. */
  // TODO: Add this back during combine feature
  // dataSourceStrategies: Record<string, ModelDataSourceStrategy>;

  // TODO: Remove this when we refactor the internals to use ModelDataSourceStrategy instead of DataSourceType
  modelToDatasourceMap: Map<string, DataSourceType>;

  /** Maps custom Query and Mutation fields to the ModelDataSourceStrategy used to resolve them. */
  customSqlDataSourceStrategies?: CustomSqlDataSourceStrategy[];
}

/**
 * Maps a given AWS region to the SQL Lambda layer version ARN for that region. TODO: Rename to SQLLambdaLayerMapping
 */
export interface RDSLayerMapping {
  readonly [key: string]: {
    layerRegion: string;
  };
}
