import { GraphQLScalarType, GraphQLError } from 'graphql';
import { Kind } from 'graphql/language';
import { ValidationError, validateEmail, validateUUID } from '../errors/error-handling';

// DateTime scalar for ISO 8601 date-time strings
export const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  description: 'A date-time string at UTC, such as 2007-12-03T10:15:30Z',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new ValidationError('Invalid DateTime format', 'dateTime', value);
      }
      return date.toISOString();
    }
    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }
    throw new ValidationError('DateTime must be a valid date', 'dateTime', value);
  },
  parseValue(value: unknown): Date {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new ValidationError('Invalid DateTime format', 'dateTime', value);
      }
      return date;
    }
    throw new ValidationError('DateTime must be a string', 'dateTime', value);
  },
  parseLiteral(ast): Date {
    if (ast.kind === Kind.STRING) {
      const date = new Date(ast.value);
      if (isNaN(date.getTime())) {
        throw new ValidationError('Invalid DateTime format', 'dateTime', ast.value);
      }
      return date;
    }
    throw new ValidationError('DateTime must be a string literal', 'dateTime');
  },
});

// Date scalar for date-only strings (YYYY-MM-DD)
export const Date = new GraphQLScalarType({
  name: 'Date',
  description: 'A date string, such as 2007-12-03',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new ValidationError('Invalid Date format', 'date', value);
      }
      return date.toISOString().split('T')[0];
    }
    throw new ValidationError('Date must be a valid date', 'date', value);
  },
  parseValue(value: unknown): Date {
    if (typeof value === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        throw new ValidationError('Date must be in YYYY-MM-DD format', 'date', value);
      }
      const date = new Date(value + 'T00:00:00.000Z');
      if (isNaN(date.getTime())) {
        throw new ValidationError('Invalid Date format', 'date', value);
      }
      return date;
    }
    throw new ValidationError('Date must be a string', 'date', value);
  },
  parseLiteral(ast): Date {
    if (ast.kind === Kind.STRING) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(ast.value)) {
        throw new ValidationError('Date must be in YYYY-MM-DD format', 'date', ast.value);
      }
      const date = new Date(ast.value + 'T00:00:00.000Z');
      if (isNaN(date.getTime())) {
        throw new ValidationError('Invalid Date format', 'date', ast.value);
      }
      return date;
    }
    throw new ValidationError('Date must be a string literal', 'date');
  },
});

// JSON scalar for arbitrary JSON values
export const JSON = new GraphQLScalarType({
  name: 'JSON',
  description: 'A JSON scalar type',
  serialize(value: unknown): any {
    return value;
  },
  parseValue(value: unknown): any {
    return value;
  },
  parseLiteral(ast): any {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT:
        const obj: any = {};
        ast.fields.forEach(field => {
          obj[field.name.value] = JSON.parseLiteral(field.value);
        });
        return obj;
      case Kind.LIST:
        return ast.values.map(JSON.parseLiteral);
      case Kind.NULL:
        return null;
      default:
        return undefined;
    }
  },
});

// JSONObject scalar for JSON objects specifically
export const JSONObject = new GraphQLScalarType({
  name: 'JSONObject',
  description: 'A JSON object scalar type',
  serialize(value: unknown): Record<string, any> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, any>;
    }
    throw new ValidationError('JSONObject must be an object', 'jsonObject', value);
  },
  parseValue(value: unknown): Record<string, any> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, any>;
    }
    throw new ValidationError('JSONObject must be an object', 'jsonObject', value);
  },
  parseLiteral(ast): Record<string, any> {
    if (ast.kind === Kind.OBJECT) {
      const obj: Record<string, any> = {};
      ast.fields.forEach(field => {
        obj[field.name.value] = JSON.parseLiteral(field.value);
      });
      return obj;
    }
    throw new ValidationError('JSONObject must be an object literal', 'jsonObject');
  },
});

// UUID scalar
export const UUID = new GraphQLScalarType({
  name: 'UUID',
  description: 'A UUID string',
  serialize(value: unknown): string {
    if (typeof value === 'string') {
      validateUUID(value, 'uuid');
      return value;
    }
    throw new ValidationError('UUID must be a string', 'uuid', value);
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      validateUUID(value, 'uuid');
      return value;
    }
    throw new ValidationError('UUID must be a string', 'uuid', value);
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING) {
      validateUUID(ast.value, 'uuid');
      return ast.value;
    }
    throw new ValidationError('UUID must be a string literal', 'uuid');
  },
});

