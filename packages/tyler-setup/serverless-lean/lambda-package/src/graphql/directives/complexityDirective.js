/**
 * Query Complexity Analysis Directive
 * Implements field-level complexity scoring to prevent expensive queries
 */

import { defaultFieldResolver } from 'graphql';
import { SchemaDirectiveVisitor } from '@graphql-tools/utils';

/**
 * Complexity directive implementation
 * Usage: @complexity(value: 10)
 */
export class ComplexityDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { value: complexityValue = 1 } = this.args;
    const { resolve = defaultFieldResolver } = field;

    // Add complexity metadata to field
    field.complexity = complexityValue;

    // Wrap resolver to track complexity
    field.resolve = async function(parent, args, context, info) {
      // Add field complexity to query context
      if (context.queryComplexity === undefined) {
        context.queryComplexity = 0;
      }

      context.queryComplexity += complexityValue;

      // Check complexity limit
      const maxComplexity = context.maxComplexity || 1000;
      if (context.queryComplexity > maxComplexity) {
        throw new Error(
          `Query complexity ${context.queryComplexity} exceeds maximum allowed complexity ${maxComplexity}`
        );
      }

      // Execute original resolver
      return resolve.call(this, parent, args, context, info);
    };
  }
}

/**
 * Field complexity calculator
 * Calculates complexity based on various factors
 */
export function calculateFieldComplexity(fieldName, args, context) {
  // Base complexity values
  const baseComplexity = {
    // Simple fields
    id: 1,
    name: 1,
    email: 1,
    role: 1,
    status: 1,
    createdAt: 1,
    updatedAt: 1,

    // Relationship fields (require database queries)
    user: 5,
    users: 10,
    contractor: 5,
    contractors: 10,
    auditLogs: 15,
    secrets: 20,

    // Complex operations
    performanceMetrics: 25,

    // Mutations
    login: 10,
    createUser: 15,
    updateUser: 10,
    deleteUser: 10,
    createSecret: 20,
    updateSecret: 15,
    deleteSecret: 15,
  };

  let complexity = baseComplexity[fieldName] || 5; // Default complexity

  // Adjust complexity based on arguments
  if (args) {
    // Pagination arguments
    if (args.first || args.last) {
      const limit = args.first || args.last || 20;
      complexity += Math.min(limit / 10, 10); // Max 10 additional complexity
    }

    // Filter arguments
    if (args.filter) {
      const filterCount = Object.keys(args.filter).length;
      complexity += filterCount * 2; // 2 complexity per filter
    }

    // Search arguments (more expensive)
    if (args.filter && args.filter.search) {
      complexity += 10;
    }
  }

  // Adjust complexity based on user context
  if (context.user) {
    // Contractor queries are more restricted, so less complex
    if (context.user.type === 'contractor') {
      complexity = Math.floor(complexity * 0.7);
    }

    // Admin queries might be more complex
    if (context.user.role === 'admin' && fieldName.includes('audit')) {
      complexity = Math.floor(complexity * 1.2);
    }
  }

  return Math.max(complexity, 1); // Minimum complexity of 1
}

/**
 * Query complexity analysis function
 * Analyzes entire query tree for total complexity
 */
export function analyzeQueryComplexity(document, variables = {}, context = {}) {
  let totalComplexity = 0;
  const fieldComplexities = {};

  // Traverse query document
  function visitNode(node, depth = 0) {
    if (depth > 10) {
      throw new Error('Query depth limit exceeded (max 10 levels)');
    }

    if (node.kind === 'Field') {
      const fieldName = node.name.value;
      const fieldArgs = node.arguments ?
        node.arguments.reduce((args, arg) => {
          args[arg.name.value] = getArgumentValue(arg.value, variables);
          return args;
        }, {}) : {};

      const fieldComplexity = calculateFieldComplexity(fieldName, fieldArgs, context);
      fieldComplexities[fieldName] = fieldComplexity;
      totalComplexity += fieldComplexity;

      // Recursively analyze selection set
      if (node.selectionSet) {
        node.selectionSet.selections.forEach(selection => {
          visitNode(selection, depth + 1);
        });
      }
    } else if (node.kind === 'InlineFragment' || node.kind === 'FragmentSpread') {
      // Handle fragments
      if (node.selectionSet) {
        node.selectionSet.selections.forEach(selection => {
          visitNode(selection, depth);
        });
      }
    }
  }

  // Start analysis from operation definitions
  document.definitions.forEach(definition => {
    if (definition.kind === 'OperationDefinition') {
      definition.selectionSet.selections.forEach(selection => {
        visitNode(selection);
      });
    }
  });

  return {
    totalComplexity,
    fieldComplexities,
    isWithinLimit: totalComplexity <= (context.maxComplexity || 1000),
  };
}

/**
 * Extract argument value from AST
 */
function getArgumentValue(valueNode, variables) {
  switch (valueNode.kind) {
    case 'Variable':
      return variables[valueNode.name.value];
    case 'StringValue':
      return valueNode.value;
    case 'IntValue':
      return parseInt(valueNode.value, 10);
    case 'FloatValue':
      return parseFloat(valueNode.value);
    case 'BooleanValue':
      return valueNode.value;
    case 'NullValue':
      return null;
    case 'ListValue':
      return valueNode.values.map(value => getArgumentValue(value, variables));
    case 'ObjectValue':
      return valueNode.fields.reduce((obj, field) => {
        obj[field.name.value] = getArgumentValue(field.value, variables);
        return obj;
      }, {});
    default:
      return undefined;
  }
}

/**
 * Complexity analysis middleware for Apollo Server
 */
export function createComplexityAnalysisPlugin(options = {}) {
  const maxComplexity = options.maxComplexity || 1000;
  const scalarCost = options.scalarCost || 1;

  return {
    requestDidStart() {
      return {
        didResolveOperation(requestContext) {
          const { document, request } = requestContext;

          // Analyze query complexity
          const analysis = analyzeQueryComplexity(
            document,
            request.variables,
            { ...requestContext.context, maxComplexity }
          );

          // Store analysis in context for monitoring
          requestContext.context.queryComplexityAnalysis = analysis;

          // Check complexity limit
          if (!analysis.isWithinLimit) {
            throw new Error(
              `Query complexity ${analysis.totalComplexity} exceeds maximum allowed complexity ${maxComplexity}`
            );
          }

          // Log high complexity queries
          if (analysis.totalComplexity > maxComplexity * 0.8) {
            console.warn('High complexity query detected:', {
              complexity: analysis.totalComplexity,
              operation: request.operationName,
              fieldComplexities: analysis.fieldComplexities,
            });
          }
        },

        willSendResponse(requestContext) {
          // Add complexity info to response headers
          const analysis = requestContext.context.queryComplexityAnalysis;
          if (analysis && requestContext.response.http) {
            requestContext.response.http.headers.set(
              'x-query-complexity',
              analysis.totalComplexity.toString()
            );
          }
        },
      };
    },
  };
}

export { ComplexityDirective as complexityDirective };
