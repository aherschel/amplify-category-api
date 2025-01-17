import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DeploymentResources, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { BelongsToTransformer, HasManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import { DDB_DB_TYPE, MYSQL_DB_TYPE, constructDataSourceMap, isDynamoDbType } from '@aws-amplify/graphql-transformer-core';
import {
  DynamoDBProvisionStrategy,
  ModelDataSourceStrategyDbType,
  SQLLambdaModelProvisionStrategy,
} from '@aws-amplify/graphql-transformer-interfaces';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { RefersToTransformer } from '../../graphql-refers-to-transformer';
import { MapsToTransformer } from '../../graphql-maps-to-transformer';
import { expectedResolversForModelWithRenamedField, testRelationalFieldMapping, testTableNameMapping } from './common';

const mappedHasMany = /* GraphQL */ `
  type Employee @model @mapsTo(name: "Person") {
    id: ID!
    tasks: [Task] @hasMany
  }

  type Task @model {
    id: ID!
    title: String
  }
`;

const refersToHasMany = /* GraphQL */ `
  type Employee @model @refersTo(name: "Person") {
    id: ID! @primaryKey
    tasks: [Task] @hasMany(references: ["employeeId"])
  }

  type Task @model @refersTo(name: "Todo") {
    id: ID! @primaryKey
    title: String
    employeeId: String!
    employee: Employee @belongsTo(references: ["employeeId"])
  }
`;

const transformSchema = (
  schema: string,
  dbType: ModelDataSourceStrategyDbType,
): DeploymentResources & {
  logs: any[];
} => {
  const modelToDatasourceMap = constructDataSourceMap(schema, {
    dbType,
    provisionDB: isDynamoDbType(dbType),
    provisionStrategy: isDynamoDbType(dbType) ? DynamoDBProvisionStrategy.DEFAULT : SQLLambdaModelProvisionStrategy.DEFAULT,
  });
  return testTransform({
    schema,
    transformers: [
      new ModelTransformer(),
      new HasManyTransformer(),
      new BelongsToTransformer(),
      new PrimaryKeyTransformer(),
      new MapsToTransformer(),
      new RefersToTransformer(),
    ],
    modelToDatasourceMap,
    transformParameters: {
      sandboxModeEnabled: true,
    },
  });
};

describe('@mapsTo with @hasMany', () => {
  it('adds CRUD input and output mappings on related type and maps related type in hasMany field resolver', () => {
    const out = transformSchema(mappedHasMany, DDB_DB_TYPE);
    const expectedResolvers: string[] = expectedResolversForModelWithRenamedField('Task').concat('Employee.tasks.postDataLoad.1.res.vtl');
    expectedResolvers.forEach((resolver) => {
      expect(out.resolvers[resolver]).toMatchSnapshot();
    });
  });
});

describe('@refersTo with @hasMany for RDS Models', () => {
  it('model table names are mapped', () => {
    const out = transformSchema(refersToHasMany, MYSQL_DB_TYPE);
    testTableNameMapping('Employee', 'Person', out);
    testTableNameMapping('Task', 'Todo', out);
    testRelationalFieldMapping('Employee.tasks.req.vtl', 'Todo', out);
    testRelationalFieldMapping('Task.employee.req.vtl', 'Person', out);
  });
});