// EmailAddress scalar
export const EmailAddress = new GraphQLScalarType({
  name: 'EmailAddress',
  description: 'A valid email address',
  serialize(value: unknown): string {
    if (typeof value === 'string') {
      validateEmail(value, 'email');
      return value;
    }
    throw new ValidationError('EmailAddress must be a string', 'email', value);
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      validateEmail(value, 'email');
      return value;
    }
    throw new ValidationError('EmailAddress must be a string', 'email', value);
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING) {
      validateEmail(ast.value, 'email');
      return ast.value;
    }
    throw new ValidationError('EmailAddress must be a string literal', 'email');
  },
});

// URL scalar
export const URL = new GraphQLScalarType({
  name: 'URL',
  description: 'A valid URL',
  serialize(value: unknown): string {
    if (typeof value === 'string') {
      try {
        new window.URL || new require('url').URL(value);
        return value;
      } catch {
        throw new ValidationError('Invalid URL format', 'url', value);
      }
    }
    throw new ValidationError('URL must be a string', 'url', value);
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      try {
        new (globalThis.URL || require('url').URL)(value);
        return value;
      } catch {
        throw new ValidationError('Invalid URL format', 'url', value);
      }
    }
    throw new ValidationError('URL must be a string', 'url', value);
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING) {
      try {
        new (globalThis.URL || require('url').URL)(ast.value);
        return ast.value;
      } catch {
        throw new ValidationError('Invalid URL format', 'url', ast.value);
      }
    }
    throw new ValidationError('URL must be a string literal', 'url');
  },
});

// PhoneNumber scalar
export const PhoneNumber = new GraphQLScalarType({
  name: 'PhoneNumber',
  description: 'A valid phone number in E.164 format',
  serialize(value: unknown): string {
    if (typeof value === 'string') {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(value)) {
        throw new ValidationError('Phone number must be in E.164 format', 'phoneNumber', value);
      }
      return value;
    }
    throw new ValidationError('PhoneNumber must be a string', 'phoneNumber', value);
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(value)) {
        throw new ValidationError('Phone number must be in E.164 format', 'phoneNumber', value);
      }
      return value;
    }
    throw new ValidationError('PhoneNumber must be a string', 'phoneNumber', value);
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING) {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(ast.value)) {
        throw new ValidationError('Phone number must be in E.164 format', 'phoneNumber', ast.value);
      }
      return ast.value;
    }
    throw new ValidationError('PhoneNumber must be a string literal', 'phoneNumber');
  },
});

// PositiveInt scalar
export const PositiveInt = new GraphQLScalarType({
  name: 'PositiveInt',
  description: 'A positive integer',
  serialize(value: unknown): number {
    const num = parseInt(String(value), 10);
    if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      throw new ValidationError('PositiveInt must be a positive integer', 'positiveInt', value);
    }
    return num;
  },
  parseValue(value: unknown): number {
    const num = parseInt(String(value), 10);
    if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      throw new ValidationError('PositiveInt must be a positive integer', 'positiveInt', value);
    }
    return num;
  },
  parseLiteral(ast): number {
    if (ast.kind === Kind.INT) {
      const num = parseInt(ast.value, 10);
      if (num <= 0) {
        throw new ValidationError('PositiveInt must be positive', 'positiveInt', ast.value);
      }
      return num;
    }
    throw new ValidationError('PositiveInt must be an integer literal', 'positiveInt');
  },
});

// NonNegativeInt scalar
export const NonNegativeInt = new GraphQLScalarType({
  name: 'NonNegativeInt',
  description: 'A non-negative integer (>= 0)',
  serialize(value: unknown): number {
    const num = parseInt(String(value), 10);
    if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
      throw new ValidationError('NonNegativeInt must be a non-negative integer', 'nonNegativeInt', value);
    }
    return num;
  },
  parseValue(value: unknown): number {
    const num = parseInt(String(value), 10);
    if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
      throw new ValidationError('NonNegativeInt must be a non-negative integer', 'nonNegativeInt', value);
    }
    return num;
  },
  parseLiteral(ast): number {
    if (ast.kind === Kind.INT) {
      const num = parseInt(ast.value, 10);
      if (num < 0) {
        throw new ValidationError('NonNegativeInt must be non-negative', 'nonNegativeInt', ast.value);
      }
      return num;
    }
    throw new ValidationError('NonNegativeInt must be an integer literal', 'nonNegativeInt');
  },
});

