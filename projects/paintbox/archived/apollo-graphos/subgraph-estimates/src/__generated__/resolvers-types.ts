import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { DataSourceContext } from '../types/DataSourceContext';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  JSON: { input: any; output: any; }
  _FieldSet: { input: any; output: any; }
};

export type CalculationProgress = {
  __typename?: 'CalculationProgress';
  completed: Scalars['Boolean']['output'];
  estimateId: Scalars['ID']['output'];
  message?: Maybe<Scalars['String']['output']>;
  progress: Scalars['Float']['output'];
  stage: Scalars['String']['output'];
};

export enum ComplexityLevel {
  Complex = 'COMPLEX',
  HighlyComplex = 'HIGHLY_COMPLEX',
  Moderate = 'MODERATE',
  Simple = 'SIMPLE'
}

export type CreateEstimateInput = {
  customerId: Scalars['ID']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
};

export type Estimate = {
  __typename?: 'Estimate';
  bestPrice: Scalars['Float']['output'];
  betterPrice: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  createdBy: Scalars['String']['output'];
  customerId: Scalars['ID']['output'];
  goodPrice: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  laborHours: Scalars['Float']['output'];
  materialCost: Scalars['Float']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  pdfUrl?: Maybe<Scalars['String']['output']>;
  projectId?: Maybe<Scalars['ID']['output']>;
  selectedTier: PricingTier;
  status: EstimateStatus;
  totalSquareFootage: Scalars['Float']['output'];
  updatedAt: Scalars['String']['output'];
};

export type EstimateConnection = {
  __typename?: 'EstimateConnection';
  edges: Array<EstimateEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int']['output'];
};

export type EstimateEdge = {
  __typename?: 'EstimateEdge';
  cursor: Scalars['String']['output'];
  node: Estimate;
};

export type EstimateFilter = {
  createdAfter?: InputMaybe<Scalars['String']['input']>;
  createdBefore?: InputMaybe<Scalars['String']['input']>;
  customerId?: InputMaybe<Scalars['ID']['input']>;
  projectId?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<EstimateStatus>;
};

export enum EstimateStatus {
  Accepted = 'ACCEPTED',
  Archived = 'ARCHIVED',
  Draft = 'DRAFT',
  Expired = 'EXPIRED',
  InProgress = 'IN_PROGRESS',
  Rejected = 'REJECTED',
  Review = 'REVIEW',
  Sent = 'SENT'
}

export enum MaterialType {
  Economy = 'ECONOMY',
  Luxury = 'LUXURY',
  Premium = 'PREMIUM',
  Standard = 'STANDARD'
}

export type Mutation = {
  __typename?: 'Mutation';
  createEstimate: Estimate;
  deleteEstimate: Scalars['Boolean']['output'];
  generatePDF: PdfResult;
  updateEstimate: Estimate;
};


export type MutationCreateEstimateArgs = {
  input: CreateEstimateInput;
};


export type MutationDeleteEstimateArgs = {
  id: Scalars['ID']['input'];
};


export type MutationGeneratePdfArgs = {
  estimateId: Scalars['ID']['input'];
};


export type MutationUpdateEstimateArgs = {
  id: Scalars['ID']['input'];
  input: UpdateEstimateInput;
};

