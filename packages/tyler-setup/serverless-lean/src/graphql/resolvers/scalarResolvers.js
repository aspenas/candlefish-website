/**
 * GraphQL Scalar Resolvers
 * Custom scalar types for optimized data handling
 */

import { GraphQLScalarType, GraphQLError } from 'graphql';
import { Kind } from 'graphql/language/index.js';

/**
 * DateTime scalar type
 */
const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  description: 'A date-time string at UTC, such as 2007-12-03T10:15:30Z',

  serialize(value) {
    // Value sent to the client
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    throw new GraphQLError(`Value is not a valid DateTime: ${value}`);
  },

  parseValue(value) {
    // Value from the client variables
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new GraphQLError(`Value is not a valid DateTime: ${value}`);
      }
      return date;
    }
    throw new GraphQLError(`Value is not a valid DateTime: ${value}`);
  },

  parseLiteral(ast) {
    // Value from the client query
    if (ast.kind === Kind.STRING) {
      const date = new Date(ast.value);
      if (isNaN(date.getTime())) {
        throw new GraphQLError(`Value is not a valid DateTime: ${ast.value}`, [ast]);
      }
      return date;
    }
    throw new GraphQLError(`Can only parse strings to DateTime but got a: ${ast.kind}`, [ast]);
  },
});

/**
 * JSON scalar type
 */
const JSON = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON value that can be any valid JSON data type',

  serialize(value) {
    // Value sent to the client
    return value;
  },

  parseValue(value) {
    // Value from the client variables
    return value;
  },

  parseLiteral(ast) {
    // Value from the client query
    switch (ast.kind) {
      case Kind.STRING:
        try {
          return JSON.parse(ast.value);
        } catch {
          return ast.value;
        }
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.NULL:
        return null;
      case Kind.OBJECT:
        return parseObject(ast);
      case Kind.LIST:
        return ast.values.map(parseLiteral);
      default:
        throw new GraphQLError(`Can only parse JSON values but got a: ${ast.kind}`, [ast]);
    }
  },
});

/**
 * Helper function to parse object literals
 */
function parseObject(ast) {
  const value = {};
  ast.fields.forEach(field => {
    value[field.name.value] = parseLiteral(field.value);
  });
  return value;
}

/**
 * Helper function to parse any literal
 */
function parseLiteral(ast) {
  return JSON.parseLiteral(ast);
}

export const scalarResolvers = {
  DateTime,
  JSON,
};
