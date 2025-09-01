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
import { ssePaths } from './paths/sse';
import { realtimePaths } from './paths/realtime';
import { warningsPaths } from './paths/warnings';
import { systemPaths } from './paths/system';
import { settingsPaths } from './paths/settings';
import { uploadPaths } from './paths/upload';
import { processQueuePaths } from './paths/process-queue';
import { logsPaths } from './paths/logs';
import { aiPaths } from './paths/ai';
import { recruitmentStagesPaths } from './paths/recruitment-stages';
import { transitionsPaths } from './paths/transitions';
import { candidateSourcesPaths } from './paths/candidate-sources';
import { userPreferencesPaths } from './paths/user-preferences';
import { slaViolationsPaths } from './paths/sla-violations';
import { setupPaths } from './paths/setup';
import { linkPreviewPaths } from './paths/link-preview';
import { headcountPaths } from './paths/headcount';
import { downloadPaths } from './paths/download';
import { automationPaths } from './paths/automation';
import { resumesPaths } from './paths/resumes';
import { warningConfigurationsPaths } from './paths/warning-configurations';

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
      ...ssePaths,
      ...realtimePaths,
      ...warningsPaths,
      ...systemPaths,
      ...settingsPaths,
      ...uploadPaths,
      ...processQueuePaths,
      ...logsPaths,
      ...aiPaths,
      ...recruitmentStagesPaths,
      ...transitionsPaths,
      ...candidateSourcesPaths,
      ...userPreferencesPaths,
      ...slaViolationsPaths,
      ...setupPaths,
      ...linkPreviewPaths,
      ...headcountPaths,
      ...downloadPaths,
      ...automationPaths,
      ...resumesPaths,
      ...warningConfigurationsPaths,
    },
    components: {
      ...baseSwaggerConfig.components,
      schemas
    }
  };
}

export default getSwaggerSpec();
