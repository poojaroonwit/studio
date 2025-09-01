// DEPRECATED: This file has been replaced with a modular structure
// Please use the new modular swagger documentation at @/swagger/index
// This file is kept for backward compatibility but will be removed in future versions

import { getSwaggerSpec as getNewSwaggerSpec } from './swagger/index';

export function getSwaggerSpec() {
  return getNewSwaggerSpec();
}

export default getSwaggerSpec();