export type PdfResult = {
  __typename?: 'PDFResult';
  error?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  url?: Maybe<Scalars['String']['output']>;
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

export type PricingCalculation = {
  __typename?: 'PricingCalculation';
  laborCost: Scalars['Float']['output'];
  materialCost: Scalars['Float']['output'];
  overheadCost: Scalars['Float']['output'];
  profitMargin: Scalars['Float']['output'];
  subtotal: Scalars['Float']['output'];
  tax: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
};

export type PricingInput = {
  complexity: ComplexityLevel;
  laborHours: Scalars['Float']['input'];
  materialType: MaterialType;
  squareFootage: Scalars['Float']['input'];
};

export enum PricingTier {
  Best = 'BEST',
  Better = 'BETTER',
  Good = 'GOOD'
}

export type Query = {
  __typename?: 'Query';
  calculatePricing: PricingCalculation;
  estimate?: Maybe<Estimate>;
  estimates: EstimateConnection;
};


export type QueryCalculatePricingArgs = {
  input: PricingInput;
};


export type QueryEstimateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEstimatesArgs = {
  filter?: InputMaybe<EstimateFilter>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  calculationProgress: CalculationProgress;
  estimateUpdated: Estimate;
};


export type SubscriptionCalculationProgressArgs = {
  estimateId: Scalars['ID']['input'];
};


export type SubscriptionEstimateUpdatedArgs = {
  id: Scalars['ID']['input'];
};

export type UpdateEstimateInput = {
  notes?: InputMaybe<Scalars['String']['input']>;
  selectedTier?: InputMaybe<PricingTier>;
  status?: InputMaybe<EstimateStatus>;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ReferenceResolver<TResult, TReference, TContext> = (
      reference: TReference,
      context: TContext,
      info: GraphQLResolveInfo
    ) => Promise<TResult> | TResult;

      type ScalarCheck<T, S> = S extends true ? T : NullableCheck<T, S>;
      type NullableCheck<T, S> = Maybe<T> extends T ? Maybe<ListCheck<NonNullable<T>, S>> : ListCheck<T, S>;
      type ListCheck<T, S> = T extends (infer U)[] ? NullableCheck<U, S>[] : GraphQLRecursivePick<T, S>;
      export type GraphQLRecursivePick<T, S> = { [K in keyof T & keyof S]: ScalarCheck<T[K], S[K]> };


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  CalculationProgress: ResolverTypeWrapper<CalculationProgress>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ComplexityLevel: ComplexityLevel;
  CreateEstimateInput: CreateEstimateInput;
  Estimate: ResolverTypeWrapper<Estimate>;
  EstimateConnection: ResolverTypeWrapper<EstimateConnection>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  EstimateEdge: ResolverTypeWrapper<EstimateEdge>;
  EstimateFilter: EstimateFilter;
  EstimateStatus: EstimateStatus;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  MaterialType: MaterialType;
  Mutation: ResolverTypeWrapper<{}>;
  PDFResult: ResolverTypeWrapper<PdfResult>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PricingCalculation: ResolverTypeWrapper<PricingCalculation>;
  PricingInput: PricingInput;
  PricingTier: PricingTier;
  Query: ResolverTypeWrapper<{}>;
  Subscription: ResolverTypeWrapper<{}>;
  UpdateEstimateInput: UpdateEstimateInput;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  CalculationProgress: CalculationProgress;
  Boolean: Scalars['Boolean']['output'];
  ID: Scalars['ID']['output'];
  String: Scalars['String']['output'];
  Float: Scalars['Float']['output'];
  CreateEstimateInput: CreateEstimateInput;
  Estimate: Estimate;
  EstimateConnection: EstimateConnection;
  Int: Scalars['Int']['output'];
  EstimateEdge: EstimateEdge;
  EstimateFilter: EstimateFilter;
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  PDFResult: PdfResult;
  PageInfo: PageInfo;
  PricingCalculation: PricingCalculation;
  PricingInput: PricingInput;
  Query: {};
  Subscription: {};
  UpdateEstimateInput: UpdateEstimateInput;
}>;

export type ContactDirectiveArgs = {
  description?: Maybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  url?: Maybe<Scalars['String']['input']>;
};

export type ContactDirectiveResolver<Result, Parent, ContextType = DataSourceContext, Args = ContactDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type CalculationProgressResolvers<ContextType = DataSourceContext, ParentType extends ResolversParentTypes['CalculationProgress'] = ResolversParentTypes['CalculationProgress']> = ResolversObject<{
  completed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  estimateId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  message?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  progress?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  stage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type EstimateResolvers<ContextType = DataSourceContext, ParentType extends ResolversParentTypes['Estimate'] = ResolversParentTypes['Estimate']> = ResolversObject<{
  __resolveReference?: ReferenceResolver<Maybe<ResolversTypes['Estimate']>, { __typename: 'Estimate' } & GraphQLRecursivePick<ParentType, {"id":true}>, ContextType>;
  bestPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  betterPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdBy?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  customerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  goodPrice?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  laborHours?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  materialCost?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  notes?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  pdfUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  projectId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  selectedTier?: Resolver<ResolversTypes['PricingTier'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['EstimateStatus'], ParentType, ContextType>;
  totalSquareFootage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type EstimateConnectionResolvers<ContextType = DataSourceContext, ParentType extends ResolversParentTypes['EstimateConnection'] = ResolversParentTypes['EstimateConnection']> = ResolversObject<{
  edges?: Resolver<Array<ResolversTypes['EstimateEdge']>, ParentType, ContextType>;
  pageInfo?: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type EstimateEdgeResolvers<ContextType = DataSourceContext, ParentType extends ResolversParentTypes['EstimateEdge'] = ResolversParentTypes['EstimateEdge']> = ResolversObject<{
  cursor?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  node?: Resolver<ResolversTypes['Estimate'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = DataSourceContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  createEstimate?: Resolver<ResolversTypes['Estimate'], ParentType, ContextType, RequireFields<MutationCreateEstimateArgs, 'input'>>;
  deleteEstimate?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteEstimateArgs, 'id'>>;
  generatePDF?: Resolver<ResolversTypes['PDFResult'], ParentType, ContextType, RequireFields<MutationGeneratePdfArgs, 'estimateId'>>;
  updateEstimate?: Resolver<ResolversTypes['Estimate'], ParentType, ContextType, RequireFields<MutationUpdateEstimateArgs, 'id' | 'input'>>;
}>;

export type PdfResultResolvers<ContextType = DataSourceContext, ParentType extends ResolversParentTypes['PDFResult'] = ResolversParentTypes['PDFResult']> = ResolversObject<{
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  success?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PageInfoResolvers<ContextType = DataSourceContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = ResolversObject<{
  endCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasPreviousPage?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  startCursor?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PricingCalculationResolvers<ContextType = DataSourceContext, ParentType extends ResolversParentTypes['PricingCalculation'] = ResolversParentTypes['PricingCalculation']> = ResolversObject<{
  laborCost?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  materialCost?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  overheadCost?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  profitMargin?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  subtotal?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  tax?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = DataSourceContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  calculatePricing?: Resolver<ResolversTypes['PricingCalculation'], ParentType, ContextType, RequireFields<QueryCalculatePricingArgs, 'input'>>;
  estimate?: Resolver<Maybe<ResolversTypes['Estimate']>, ParentType, ContextType, RequireFields<QueryEstimateArgs, 'id'>>;
  estimates?: Resolver<ResolversTypes['EstimateConnection'], ParentType, ContextType, RequireFields<QueryEstimatesArgs, 'limit' | 'offset'>>;
}>;

export type SubscriptionResolvers<ContextType = DataSourceContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  calculationProgress?: SubscriptionResolver<ResolversTypes['CalculationProgress'], "calculationProgress", ParentType, ContextType, RequireFields<SubscriptionCalculationProgressArgs, 'estimateId'>>;
  estimateUpdated?: SubscriptionResolver<ResolversTypes['Estimate'], "estimateUpdated", ParentType, ContextType, RequireFields<SubscriptionEstimateUpdatedArgs, 'id'>>;
}>;

export type Resolvers<ContextType = DataSourceContext> = ResolversObject<{
  CalculationProgress?: CalculationProgressResolvers<ContextType>;
  Estimate?: EstimateResolvers<ContextType>;
  EstimateConnection?: EstimateConnectionResolvers<ContextType>;
  EstimateEdge?: EstimateEdgeResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  PDFResult?: PdfResultResolvers<ContextType>;
  PageInfo?: PageInfoResolvers<ContextType>;
  PricingCalculation?: PricingCalculationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
}>;

export type DirectiveResolvers<ContextType = DataSourceContext> = ResolversObject<{
  contact?: ContactDirectiveResolver<any, any, ContextType>;
}>;