// NonEmptyString scalar
export const NonEmptyString = new GraphQLScalarType({
  name: 'NonEmptyString',
  description: 'A non-empty string',
  serialize(value: unknown): string {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    throw new ValidationError('NonEmptyString must be a non-empty string', 'nonEmptyString', value);
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    throw new ValidationError('NonEmptyString must be a non-empty string', 'nonEmptyString', value);
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING && ast.value.trim().length > 0) {
      return ast.value;
    }
    throw new ValidationError('NonEmptyString must be a non-empty string literal', 'nonEmptyString');
  },
});

// BigInt scalar
export const BigInt = new GraphQLScalarType({
  name: 'BigInt',
  description: 'A large integer that can exceed JavaScript number limits',
  serialize(value: unknown): string {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    throw new ValidationError('BigInt must be a valid integer', 'bigInt', value);
  },
  parseValue(value: unknown): bigint {
    try {
      return BigInt(String(value));
    } catch {
      throw new ValidationError('BigInt must be a valid integer', 'bigInt', value);
    }
  },
  parseLiteral(ast): bigint {
    if (ast.kind === Kind.INT || ast.kind === Kind.STRING) {
      try {
        return BigInt(ast.value);
      } catch {
        throw new ValidationError('BigInt must be a valid integer', 'bigInt', ast.value);
      }
    }
    throw new ValidationError('BigInt must be an integer or string literal', 'bigInt');
  },
});

// Decimal scalar for precise decimal numbers
export const Decimal = new GraphQLScalarType({
  name: 'Decimal',
  description: 'A decimal number with arbitrary precision',
  serialize(value: unknown): number {
    const num = parseFloat(String(value));
    if (isNaN(num)) {
      throw new ValidationError('Decimal must be a valid number', 'decimal', value);
    }
    return num;
  },
  parseValue(value: unknown): number {
    const num = parseFloat(String(value));
    if (isNaN(num)) {
      throw new ValidationError('Decimal must be a valid number', 'decimal', value);
    }
    return num;
  },
  parseLiteral(ast): number {
    if (ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
      return parseFloat(ast.value);
    }
    throw new ValidationError('Decimal must be a numeric literal', 'decimal');
  },
});

// HexColorCode scalar
export const HexColorCode = new GraphQLScalarType({
  name: 'HexColorCode',
  description: 'A hexadecimal color code (e.g., #FF0000)',
  serialize(value: unknown): string {
    if (typeof value === 'string') {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexRegex.test(value)) {
        throw new ValidationError('Invalid hex color format', 'hexColor', value);
      }
      return value;
    }
    throw new ValidationError('HexColorCode must be a string', 'hexColor', value);
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexRegex.test(value)) {
        throw new ValidationError('Invalid hex color format', 'hexColor', value);
      }
      return value;
    }
    throw new ValidationError('HexColorCode must be a string', 'hexColor', value);
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING) {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexRegex.test(ast.value)) {
        throw new ValidationError('Invalid hex color format', 'hexColor', ast.value);
      }
      return ast.value;
    }
    throw new ValidationError('HexColorCode must be a string literal', 'hexColor');
  },
});

// Duration scalar for time durations (ISO 8601)
export const Duration = new GraphQLScalarType({
  name: 'Duration',
  description: 'A duration in ISO 8601 format (e.g., P1D, PT1H30M)',
  serialize(value: unknown): string {
    if (typeof value === 'string') {
      const durationRegex = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
      if (!durationRegex.test(value)) {
        throw new ValidationError('Invalid duration format', 'duration', value);
      }
      return value;
    }
    throw new ValidationError('Duration must be a string', 'duration', value);
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      const durationRegex = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
      if (!durationRegex.test(value)) {
        throw new ValidationError('Invalid duration format', 'duration', value);
      }
      return value;
    }
    throw new ValidationError('Duration must be a string', 'duration', value);
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING) {
      const durationRegex = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;
      if (!durationRegex.test(ast.value)) {
        throw new ValidationError('Invalid duration format', 'duration', ast.value);
      }
      return ast.value;
    }
    throw new ValidationError('Duration must be a string literal', 'duration');
  },
});

