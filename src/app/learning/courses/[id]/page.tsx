import { CourseExperience } from './CourseExperience';
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  return <CourseExperience courseId={(await params).id} />;
}
