import { getSignedUrl } from '@/lib/minio'

export type FileUrlStrategy = 'signed' | 'stream'

export interface BuildFileUrlOptions {
	strategy?: FileUrlStrategy
	expiresInSeconds?: number
	fileName?: string
	candidateId?: string
	headcountId?: string
}

const DEFAULT_EXPIRES = 60 * 60 // 1 hour

export async function buildServerFileUrl(filePath: string, opts: BuildFileUrlOptions = {}): Promise<string> {
	const strategy = opts.strategy || (process.env.USE_SIGNED_URLS_IN_WEBHOOKS === 'true' ? 'signed' : 'stream')
	if (strategy === 'signed') {
		const expires = typeof opts.expiresInSeconds === 'number' ? opts.expiresInSeconds : DEFAULT_EXPIRES
		return await getSignedUrl(filePath, expires)
	}
	// stream URL for server contexts (e.g., include in internal payloads where receiver can call back with auth)
	const params = new URLSearchParams({ filePath })
	if (opts.fileName) params.set('fileName', opts.fileName)
	if (opts.candidateId) params.set('candidateId', opts.candidateId)
	if (opts.headcountId) params.set('headcountId', opts.headcountId)
	return `/api/secure-file/stream?${params.toString()}`
}

export function buildClientStreamUrl(filePath: string, opts: Omit<BuildFileUrlOptions, 'strategy'> = {}): string {
	const params = new URLSearchParams({ filePath })
	if (opts.fileName) params.set('fileName', opts.fileName)
	if (opts.candidateId) params.set('candidateId', opts.candidateId)
	if (opts.headcountId) params.set('headcountId', opts.headcountId)
	return `/api/secure-file/stream?${params.toString()}`
}