// Timestamp scalar for Unix timestamps
export const Timestamp = new GraphQLScalarType({
  name: 'Timestamp',
  description: 'A Unix timestamp in seconds',
  serialize(value: unknown): number {
    if (value instanceof Date) {
      return Math.floor(value.getTime() / 1000);
    }
    if (typeof value === 'number') {
      return Math.floor(value);
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new ValidationError('Invalid timestamp', 'timestamp', value);
      }
      return Math.floor(date.getTime() / 1000);
    }
    throw new ValidationError('Timestamp must be a valid date or number', 'timestamp', value);
  },
  parseValue(value: unknown): Date {
    if (typeof value === 'number') {
      return new Date(value * 1000);
    }
    throw new ValidationError('Timestamp must be a number', 'timestamp', value);
  },
  parseLiteral(ast): Date {
    if (ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
      return new Date(parseFloat(ast.value) * 1000);
    }
    throw new ValidationError('Timestamp must be a numeric literal', 'timestamp');
  },
});

// Currency scalar for currency codes (ISO 4217)
export const Currency = new GraphQLScalarType({
  name: 'Currency',
  description: 'A currency code in ISO 4217 format (e.g., USD, EUR)',
  serialize(value: unknown): string {
    if (typeof value === 'string') {
      const currencyRegex = /^[A-Z]{3}$/;
      if (!currencyRegex.test(value)) {
        throw new ValidationError('Currency must be a 3-letter ISO 4217 code', 'currency', value);
      }
      return value;
    }
    throw new ValidationError('Currency must be a string', 'currency', value);
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      const currencyRegex = /^[A-Z]{3}$/;
      if (!currencyRegex.test(value)) {
        throw new ValidationError('Currency must be a 3-letter ISO 4217 code', 'currency', value);
      }
      return value;
    }
    throw new ValidationError('Currency must be a string', 'currency', value);
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING) {
      const currencyRegex = /^[A-Z]{3}$/;
      if (!currencyRegex.test(ast.value)) {
        throw new ValidationError('Currency must be a 3-letter ISO 4217 code', 'currency', ast.value);
      }
      return ast.value;
    }
    throw new ValidationError('Currency must be a string literal', 'currency');
  },
});

// Base64 scalar for base64-encoded strings
export const Base64 = new GraphQLScalarType({
  name: 'Base64',
  description: 'A base64-encoded string',
  serialize(value: unknown): string {
    if (typeof value === 'string') {
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(value)) {
        throw new ValidationError('Invalid base64 format', 'base64', value);
      }
      return value;
    }
    throw new ValidationError('Base64 must be a string', 'base64', value);
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(value)) {
        throw new ValidationError('Invalid base64 format', 'base64', value);
      }
      return value;
    }
    throw new ValidationError('Base64 must be a string', 'base64', value);
  },
  parseLiteral(ast): string {
    if (ast.kind === Kind.STRING) {
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(ast.value)) {
        throw new ValidationError('Invalid base64 format', 'base64', ast.value);
      }
      return ast.value;
    }
    throw new ValidationError('Base64 must be a string literal', 'base64');
  },
});

// Upload scalar for file uploads
export const Upload = new GraphQLScalarType({
  name: 'Upload',
  description: 'A file upload',
  serialize(): never {
    throw new GraphQLError('Upload serialization unsupported');
  },
  parseValue(value: unknown): any {
    // This would typically handle file upload objects from multipart requests
    return value;
  },
  parseLiteral(): never {
    throw new GraphQLError('Upload literal unsupported');
  },
});

// Export all custom scalars
export const customScalars = {
  DateTime,
  Date,
  JSON,
  JSONObject,
  UUID,
  EmailAddress,
  URL,
  PhoneNumber,
  PositiveInt,
  NonNegativeInt,
  NonEmptyString,
  BigInt,
  Decimal,
  HexColorCode,
  Duration,
  Timestamp,
  Currency,
  Base64,
  Upload,
};
