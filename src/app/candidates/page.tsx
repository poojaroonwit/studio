// src/app/candidates/page.tsx - Redirect to applicants
import { redirect } from 'next/navigation';

export default async function CandidatesPageServer() {
  // Redirect to the new applicants page
  redirect('/applicants');
}