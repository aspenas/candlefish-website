/**
 * GraphQL Type Definitions for Tyler Setup
 * Exported as JavaScript for better Lambda performance
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read schema file at build time for better performance
export const typeDefs = readFileSync(
  join(__dirname, 'schema.graphql'),
  'utf8'
);
