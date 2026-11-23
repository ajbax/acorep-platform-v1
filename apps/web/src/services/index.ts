import { currentSession } from '@/features/auth/session';
import { createMockService } from './mock/mockService';
import type { DataService } from './types';

export * from './types';

// TODO(backend): add the http service (API Gateway + Cognito ID token) selected by VITE_DATA_SOURCE=http.
export const data: DataService = createMockService(currentSession);
