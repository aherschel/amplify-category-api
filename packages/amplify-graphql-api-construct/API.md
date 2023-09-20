## API Report File for "@aws-amplify/graphql-construct-alpha"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { CfnApiKey } from 'aws-cdk-lib/aws-appsync';
import { CfnDataSource } from 'aws-cdk-lib/aws-appsync';
import { CfnFunction } from 'aws-cdk-lib/aws-lambda';
import { CfnFunctionConfiguration } from 'aws-cdk-lib/aws-appsync';
import { CfnGraphQLApi } from 'aws-cdk-lib/aws-appsync';
import { CfnGraphQLSchema } from 'aws-cdk-lib/aws-appsync';
import { CfnResolver } from 'aws-cdk-lib/aws-appsync';
import { CfnResource } from 'aws-cdk-lib';
import { CfnRole } from 'aws-cdk-lib/aws-iam';
import { CfnTable } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IGraphqlApi } from 'aws-cdk-lib/aws-appsync';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { MappingTemplate } from 'aws-cdk-lib/aws-appsync';
import { NestedStack } from 'aws-cdk-lib';
import { SchemaFile } from 'aws-cdk-lib/aws-appsync';
import { z } from 'zod';

// @public
export interface AmplifyApiSchemaPreprocessorOutput {
    readonly processedFunctionSlots?: FunctionSlot[];
    readonly processedSchema: string;
}

// @public
export class AmplifyGraphqlApi extends Construct {
    constructor(scope: Construct, id: string, props: AmplifyGraphqlApiProps);
    readonly generatedFunctionSlots: FunctionSlot[];
    readonly resources: AmplifyGraphqlApiResources;
}

// @public
export interface AmplifyGraphqlApiCfnResources {
    readonly additionalCfnResources: Record<string, CfnResource>;
    readonly cfnApiKey?: CfnApiKey;
    readonly cfnDataSources: Record<string, CfnDataSource>;
    readonly cfnFunctionConfigurations: Record<string, CfnFunctionConfiguration>;
    readonly cfnFunctions: Record<string, CfnFunction>;
    readonly cfnGraphqlApi: CfnGraphQLApi;
    readonly cfnGraphqlSchema: CfnGraphQLSchema;
    readonly cfnResolvers: Record<string, CfnResolver>;
    readonly cfnRoles: Record<string, CfnRole>;
    readonly cfnTables: Record<string, CfnTable>;
}

// @public
export interface AmplifyGraphqlApiProps {
    readonly apiName?: string;
    readonly authorizationConfig: AuthorizationConfig;
    readonly conflictResolution?: ConflictResolution;
    readonly functionNameMap?: Record<string, IFunction>;
    readonly functionSlots?: FunctionSlot[];
    readonly outputStorageStrategy?: IBackendOutputStorageStrategy;
    readonly predictionsBucket?: IBucket;
    readonly schema: IAmplifyGraphqlSchema;
    readonly schemaTranslationBehavior?: PartialSchemaTranslationBehavior;
    readonly stackMappings?: Record<string, string>;
    readonly transformers?: any[];
}

// @public
export interface AmplifyGraphqlApiResources {
    readonly cfnResources: AmplifyGraphqlApiCfnResources;
    readonly functions: Record<string, IFunction>;
    readonly graphqlApi: IGraphqlApi;
    readonly nestedStacks: Record<string, NestedStack>;
    readonly roles: Record<string, IRole>;
    readonly tables: Record<string, ITable>;
}

// @public
export class AmplifyGraphqlSchema {
    static fromSchemaFiles(...schemaFiles: SchemaFile[]): IAmplifyGraphqlSchema;
    static fromString(schema: string): IAmplifyGraphqlSchema;
}

// @public
export interface ApiKeyAuthorizationConfig {
    readonly description?: string;
    readonly expires: Duration;
}

