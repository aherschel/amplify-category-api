import { validateModelSchema } from '@aws-amplify/graphql-transformer-core';
import { parse } from 'graphql';
import { TestTransformParameters, testTransform } from '@aws-amplify/graphql-transformer-test-utils';
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { SQLLambdaModelProvisionStrategy } from '@aws-amplify/graphql-transformer-interfaces';
import { SqlTransformer } from '../graphql-sql-transformer';

describe('sql directive tests', () => {
  it('should compile happy case with statement argument', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip")
      }
    `;

    const out = testTransform({
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MYSQL',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        }),
      ),
      customSqlDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          dataSourceType: {
            dbType: 'MYSQL',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        },
      ],
    });
    expect(out).toBeDefined();
    expect(out.schema).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();

    const parsed = parse(definition);
    validateModelSchema(parsed);

    expect(out.resolvers).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.req.vtl']).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.res.vtl']).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.calculateTaxRate.res.vtl']).toMatchSnapshot();
  });

  it('should compile happy case with reference argument', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(reference: "calculate-tax")
      }
    `;

    const customQueries = new Map<string, string>();
    customQueries.set('calculate-tax', 'SELECT * FROM TAXRATE WHERE ZIP = :zip');

    const out = testTransform({
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      customQueries,
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MYSQL',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        }),
      ),
      customSqlDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          dataSourceType: {
            dbType: 'MYSQL',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        },
      ],
    });
    expect(out).toBeDefined();
    expect(out.schema).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();

    const parsed = parse(definition);
    validateModelSchema(parsed);

    expect(out.resolvers).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.req.vtl']).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.res.vtl']).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.calculateTaxRate.res.vtl']).toMatchSnapshot();
  });

  it('should throw error if incorrect reference argument', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(reference: "calculate-tax")
      }
    `;

    const customQueries = new Map<string, string>();
    customQueries.set('calculate-tax-rate', 'SELECT * FROM TAXRATE WHERE ZIP = :zip');

    const transformConfig: TestTransformParameters = {
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      customQueries,
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MYSQL' as const,
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        }),
      ),
      customSqlDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          dataSourceType: {
            dbType: 'MYSQL',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        },
      ],
    };

    expect(() => testTransform(transformConfig)).toThrowError(
      '@sql directive \'reference\' argument must be a valid custom query name. Check type "Query" and field "calculateTaxRate". The custom query "calculate-tax" does not exist in "sql-statements" directory.',
    );
  });

  it('should throw error if both statement and argument provided', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip", reference: "calculate-tax")
      }
    `;

    const customQueries = new Map<string, string>();
    customQueries.set('calculate-tax', 'SELECT * FROM TAXRATE WHERE ZIP = :zip');

    const transformConfig: TestTransformParameters = {
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      customQueries,
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MYSQL' as const,
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        }),
      ),
      customSqlDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          dataSourceType: {
            dbType: 'MYSQL',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        },
      ],
    };

    expect(() => testTransform(transformConfig)).toThrowError(
      '@sql directive can have either \'statement\' or \'reference\' argument but not both. Check type "Query" and field "calculateTaxRate".',
    );
  });

  it('should throw error if statement is empty', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(statement: "")
      }
    `;

    const transformConfig: TestTransformParameters = {
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MYSQL' as const,
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        }),
      ),
      customSqlDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          dataSourceType: {
            dbType: 'MYSQL',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        },
      ],
    };

    expect(() => testTransform(transformConfig)).toThrowError(
      '@sql directive \'statement\' argument must not be empty. Check type "Query" and field "calculateTaxRate".',
    );
  });

  it('throws an error if invoked with the wrong type', () => {
    const doc = /* GraphQL */ `
      type Todo {
        calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip")
      }
    `;

    const transformConfig: TestTransformParameters = {
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      modelToDatasourceMap: new Map(
        Object.entries({
          Post: {
            dbType: 'MYSQL',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        }),
      ),
      customSqlDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          dataSourceType: {
            dbType: 'MYSQL',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        },
      ],
    };
    expect(() => testTransform(transformConfig)).toThrowError(
      '@sql directive can only be used on Query or Mutation types. Check type "Todo" and field "calculateTaxRate".',
    );
  });

  it('successfully processes a schema with only custom SQL', () => {
    const doc = /* GraphQL */ `
      type Query {
        calculateTaxRate(zip: String): Int @sql(statement: "SELECT * FROM TAXRATE WHERE ZIP = :zip")
      }
    `;

    const transformConfig: TestTransformParameters = {
      schema: doc,
      transformers: [new ModelTransformer(), new SqlTransformer()],
      modelToDatasourceMap: new Map(),
      customSqlDataSourceStrategies: [
        {
          typeName: 'Query',
          fieldName: 'calculateTaxRate',
          dataSourceType: {
            dbType: 'MYSQL',
            provisionDB: false,
            provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
          },
        },
      ],
    };

    const out = testTransform(transformConfig);
    expect(out).toBeDefined();
    expect(out.schema).toBeDefined();
    const definition = out.schema;
    expect(definition).toBeDefined();

    const parsed = parse(definition);
    validateModelSchema(parsed);

    expect(out.resolvers).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.req.vtl']).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.res.vtl']).toBeDefined();
    expect(out.resolvers['Query.calculateTaxRate.req.vtl']).toMatchSnapshot();
    expect(out.resolvers['Query.calculateTaxRate.res.vtl']).toMatchSnapshot();
  });
});
