// Consolidated bucket configuration - must match minio.ts to prevent mismatches
export const MINIO_BUCKET = process.env.MINIO_BUCKET_NAME || process.env.MINIO_BUCKET || 'uploads';
export const MINIO_PUBLIC_BASE_URL = process.env.MINIO_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL || 'http://localhost:8621'; // Use console port for public access