// @public
export interface AuthorizationConfig {
    readonly apiKeyConfig?: ApiKeyAuthorizationConfig;
    readonly defaultAuthMode?: 'AWS_IAM' | 'AMAZON_COGNITO_USER_POOLS' | 'OPENID_CONNECT' | 'API_KEY' | 'AWS_LAMBDA';
    readonly iamConfig?: IAMAuthorizationConfig;
    readonly lambdaConfig?: LambdaAuthorizationConfig;
    readonly oidcConfig?: OIDCAuthorizationConfig;
    readonly userPoolConfig?: UserPoolAuthorizationConfig;
}

// @public
export interface AutomergeConflictResolutionStrategy extends ConflictResolutionStrategyBase {
    readonly handlerType: 'AUTOMERGE';
}

// @public
export interface BackendOutputEntry {
    readonly payload: Record<string, string>;
    readonly version: string;
}

// @public
export type ConflictDetectionType = 'VERSION' | 'NONE';

// @public
export interface ConflictResolution {
    readonly models?: Record<string, ConflictResolutionStrategy>;
    readonly project?: ConflictResolutionStrategy;
}

// @public
export type ConflictResolutionStrategy = AutomergeConflictResolutionStrategy | OptimisticConflictResolutionStrategy | CustomConflictResolutionStrategy;

// @public
export interface ConflictResolutionStrategyBase {
    readonly detectionType: ConflictDetectionType;
}

// @public
export interface CustomConflictResolutionStrategy extends ConflictResolutionStrategyBase {
    readonly conflictHandler: IFunction;
    readonly handlerType: 'LAMBDA';
}

// @public
export type FunctionSlot = MutationFunctionSlot | QueryFunctionSlot | SubscriptionFunctionSlot;

// @public
export interface FunctionSlotBase {
    readonly fieldName: string;
    readonly function: FunctionSlotOverride;
    readonly slotIndex: number;
}

// @public
export interface FunctionSlotOverride {
    readonly requestMappingTemplate?: MappingTemplate;
    readonly responseMappingTemplate?: MappingTemplate;
}

// @public
export type GraphqlOutput = z.infer<typeof versionedGraphqlOutputSchema>;

// @public
export interface IAMAuthorizationConfig {
    readonly adminRoles?: IRole[];
    readonly authenticatedUserRole?: IRole;
    readonly identityPoolId?: string;
    readonly unauthenticatedUserRole?: IRole;
}

// @public
export interface IAmplifyGraphqlSchema {
    readonly definition: string;
    readonly functionSlots: FunctionSlot[];
}

// @public
export interface IBackendOutputStorageStrategy {
    addBackendOutputEntry(keyName: string, strategy: BackendOutputEntry): void;
    flush(): void;
}

// @public
export interface LambdaAuthorizationConfig {
    readonly function: IFunction;
    readonly ttl: Duration;
}

// @public
export interface MutationFunctionSlot extends FunctionSlotBase {
    readonly slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preUpdate' | 'postUpdate' | 'finish';
    readonly typeName: 'Mutation';
}

// @public
export interface OIDCAuthorizationConfig {
    readonly clientId?: string;
    readonly oidcIssuerUrl: string;
    readonly oidcProviderName: string;
    readonly tokenExpiryFromAuth: Duration;
    readonly tokenExpiryFromIssue: Duration;
}

// @public
export interface OptimisticConflictResolutionStrategy extends ConflictResolutionStrategyBase {
    readonly handlerType: 'OPTIMISTIC_CONCURRENCY';
}

// @public
export interface PartialSchemaTranslationBehavior {
    readonly disableResolverDeduping?: boolean;
    readonly enableAutoIndexQueryNames?: boolean;
    readonly enableSearchNodeToNodeEncryption?: boolean;
    readonly enableTransformerCfnOutputs?: boolean;
    readonly populateOwnerFieldForStaticGroupAuth?: boolean;
    readonly respectPrimaryKeyAttributesOnConnectionField?: boolean;
    readonly sandboxModeEnabled?: boolean;
    readonly secondaryKeyAsGSI?: boolean;
    readonly shouldDeepMergeDirectiveConfigDefaults?: boolean;
    readonly suppressApiKeyGeneration?: boolean;
    readonly useSubUsernameForDefaultIdentityClaim?: boolean;
}

