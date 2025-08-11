import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Setup MSW worker for browser environments
export const worker = setupWorker(...handlers);
