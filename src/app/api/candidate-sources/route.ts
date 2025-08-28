import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * @openapi
 * /api/candidate-sources:
 *   get:
 *     summary: Get candidate sources (legacy endpoint)
 *     description: Legacy endpoint that redirects to /api/settings/candidate-sources for backward compatibility.
 *     responses:
 *       200:
 *         description: List of candidate sources
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Forward the request to the correct endpoint
    const response = await fetch(`${request.nextUrl.origin}/api/settings/candidate-sources`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ message: "Error fetching candidate sources" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Failed to fetch candidate sources:", error);
    return NextResponse.json({ message: "Error fetching candidate sources", error: error.message }, { status: 500 });
  }
}

/**
 * @openapi
 * /api/candidate-sources:
 *   post:
 *     summary: Create a candidate source (legacy endpoint)
 *     description: Legacy endpoint that redirects to /api/settings/candidate-sources for backward compatibility.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               email:
 *                 type: string
 *               logo:
 *                 type: string
 *               allowSubSource:
 *                 type: boolean
 *               sortOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Candidate source created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient permissions)
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Forward the request to the correct endpoint
    const response = await fetch(`${request.nextUrl.origin}/api/settings/candidate-sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create candidate source:", error);
    return NextResponse.json({ message: "Error creating candidate source", error: error.message }, { status: 500 });
  }
}