// @public
export interface QueryFunctionSlot extends FunctionSlotBase {
    readonly slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preDataLoad' | 'postDataLoad' | 'finish';
    readonly typeName: 'Query';
}

// @public
export interface SchemaTranslationBehavior {
    readonly disableResolverDeduping: boolean;
    readonly enableAutoIndexQueryNames: boolean;
    readonly enableSearchNodeToNodeEncryption: boolean;
    readonly enableTransformerCfnOutputs: boolean;
    readonly populateOwnerFieldForStaticGroupAuth: boolean;
    readonly respectPrimaryKeyAttributesOnConnectionField: boolean;
    readonly sandboxModeEnabled: boolean;
    readonly secondaryKeyAsGSI: boolean;
    readonly shouldDeepMergeDirectiveConfigDefaults: boolean;
    readonly suppressApiKeyGeneration: boolean;
    readonly useSubUsernameForDefaultIdentityClaim: boolean;
}

// @public
export interface SubscriptionFunctionSlot extends FunctionSlotBase {
    readonly slotName: 'init' | 'preAuth' | 'auth' | 'postAuth' | 'preSubscribe';
    readonly typeName: 'Subscription';
}

// @public
export interface UserPoolAuthorizationConfig {
    readonly userPool: IUserPool;
}

// @public
export const versionedGraphqlOutputSchema: z.ZodDiscriminatedUnion<"version", [z.ZodObject<{
    version: z.ZodLiteral<"1">;
    payload: z.ZodObject<{
        awsAppsyncRegion: z.ZodString;
        awsAppsyncApiEndpoint: z.ZodString;
        awsAppsyncAuthenticationType: z.ZodEnum<["API_KEY", "AWS_LAMBDA", "AWS_IAM", "OPENID_CONNECT", "AMAZON_COGNITO_USER_POOLS"]>;
        awsAppsyncApiKey: z.ZodOptional<z.ZodString>;
        awsAppsyncApiId: z.ZodString;
        amplifyApiModelSchemaS3Uri: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        awsAppsyncRegion: string;
        awsAppsyncApiEndpoint: string;
        awsAppsyncAuthenticationType: "AWS_LAMBDA" | "API_KEY" | "AMAZON_COGNITO_USER_POOLS" | "AWS_IAM" | "OPENID_CONNECT";
        awsAppsyncApiId: string;
        amplifyApiModelSchemaS3Uri: string;
        awsAppsyncApiKey?: string | undefined;
    }, {
        awsAppsyncRegion: string;
        awsAppsyncApiEndpoint: string;
        awsAppsyncAuthenticationType: "AWS_LAMBDA" | "API_KEY" | "AMAZON_COGNITO_USER_POOLS" | "AWS_IAM" | "OPENID_CONNECT";
        awsAppsyncApiId: string;
        amplifyApiModelSchemaS3Uri: string;
        awsAppsyncApiKey?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    version: "1";
    payload: {
        awsAppsyncRegion: string;
        awsAppsyncApiEndpoint: string;
        awsAppsyncAuthenticationType: "AWS_LAMBDA" | "API_KEY" | "AMAZON_COGNITO_USER_POOLS" | "AWS_IAM" | "OPENID_CONNECT";
        awsAppsyncApiId: string;
        amplifyApiModelSchemaS3Uri: string;
        awsAppsyncApiKey?: string | undefined;
    };
}, {
    version: "1";
    payload: {
        awsAppsyncRegion: string;
        awsAppsyncApiEndpoint: string;
        awsAppsyncAuthenticationType: "AWS_LAMBDA" | "API_KEY" | "AMAZON_COGNITO_USER_POOLS" | "AWS_IAM" | "OPENID_CONNECT";
        awsAppsyncApiId: string;
        amplifyApiModelSchemaS3Uri: string;
        awsAppsyncApiKey?: string | undefined;
    };
}>]>;

// (No @packageDocumentation comment for this package)

```