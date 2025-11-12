import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { minioClient, MINIO_BUCKET } from '@/lib/minio'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
	return new NextResponse(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
			'Access-Control-Allow-Credentials': 'true',
			'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
			'Access-Control-Max-Age': '86400',
		},
	})
}

function inferContentType(filePath: string): string {
	const lower = filePath.toLowerCase()
	if (lower.endsWith('.pdf')) return 'application/pdf'
	if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
	if (lower.endsWith('.png')) return 'image/png'
	if (lower.endsWith('.gif')) return 'image/gif'
	if (lower.endsWith('.webp')) return 'image/webp'
	if (lower.endsWith('.bmp')) return 'image/bmp'
	if (lower.endsWith('.svg')) return 'image/svg+xml'
	return 'application/octet-stream'
}

export async function GET(request: NextRequest) {
	let session
	try {
		// Try to get session - handle cases where cookies might not be sent properly
		session = await getServerSession(authOptions)
		
		// For image requests, we need to be more lenient with authentication
		// Images loaded via <img> tags should work if user has a valid session
		if (!session?.user?.id) {
			console.error('[SECURE-STREAM] No session found for image request')
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		// Basic permission gate - allow if user has any view permission
		// This is more lenient for image display
		const hasAnyViewPermission = 
			hasPermission(session.user, 'CANDIDATES_VIEW') || 
			hasPermission(session.user, 'POSITIONS_VIEW') ||
			session.user.role === 'Admin'
		
		if (!hasAnyViewPermission) {
			console.error('[SECURE-STREAM] User lacks required permissions:', session.user.id)
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		}
	} catch (sessionError) {
		console.error('[SECURE-STREAM] Error reading session:', sessionError)
		return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
	}

	// Ensure session is available for rest of function
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const url = new URL(request.url)
	const filePath = url.searchParams.get('filePath') || ''
	const fileName = url.searchParams.get('fileName') || undefined
	const candidateId = url.searchParams.get('candidateId')
	const headcountId = url.searchParams.get('headcountId')

	if (!filePath) {
		return NextResponse.json({ error: 'filePath is required' }, { status: 400 })
	}

	// Contextual authorization
	try {
		if (candidateId) {
			const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { id: true, recruiterId: true } })
			if (!candidate) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
			const hasGlobalEdit = session.user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC') || session.user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE')
			const hasOwnEdit = session.user.modulePermissions?.includes('CANDIDATES_EDIT_BASIC_OWN') || session.user.modulePermissions?.includes('CANDIDATES_EDIT_SENSITIVE_OWN')
			if (session.user.role !== 'Admin' && !hasGlobalEdit && !hasOwnEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
			if (session.user.role !== 'Admin' && !hasGlobalEdit && candidate.recruiterId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		} else if (headcountId) {
			const headcount = await prisma.headcount.findUnique({ where: { id: headcountId }, select: { id: true, position: { select: { recruiterId: true } } } })
			if (!headcount) return NextResponse.json({ error: 'Headcount not found' }, { status: 404 })
			const hasGlobalEdit = session.user.modulePermissions?.includes('POSITIONS_EDIT_BASIC') || session.user.modulePermissions?.includes('POSITIONS_EDIT_SENSITIVE')
			const hasOwnEdit = session.user.modulePermissions?.includes('POSITIONS_EDIT_BASIC_OWN') || session.user.modulePermissions?.includes('POSITIONS_EDIT_SENSITIVE_OWN')
			if (session.user.role !== 'Admin' && !hasGlobalEdit && !hasOwnEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
			if (session.user.role !== 'Admin' && !hasGlobalEdit && headcount.position?.recruiterId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		}
	} catch (authErr) {
		return NextResponse.json({ error: 'Authorization check failed' }, { status: 500 })
	}

	// Range support
	const range = request.headers.get('range')
	const contentType = inferContentType(filePath)
	const objectName = filePath

	try {
		// We need object size to handle ranges. Use statObject for size metadata.
		const stat = await minioClient.statObject(MINIO_BUCKET, objectName)
		const size = stat.size ?? undefined

		if (range && size !== undefined) {
			// Parse bytes=START-END
			const match = /bytes=(\d+)-(\d*)/.exec(range)
			if (match) {
				const start = parseInt(match[1], 10)
				const end = match[2] ? parseInt(match[2], 10) : size - 1
				const chunkSize = end - start + 1
				const stream = await minioClient.getPartialObject(MINIO_BUCKET, objectName, start, chunkSize)
				const headers = new Headers()
				headers.set('Content-Type', contentType)
				headers.set('Content-Length', String(chunkSize))
				headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
				headers.set('Accept-Ranges', 'bytes')
				headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
				headers.set('Pragma', 'no-cache')
				headers.set('Expires', '0')
				// CORS headers to ensure cookies are sent with image requests
				headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*')
				headers.set('Access-Control-Allow-Credentials', 'true')
				headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
				headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie')
				headers.set('Content-Disposition', `inline; filename="${(fileName || objectName).split('/').pop()}"`)
				return new NextResponse(stream as unknown as ReadableStream, { status: 206, headers })
			}
		}

		// Full object
		const stream = await minioClient.getObject(MINIO_BUCKET, objectName)
		const headers = new Headers()
		headers.set('Content-Type', contentType)
		if (size !== undefined) {
			headers.set('Content-Length', String(size))
			headers.set('Accept-Ranges', 'bytes')
		}
		headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
		headers.set('Pragma', 'no-cache')
		headers.set('Expires', '0')
		// CORS headers to ensure cookies are sent with image requests
		headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*')
		headers.set('Access-Control-Allow-Credentials', 'true')
		headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
		headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie')
		headers.set('Content-Disposition', `inline; filename="${(fileName || objectName).split('/').pop()}"`)
		return new NextResponse(stream as unknown as ReadableStream, { status: 200, headers })
	} catch (err) {
		console.error('[SECURE-STREAM] Error streaming object:', err)
		return NextResponse.json({ error: 'Failed to stream file' }, { status: 500 })
	}
}
