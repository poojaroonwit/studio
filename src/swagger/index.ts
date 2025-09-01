// Optimized OpenAPI 3.0 specification for Studio API
// This file combines modular components for better maintainability

import { baseSwaggerConfig } from './base';
import { schemas } from './schemas';

// Import path modules (these will be created separately)
import { authPaths } from './paths/auth';
import { positionsPaths } from './paths/positions';
import { candidatesPaths } from './paths/candidates';
import { usersPaths } from './paths/users';
import { notificationsPaths } from './paths/notifications';
import { dashboardPaths } from './paths/dashboard';
import { healthPaths } from './paths/health';
import { uploadQueuePaths } from './paths/upload-queue';

export function getSwaggerSpec() {
  return {
    ...baseSwaggerConfig,
    paths: {
      ...authPaths,
      ...positionsPaths,
      ...candidatesPaths,
      ...usersPaths,
      ...notificationsPaths,
      ...dashboardPaths,
      ...healthPaths,
      ...uploadQueuePaths,
    },
    components: {
      ...baseSwaggerConfig.components,
      schemas
    }
  };
}

export default getSwaggerSpec();
