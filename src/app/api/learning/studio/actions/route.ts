import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { hasAnyPermission } from '@/lib/permissions';
import { overrideEnrollment, reviewAssignment } from '@/lib/learning/learning-service';

const schema = z.discriminatedUnion('action', [
  z.object({ action:z.literal('review_assignment'),submissionId:z.string().uuid(),approved:z.boolean(),feedback:z.string().max(5000).optional() }),
  z.object({ action:z.literal('override_completion'),enrollmentId:z.string().uuid(),reason:z.string().min(5).max(2000) }),
]);

export async function POST(request: NextRequest) {
  const session=await auth();
  if(!session?.user?.id)return NextResponse.json({message:'Unauthorized'},{status:401});
  if(!hasAnyPermission(session.user,['HR_LEARNING_MANAGE']))return NextResponse.json({message:'Forbidden'},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({message:'Invalid action',errors:parsed.error.flatten()},{status:400});
  try {
    const data=parsed.data.action==='review_assignment'
      ? await reviewAssignment({...parsed.data,reviewerId:session.user.id})
      : await overrideEnrollment({...parsed.data,actorUserId:session.user.id});
    return NextResponse.json({data});
  } catch(error) {
    return NextResponse.json({message:error instanceof Error?error.message:'Unable to complete action'},{status:400});
  }
}
