"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import {
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon,
  BookmarkIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  ExclamationCircleIcon,
  FunnelIcon,
  GlobeAltIcon,
  ListBulletIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  QueueListIcon,
  RectangleGroupIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { FireIcon as FireIconSolid } from "@heroicons/react/24/solid";
import { UsersRound as CourseUsersIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  displayLearningValue as text,
  formatLearningDate as formatDate,
  isActiveLearningCourse as isCourseActive,
  isTrustedLearningCertificate as isTrustedCertificate,
  learningBooleanValue as booleanValue,
  learningCourseColor as courseColor,
  learningDaysUntil as daysUntil,
  learningNumberValue as numberValue,
  learningRecordValue as recordValue,
  learningRecordsFromResponse as getRecords,
  learningStringArrayValue as stringArrayValue,
  normalizeLearningStatus as normalizeStatus,
  withoutEmptyLearningValues as withoutEmptyValues,
} from "@/lib/learning/record-utils";
import {
  certificateFormDefault,
  courseFormDefault,
  learningAssignmentDefault,
  learningPathFormDefault,
  onboardingFormDefault,
  type CareerSnapshot,
  type CertificateForm,
  type CourseForm,
  type CourseWizardSection,
  type CourseWizardSubmission,
  type LearningAssignmentForm,
  type LearningPathForm,
  type LearningRecord,
  type LearningResponse,
  type OnboardingForm,
} from "./learning-workspace-model";
import { HrEmployeeSearchSelect } from "@/components/hr/HrEmployeeSearchSelect";
import { HrisStatusBadge } from "@/components/hris/HrisWorkspacePrimitives";
import {
  getLearningCourseCategoryChildren,
  getLearningCourseCategoryPath,
  parseLearningCourseCategories,
  type LearningCourseCategory,
} from "@/lib/learning-course-categories";
import {
  SortableNativeHeader,
  type SortDirection,
  sortRowsByColumn,
  type SortValueResolverMap,
} from "@/components/ui/sortable-table";
import { AiLearningBuilderDialog } from "./AiLearningBuilderDialog";
import { CareerExplorer } from "./CareerExplorer";
import { TrustedCertificatesWorkspace } from "./TrustedCertificatesWorkspace";

export type LearningView =
  | "overview"
  | "courses"
  | "paths"
  | "achievements"
  | "career-explorer"
  | "certificates"
  | "trusted-certificates"
  | "onboarding";

const learningViewHeaders: Record<
  LearningView,
  { title: string; description: string }
> = {
  overview: {
    title: "Learning overview",
    description:
      "Track courses, enrollments, certifications, and learning progress in one place.",
  },
  courses: {
    title: "Courses",
    description:
      "Build and manage the course catalog available to your workforce.",
  },
  paths: {
    title: "Learning paths",
    description:
      "Group courses into structured development journeys for employees.",
  },
  achievements: {
    title: "Achievements",
    description:
      "Celebrate completed learning, milestones, and earned recognition.",
  },
  "career-explorer": {
    title: "Career Explorer",
    description:
      "Explore realistic career paths that build from your current role and strengths.",
  },
  certificates: {
    title: "Employee certificates",
    description:
      "Record and monitor employee certifications, validity, and renewal dates.",
  },
  "trusted-certificates": {
    title: "Trusted certificates",
    description:
      "Manage verified credentials and the organizations that issued them.",
  },
  onboarding: {
    title: "Learning onboarding",
    description:
      "Guide new employees through required learning and onboarding tasks.",
  },
};

const learningJourneyStops = [
  { view: "courses" as const, label: "Explore", href: "/learning/courses" },
  { view: "paths" as const, label: "Journey", href: "/learning/paths" },
  {
    view: "achievements" as const,
    label: "Celebrate",
    href: "/learning/achievements",
  },
  {
    view: "certificates" as const,
    label: "Credentials",
    href: "/learning/certificates",
  },
];

const learningJourneyCopy: Record<
  Exclude<LearningView, "overview">,
  {
    kicker: string;
    chapter: string;
    encouragement: string;
    nextLabel: string;
    nextHref: string;
  }
> = {
  onboarding: {
    kicker: "Base Camp",
    chapter: "Chapter 1",
    encouragement: "Turn every first week into a confident beginning.",
    nextLabel: "Explore courses",
    nextHref: "/learning/courses",
  },
  courses: {
    kicker: "Explore new skills",
    chapter: "Chapter 1",
    encouragement: "Pick a skill, follow your curiosity, and keep moving.",
    nextLabel: "Build a learning path",
    nextHref: "/learning/paths",
  },
  paths: {
    kicker: "The Trail Map",
    chapter: "Chapter 2",
    encouragement: "Small, ordered steps make ambitious growth feel possible.",
    nextLabel: "See achievements",
    nextHref: "/learning/achievements",
  },
  achievements: {
    kicker: "The Summit",
    chapter: "Chapter 3",
    encouragement: "Every finished lesson leaves a mark worth celebrating.",
    nextLabel: "View credentials",
    nextHref: "/learning/certificates",
  },
  "career-explorer": {
    kicker: "Choose your route",
    chapter: "Career growth",
    encouragement:
      "Start with your strengths and explore where they could take you next.",
    nextLabel: "View learning paths",
    nextHref: "/learning/paths",
  },
  certificates: {
    kicker: "Expedition Passport",
    chapter: "Chapter 4",
    encouragement:
      "Keep hard-earned skills visible, trusted, and ready to share.",
    nextLabel: "Trusted credentials",
    nextHref: "/learning/trusted-certificates",
  },
  "trusted-certificates": {
    kicker: "Verified Collection",
    chapter: "Credential desk",
    encouragement: "A clear source of truth for qualifications that matter.",
    nextLabel: "Back to Learning Home",
    nextHref: "/learning",
  },
};

export function LearningPageClient({ view }: { view: LearningView }) {
  const [courses, setCourses] = React.useState<LearningRecord[]>([]);
  const [enrollments, setEnrollments] = React.useState<LearningRecord[]>([]);
  const [certificates, setCertificates] = React.useState<LearningRecord[]>([]);
  const [learningPaths, setLearningPaths] = React.useState<LearningRecord[]>(
    [],
  );
  const [careerSnapshot, setCareerSnapshot] =
    React.useState<CareerSnapshot | null>(null);
  const [onboardingCases, setOnboardingCases] = React.useState<
    LearningRecord[]
  >([]);
  const [onboardingTemplates, setOnboardingTemplates] = React.useState<
    LearningRecord[]
  >([]);
  const [onboardingTasks, setOnboardingTasks] = React.useState<
    LearningRecord[]
  >([]);
  const [metrics, setMetrics] = React.useState<LearningResponse["metrics"]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [removingCourseId, setRemovingCourseId] = React.useState<string | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [courseDialogOpen, setCourseDialogOpen] = React.useState(false);
  const [certificateDialogOpen, setCertificateDialogOpen] =
    React.useState(false);
  const [trustedCreateMode, setTrustedCreateMode] = React.useState<
    "issuer" | "credential"
  >("credential");
  const [onboardingDialogOpen, setOnboardingDialogOpen] = React.useState(false);
  const [learningPathDialogOpen, setLearningPathDialogOpen] =
    React.useState(false);
  const [learningAssignmentDialogOpen, setLearningAssignmentDialogOpen] =
    React.useState(false);
  const [aiBuilderOpen, setAiBuilderOpen] = React.useState(false);
  const [editingLearningPathId, setEditingLearningPathId] = React.useState<
    string | null
  >(null);
  const [courseForm, setCourseForm] =
    React.useState<CourseForm>(courseFormDefault);
  const [certificateForm, setCertificateForm] = React.useState<CertificateForm>(
    certificateFormDefault,
  );
  const [onboardingForm, setOnboardingForm] = React.useState<OnboardingForm>(
    onboardingFormDefault,
  );
  const [learningPathForm, setLearningPathForm] =
    React.useState<LearningPathForm>(learningPathFormDefault);
  const [learningAssignmentForm, setLearningAssignmentForm] =
    React.useState<LearningAssignmentForm>(learningAssignmentDefault);
  const [courseCategories, setCourseCategories] = React.useState<
    LearningCourseCategory[]
  >([]);

  const loadCourseCategories = React.useCallback(async () => {
    try {
      const response = await fetch(
        "/api/settings/system-settings?keys=learningCourseCategories",
        { credentials: "include", cache: "no-store" },
      );
      const payload = (await response.json()) as {
        learningCourseCategories?: string;
      };
      setCourseCategories(
        response.ok
          ? parseLearningCourseCategories(payload.learningCourseCategories)
          : parseLearningCourseCategories(undefined),
      );
    } catch {
      // The parser provides the product defaults when the setting is unavailable.
      setCourseCategories(parseLearningCourseCategories(undefined));
    }
  }, []);

  const loadLearning = React.useCallback(async () => {
    if (view === "career-explorer") {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (view === "onboarding") {
        const responses = await Promise.all([
          fetch("/api/hr/onboarding", { credentials: "include" }),
          fetch("/api/hr/onboarding?view=templates", {
            credentials: "include",
          }),
          fetch("/api/hr/onboarding?view=tasks", { credentials: "include" }),
        ]);
        if (!responses[0].ok)
          throw new Error("Unable to load onboarding data.");
        const payloads = await Promise.all(
          responses.map(async (response): Promise<LearningResponse> =>
            response.ok ? (response.json() as Promise<LearningResponse>) : {},
          ),
        );
        setMetrics(payloads[0].metrics || []);
        setOnboardingCases(getRecords(payloads[0]));
        setOnboardingTemplates(getRecords(payloads[1]));
        setOnboardingTasks(getRecords(payloads[2]));
        return;
      }

      if (view === "certificates" || view === "trusted-certificates") {
        const response = await fetch("/api/hr/learning?view=certifications", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Unable to load certificate data.");
        const payload = (await response.json()) as LearningResponse;
        setCertificates(getRecords(payload));
        return;
      }

      const requests = [
        fetch("/api/hr/learning", { credentials: "include" }),
        fetch("/api/hr/learning?view=courses", { credentials: "include" }),
        fetch("/api/hr/learning?view=certifications", {
          credentials: "include",
        }),
      ];
      if (view === "paths")
        requests.push(
          fetch("/api/hr/learning?view=paths", { credentials: "include" }),
        );
      const responses = await Promise.all(requests);
      if (!responses[0].ok) throw new Error("Unable to load learning data.");
      const payloads = await Promise.all(
        responses.map(async (response): Promise<LearningResponse> =>
          response.ok ? (response.json() as Promise<LearningResponse>) : {},
        ),
      );
      setMetrics(payloads[0].metrics || []);
      setEnrollments(getRecords(payloads[0]));
      setCourses(getRecords(payloads[1]));
      setCertificates(getRecords(payloads[2]));
      setLearningPaths(getRecords(payloads[3] || {}));
      if (view === "achievements") {
        const careerResponse = await fetch("/api/learning/career-explorer", {
          credentials: "include",
          cache: "no-store",
        });
        const careerPayload = (await careerResponse
          .json()
          .catch(() => null)) as { data?: CareerSnapshot | null } | null;
        setCareerSnapshot(
          careerResponse.ok ? careerPayload?.data || null : null,
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load learning data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [view]);

  React.useEffect(() => {
    void loadLearning();
  }, [loadLearning]);

  React.useEffect(() => {
    if (view !== "career-explorer") void loadCourseCategories();
  }, [loadCourseCategories, view]);

  const submitCourse = async ({
    coverFile,
    sections,
  }: CourseWizardSubmission) => {
    if (!courseForm.title.trim()) {
      throw new Error("Course title is required.");
    }
    if (!courseForm.category.trim()) {
      throw new Error("Choose a course category.");
    }
    setIsSaving(true);
    setError(null);
    try {
      let coverImageUrl = "";
      if (coverFile) {
        const uploadBody = new FormData();
        uploadBody.append("file", coverFile);
        uploadBody.append("type", "learning-course-cover");
        const uploadResponse = await fetch("/api/upload-image", {
          method: "POST",
          credentials: "include",
          body: uploadBody,
        });
        const uploadPayload = (await uploadResponse
          .json()
          .catch(() => null)) as { url?: string; error?: string } | null;
        if (!uploadResponse.ok || !uploadPayload?.url)
          throw new Error(
            uploadPayload?.error || "Unable to upload the course cover.",
          );
        coverImageUrl = uploadPayload.url;
      }
      const response = await fetch("/api/hr/learning?view=courses", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          withoutEmptyValues({ ...courseForm, coverImageUrl }),
        ),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: { id?: string };
        message?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to create course.");
      }
      const courseId = payload?.data?.id;
      if (!courseId)
        throw new Error("The course was created without a valid identifier.");
      const curriculumResponse = await fetch(
        `/api/learning/studio/courses/${encodeURIComponent(courseId)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publish: courseForm.isActive === "true",
            rules: {},
            sections: sections.map((section, index) => ({
              title: section.title.trim() || `Section ${index + 1}`,
              lessons: [
                {
                  title:
                    section.lessonTitle.trim() ||
                    section.title.trim() ||
                    `Lesson ${index + 1}`,
                  description: section.description.trim(),
                  estimatedMinutes: Math.max(
                    5,
                    Math.round(
                      (numberValue(courseForm.durationHours) * 60) /
                        Math.max(1, sections.length),
                    ),
                  ),
                  minimumActiveSeconds: 0,
                  blocks: [
                    {
                      type: "text",
                      title: section.lessonTitle.trim() || section.title.trim(),
                      required: true,
                      content: {
                        text:
                          section.description.trim() ||
                          "Add teaching content in Course Studio.",
                      },
                    },
                  ],
                },
              ],
            })),
          }),
        },
      );
      if (!curriculumResponse.ok) {
        const curriculumPayload = (await curriculumResponse
          .json()
          .catch(() => null)) as { message?: string } | null;
        throw new Error(
          curriculumPayload?.message ||
            "Course created, but its curriculum could not be saved.",
        );
      }
      setCourseDialogOpen(false);
      setCourseForm(courseFormDefault);
      await loadLearning();
      return courseId;
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Unable to create course.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const removeCourse = async (course: LearningRecord) => {
    const title = text(course.title, "this course");
    if (
      !window.confirm(
        `Remove “${title}” from the course catalog? Existing learning history will be preserved.`,
      )
    )
      return;

    setRemovingCourseId(course.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/hr/learning?view=courses&id=${encodeURIComponent(course.id)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message || "Unable to remove course.");
      }
      await loadLearning();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove course.",
      );
    } finally {
      setRemovingCourseId(null);
    }
  };

  const submitCertificate = async () => {
    const isTrustedRegistration = view === "trusted-certificates";
    if (
      !certificateForm.name.trim() ||
      (!isTrustedRegistration && !certificateForm.employeeId.trim())
    ) {
      setError(
        isTrustedRegistration
          ? "Certificate name is required."
          : "Employee ID and certificate name are required.",
      );
      return;
    }
    if (
      isTrustedRegistration &&
      (!certificateForm.issuer.trim() ||
        !certificateForm.category.trim() ||
        !certificateForm.verificationUrl.trim())
    ) {
      setError(
        "Issuer, category, and official verification URL are required for a trusted policy.",
      );
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/hr/learning?view=certifications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...withoutEmptyValues({
            ...certificateForm,
            employeeId: isTrustedRegistration ? "" : certificateForm.employeeId,
            issuedAt: isTrustedRegistration ? "" : certificateForm.issuedAt,
            expiresAt: isTrustedRegistration ? "" : certificateForm.expiresAt,
            validityMonths: isTrustedRegistration
              ? certificateForm.validityMonths
              : "",
            verificationUrl: isTrustedRegistration
              ? certificateForm.verificationUrl
              : "",
            category: "",
            renewalRequirement: "",
            credentialIdPattern: "",
            geographicCoverage: "",
            policyOwner: "",
            approvedOn: "",
            nextReviewAt: "",
            verificationRequirements: "",
            policyChangeNote: "",
          }),
          recordType: isTrustedRegistration ? "trusted" : "employee",
          verificationStatus: isTrustedRegistration ? "verified" : "pending",
          ...(isTrustedRegistration
            ? {
                verifiedAt:
                  certificateForm.approvedOn ||
                  new Date().toISOString().slice(0, 10),
                policyMetadata: {
                  category: certificateForm.category.trim(),
                  renewalRequirement: certificateForm.renewalRequirement,
                  credentialIdPattern:
                    certificateForm.credentialIdPattern.trim(),
                  geographicCoverage:
                    certificateForm.geographicCoverage.trim() || "Global",
                  policyOwner: certificateForm.policyOwner.trim(),
                  approvedOn:
                    certificateForm.approvedOn ||
                    new Date().toISOString().slice(0, 10),
                  nextReviewAt: certificateForm.nextReviewAt || null,
                  verificationRequirements:
                    certificateForm.verificationRequirements
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  policyChangeNote: certificateForm.policyChangeNote.trim(),
                },
              }
            : {}),
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message || "Unable to add certificate.");
      }
      setCertificateDialogOpen(false);
      setCertificateForm(certificateFormDefault);
      await loadLearning();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to add certificate.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateCertificateVerification = async (
    certificateId: string,
    verificationStatus: "verified" | "rejected",
  ) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/hr/learning?view=certifications&id=${encodeURIComponent(certificateId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificationStatus }),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message ||
            `Unable to ${verificationStatus === "verified" ? "verify the certificate" : "request certificate changes"}.`,
        );
      }
      await loadLearning();
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Unable to update certificate verification.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const verifyCertificate = async (certificateId: string) =>
    updateCertificateVerification(certificateId, "verified");
  const requestCertificateChanges = async (certificateId: string) =>
    updateCertificateVerification(certificateId, "rejected");

  const updateTrustedCertificate = async (
    certificateId: string,
    patch: Record<string, unknown>,
  ) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/hr/learning?view=certifications&id=${encodeURIComponent(certificateId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message || "Unable to update the trust policy.",
        );
      }
      await loadLearning();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update the trust policy.",
      );
      throw updateError;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTrustedCertificate = async (certificateId: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/hr/learning?view=certifications&id=${encodeURIComponent(certificateId)}&permanent=true`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message || "Unable to delete the trust policy.",
        );
      }
      await loadLearning();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the trust policy.",
      );
      throw deleteError;
    } finally {
      setIsSaving(false);
    }
  };

  const openTrustedCreate = (options?: {
    mode?: "issuer" | "credential";
    issuer?: string;
  }) => {
    setTrustedCreateMode(options?.mode || "credential");
    setCertificateForm({
      ...certificateFormDefault,
      issuer: options?.issuer || "",
    });
    setCertificateDialogOpen(true);
  };

  const submitOnboarding = async () => {
    if (!onboardingForm.employeeId.trim()) {
      setError("Employee ID is required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/hr/onboarding", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(withoutEmptyValues(onboardingForm)),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message || "Unable to start onboarding.");
      }
      setOnboardingDialogOpen(false);
      setOnboardingForm(onboardingFormDefault);
      await loadLearning();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to start onboarding.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openNewLearningPath = () => {
    setEditingLearningPathId(null);
    setLearningPathForm(learningPathFormDefault);
    setError(null);
    setLearningPathDialogOpen(true);
  };

  const openEditLearningPath = (path: LearningRecord) => {
    setEditingLearningPathId(path.id);
    setLearningPathForm({
      title: text(path.title, ""),
      description: text(path.description, ""),
      status: normalizeStatus(path.status),
      courseIds: stringArrayValue(recordValue(path, "courseIds", "course_ids")),
    });
    setError(null);
    setLearningPathDialogOpen(true);
  };

  const submitLearningPath = async () => {
    if (!learningPathForm.title.trim()) {
      setError("Path title is required.");
      return;
    }
    if (!learningPathForm.courseIds.length) {
      setError("Choose at least one course for this path.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const query = new URLSearchParams({ view: "paths" });
      if (editingLearningPathId) query.set("id", editingLearningPathId);
      const response = await fetch(`/api/hr/learning?${query.toString()}`, {
        method: editingLearningPathId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(learningPathForm),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          payload?.message ||
            `Unable to ${editingLearningPathId ? "update" : "create"} learning path.`,
        );
      }
      setLearningPathDialogOpen(false);
      setEditingLearningPathId(null);
      setLearningPathForm(learningPathFormDefault);
      await loadLearning();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save learning path.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openLearningAssignment = (courseIds: string[], sourceLabel: string) => {
    setLearningAssignmentForm({
      employeeId: "",
      courseIds,
      dueDate: "",
      sourceLabel,
    });
    setError(null);
    setLearningAssignmentDialogOpen(true);
  };

  const submitLearningAssignment = async () => {
    if (!learningAssignmentForm.employeeId) {
      setError("Choose an employee to assign this learning.");
      return;
    }
    if (!learningAssignmentForm.courseIds.length) {
      setError("This learning item has no active courses to assign.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const failures: string[] = [];
      for (const courseId of learningAssignmentForm.courseIds) {
        const response = await fetch("/api/hr/learning", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            withoutEmptyValues({
              employeeId: learningAssignmentForm.employeeId,
              courseId,
              status: "assigned",
              progress: 0,
              dueDate: learningAssignmentForm.dueDate,
            }),
          ),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          failures.push(payload?.message || "Unable to assign a course.");
        }
      }
      if (failures.length) throw new Error(failures[0]);
      setLearningAssignmentDialogOpen(false);
      setLearningAssignmentForm(learningAssignmentDefault);
      await loadLearning();
    } catch (assignmentError) {
      setError(
        assignmentError instanceof Error
          ? assignmentError.message
          : "Unable to assign learning.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const primaryAction =
    view === "certificates" || view === "trusted-certificates"
      ? () => setCertificateDialogOpen(true)
      : view === "onboarding"
        ? () => setOnboardingDialogOpen(true)
        : view === "paths"
          ? openNewLearningPath
          : () => setCourseDialogOpen(true);
  const primaryLabel =
    view === "trusted-certificates"
      ? "Register trusted certificate"
      : view === "certificates"
        ? "Add employee certificate"
        : view === "onboarding"
          ? "Start onboarding"
          : view === "paths"
            ? "Create path"
            : view === "overview" || view === "courses"
              ? "Create course"
              : "Add course";
  const pageHeader = learningViewHeaders[view];

  return (
    <main
      className={cn(
        "min-h-full w-full max-w-none text-slate-950 dark:text-zinc-50",
        view !== "overview" &&
          view !== "courses" &&
          view !== "achievements" &&
          view !== "career-explorer" &&
          view !== "certificates" &&
          view !== "trusted-certificates" &&
          "bg-[#f6f8fc] px-4 py-6 dark:bg-zinc-950 sm:px-6 lg:px-8",
        (view === "courses" ||
          view === "achievements" ||
          view === "career-explorer" ||
          view === "certificates" ||
          view === "trusted-certificates") &&
          "bg-[#fbfaf6] dark:bg-zinc-950",
      )}
    >
      <div
        className={cn(
          "flex w-full max-w-none flex-col",
          view === "overview" ||
            view === "courses" ||
            view === "achievements" ||
            view === "career-explorer" ||
            view === "certificates" ||
            view === "trusted-certificates"
            ? "gap-0"
            : "gap-6",
        )}
      >
        {view !== "overview" &&
          view !== "courses" &&
          view !== "paths" &&
          view !== "achievements" &&
          view !== "career-explorer" &&
          view !== "certificates" &&
          view !== "trusted-certificates" && (
            <LearningJourneyHeader
              view={view}
              title={pageHeader.title}
              description={pageHeader.description}
              primaryLabel={primaryLabel}
              onPrimaryAction={primaryAction}
            />
          )}

        {error && (
          <div
            role="alert"
            className={cn(
              "rounded-[8px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
              view === "overview" && "mx-4 mt-4 sm:mx-6 lg:mx-8",
            )}
          >
            {error}
          </div>
        )}

        {isLoading && view !== "career-explorer" ? (
          <div className={cn(view === "overview" && "p-4 sm:p-6 lg:p-8")}>
            <LoadingSurface />
          </div>
        ) : view === "overview" ? (
          <LearningOverview
            courses={courses}
            enrollments={enrollments}
            certificates={certificates}
            metrics={metrics || []}
          />
        ) : view === "courses" ? (
          <CourseCatalog
            courses={courses}
            enrollments={enrollments}
            onAddNew={() => setCourseDialogOpen(true)}
            onAiCreate={() => setAiBuilderOpen(true)}
            onRemove={(course) => void removeCourse(course)}
            onAssign={(course) =>
              openLearningAssignment([course.id], text(course.title, "Course"))
            }
            removingCourseId={removingCourseId}
          />
        ) : view === "paths" ? (
          <LearningPaths
            paths={learningPaths}
            courses={courses}
            enrollments={enrollments}
            onCreatePath={openNewLearningPath}
            onConfigurePath={openEditLearningPath}
            onAssignPath={(path) =>
              openLearningAssignment(
                stringArrayValue(recordValue(path, "courseIds", "course_ids")),
                text(path.title, "Learning path"),
              )
            }
            onAiCreate={() => setAiBuilderOpen(true)}
          />
        ) : view === "achievements" ? (
          <AchievementJourney
            courses={courses}
            enrollments={enrollments}
            certificates={certificates}
            career={careerSnapshot}
          />
        ) : view === "career-explorer" ? (
          <CareerExplorer />
        ) : view === "trusted-certificates" ? (
          <TrustedCertificatesWorkspace
            certificates={certificates}
            isSaving={isSaving}
            onAdd={openTrustedCreate}
            onUpdate={updateTrustedCertificate}
            onDelete={deleteTrustedCertificate}
          />
        ) : view === "certificates" ? (
          <CertificateRegister
            certificates={certificates}
            mode="employee"
            isSaving={isSaving}
            onAdd={() => setCertificateDialogOpen(true)}
            onVerify={(certificateId) => void verifyCertificate(certificateId)}
            onRequestChanges={(certificateId) =>
              void requestCertificateChanges(certificateId)
            }
          />
        ) : (
          <OnboardingWorkspace
            cases={onboardingCases}
            templates={onboardingTemplates}
            tasks={onboardingTasks}
            metrics={metrics || []}
          />
        )}
      </div>

      <CourseDialog
        open={courseDialogOpen}
        onOpenChange={setCourseDialogOpen}
        form={courseForm}
        setForm={setCourseForm}
        categories={courseCategories}
        isSaving={isSaving}
        onSubmit={submitCourse}
      />
      <CertificateDialog
        open={certificateDialogOpen}
        onOpenChange={setCertificateDialogOpen}
        form={certificateForm}
        setForm={setCertificateForm}
        isSaving={isSaving}
        trusted={view === "trusted-certificates"}
        trustedCreateMode={trustedCreateMode}
        onSubmit={() => void submitCertificate()}
      />
      <OnboardingDialog
        open={onboardingDialogOpen}
        onOpenChange={setOnboardingDialogOpen}
        form={onboardingForm}
        setForm={setOnboardingForm}
        isSaving={isSaving}
        onSubmit={() => void submitOnboarding()}
      />
      <LearningPathDialog
        open={learningPathDialogOpen}
        onOpenChange={setLearningPathDialogOpen}
        form={learningPathForm}
        setForm={setLearningPathForm}
        courses={courses}
        isSaving={isSaving}
        isEditing={Boolean(editingLearningPathId)}
        onSubmit={() => void submitLearningPath()}
      />
      <LearningAssignmentDialog
        open={learningAssignmentDialogOpen}
        onOpenChange={setLearningAssignmentDialogOpen}
        form={learningAssignmentForm}
        setForm={setLearningAssignmentForm}
        isSaving={isSaving}
        onSubmit={() => void submitLearningAssignment()}
      />
      <AiLearningBuilderDialog
        open={aiBuilderOpen}
        onOpenChange={setAiBuilderOpen}
        initialType={view === "paths" ? "path" : "course"}
        onCreated={() => void loadLearning()}
      />
    </main>
  );
}

function LearningJourneyHeader({
  view,
  title,
  description,
  primaryLabel,
  onPrimaryAction,
  onAiCreate,
}: {
  view: Exclude<LearningView, "overview">;
  title: string;
  description: string;
  primaryLabel: string;
  onPrimaryAction: () => void;
  onAiCreate?: () => void;
}) {
  const copy = learningJourneyCopy[view];
  const activeStop = learningJourneyStops.findIndex(
    (stop) => stop.view === view,
  );
  const HeaderIcon =
    view === "onboarding"
      ? UserGroupIcon
      : view === "courses"
        ? BookOpenIcon
        : view === "paths"
          ? MapPinIcon
          : view === "achievements"
            ? TrophyIcon
            : CheckBadgeIcon;

  return (
    <header className="relative isolate overflow-hidden rounded-[24px] border border-[#dbe3eb] bg-[#f8f4ec] shadow-[0_18px_45px_rgba(30,48,87,0.09)] dark:border-zinc-800 dark:bg-zinc-900">
      <Image
        src="/learning/adventure-trail-hero.png"
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className="z-0 object-cover object-[62%_48%] dark:brightness-[.58] dark:saturate-[.72]"
      />
      <div
        className="absolute inset-0 z-[1] bg-gradient-to-r from-[#fbfaf6] via-[#fbfaf6]/95 to-[#fbfaf6]/10 dark:from-zinc-950 dark:via-zinc-950/92 dark:to-zinc-950/5"
        aria-hidden="true"
      />

      <div className="relative z-10 grid min-h-[286px] lg:grid-cols-[minmax(0,1fr)_42%]">
        <div className="flex flex-col justify-center px-6 py-9 sm:px-8 lg:px-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-[#5873a4] dark:text-blue-300">
            <span>{copy.chapter}</span>
            <span className="h-1 w-1 rounded-full bg-current opacity-50" />
            <span>{copy.kicker}</span>
          </div>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.04] tracking-[-0.045em] text-[#172033] dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-6 text-[#66758a] dark:text-zinc-300">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={onPrimaryAction}
              className="h-11 rounded-lg bg-[#316be8] px-5 font-semibold shadow-md shadow-indigo-950/15 transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#285dce]"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              {primaryLabel}
            </Button>
            {onAiCreate && (
              <Button
                type="button"
                variant="outline"
                onClick={onAiCreate}
                className="h-11 rounded-lg border-[#b9c9d8] bg-white/75 px-4 font-semibold text-[#244b44] shadow-sm backdrop-blur-sm hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/75 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                <SparklesIcon className="mr-2 h-4 w-4 text-[#316be8]" />
                Create with AI
              </Button>
            )}
            <Link
              href={copy.nextHref}
              className="group inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-[#3e5169] transition-colors hover:bg-white/70 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
            >
              {copy.nextLabel}
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="relative hidden items-center justify-center px-8 lg:flex">
          <div
            className="absolute left-[18%] top-[34%] h-24 border-l-2 border-dashed border-white/85"
            aria-hidden="true"
          />
          <div className="relative -mt-8 grid h-20 w-16 place-items-center text-[#316be8] drop-shadow-lg">
            <MapPinIcon className="absolute h-20 w-20 fill-white stroke-[1.5]" />
            <HeaderIcon className="relative -mt-5 h-7 w-7 stroke-[1.7]" />
          </div>
          <p className="absolute bottom-5 right-6 max-w-[250px] rounded-xl bg-[#172033]/90 px-4 py-3 text-sm font-medium leading-5 text-white shadow-xl backdrop-blur-sm">
            {copy.encouragement}
          </p>
        </div>
      </div>

      <nav
        aria-label="Learning journey"
        className="relative z-10 flex overflow-x-auto border-t border-slate-200/80 bg-white/95 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-6"
      >
        {learningJourneyStops.map((stop, index) => {
          const isActive = stop.view === view;
          const isComplete =
            activeStop > index || view === "trusted-certificates";
          return (
            <React.Fragment key={stop.view}>
              {index > 0 && (
                <span
                  className={cn(
                    "mt-3 h-px min-w-4 flex-1 border-t border-dashed",
                    isComplete || isActive
                      ? "border-[#6e8ed6]"
                      : "border-slate-300 dark:border-zinc-700",
                  )}
                  aria-hidden="true"
                />
              )}
              <Link
                href={stop.href}
                aria-current={isActive ? "page" : undefined}
                className="group flex shrink-0 items-center gap-2 px-2 text-xs font-semibold text-slate-500 dark:text-zinc-400"
              >
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full border text-[10px] transition-transform duration-200 group-hover:scale-110",
                    isActive
                      ? "border-[#316be8] bg-[#316be8] text-white shadow-sm shadow-indigo-500/30"
                      : isComplete
                        ? "border-[#4db78a] bg-[#4db78a] text-white"
                        : "border-slate-300 bg-white dark:border-zinc-600 dark:bg-zinc-900",
                  )}
                >
                  {isComplete ? (
                    <CheckIcon className="h-3.5 w-3.5 stroke-[2.5]" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(isActive && "text-slate-950 dark:text-white")}
                >
                  {stop.label}
                </span>
              </Link>
            </React.Fragment>
          );
        })}
      </nav>
    </header>
  );
}

function LearningOverview({
  courses,
  enrollments,
  certificates,
  metrics,
}: {
  courses: LearningRecord[];
  enrollments: LearningRecord[];
  certificates: LearningRecord[];
  metrics: Array<{ label: string; value: string | number; helper?: string }>;
}) {
  const completed = enrollments.filter(
    (item) => normalizeStatus(item.status) === "completed",
  ).length;
  const inProgress = enrollments.filter(
    (item) => normalizeStatus(item.status) === "in_progress",
  );
  const currentEnrollment =
    inProgress[0] ||
    enrollments.find((item) => normalizeStatus(item.status) !== "completed");
  const currentCourse =
    courses.find(
      (course) =>
        course.id ===
        recordValue(currentEnrollment || {}, "courseId", "course_id"),
    ) || courses.find(isCourseActive);
  const progressValue = currentEnrollment
    ? Math.min(100, Math.max(0, numberValue(currentEnrollment.progress)))
    : 65;
  const currentTitle = text(currentCourse?.title, "Confident Conversations");
  const currentLesson = text(
    recordValue(
      currentEnrollment || {},
      "currentLessonTitle",
      "current_lesson_title",
    ),
    "Giving feedback that lands",
  );
  const continueHref = currentCourse?.id
    ? `/learning/courses/${currentCourse.id}`
    : "/learning/courses";
  const availableNext = courses
    .filter(
      (course) => course.id !== currentCourse?.id && isCourseActive(course),
    )
    .slice(0, 2);
  const upNext = [
    {
      title: text(
        availableNext[0]?.title,
        "Navigating difficult conversations",
      ),
      description: text(
        availableNext[0]?.description,
        "Approach challenging conversations with confidence and clarity.",
      ),
      minutes: 22,
      color: "bg-[#ef7448]",
      step: 6,
      href: availableNext[0]?.id
        ? `/learning/courses/${availableNext[0].id}`
        : "/learning/courses",
    },
    {
      title: text(availableNext[1]?.title, "Coaching for growth"),
      description: text(
        availableNext[1]?.description,
        "Help your team set goals and take action.",
      ),
      minutes: 20,
      color: "bg-[#e7ad35]",
      step: 7,
      href: availableNext[1]?.id
        ? `/learning/courses/${availableNext[1].id}`
        : "/learning/paths",
    },
  ];
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  const completionCopy =
    completed > 0
      ? `${completed} course${completed === 1 ? "" : "s"} completed so far.`
      : "Your first milestone is closer than it looks.";

  return (
    <div className="bg-[#f7f9fc] font-sans text-slate-950 [font-feature-settings:'kern','liga'] [font-kerning:normal]">
      <section className="relative isolate min-h-[610px] overflow-hidden border-b border-slate-200">
        <Image
          src="/learning/adventure-trail-hero.png"
          alt="A mountain trail winding toward a summit"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="z-0 object-cover object-center"
        />
        <div
          className="absolute inset-0 z-[1] bg-white/10"
          aria-hidden="true"
        />

        <div className="mx-auto grid min-h-[610px] w-full max-w-[1600px] items-center px-4 py-12 sm:px-6 lg:grid-cols-[minmax(420px,640px)_1fr] lg:px-10 xl:px-14">
          <div className="relative z-10">
            <p className="text-sm font-medium leading-5 text-[#5873a4]">
              {dateLabel}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-[#172033] sm:text-[2.875rem]">
              Adventure Trail
            </h1>
            <p className="mt-3 text-xl font-normal leading-7 tracking-[-0.015em] text-slate-600 sm:text-[1.375rem]">
              Grow your skills. Achieve more together.
            </p>

            <article className="mt-8 rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur sm:p-7">
              <p className="text-xs font-bold uppercase leading-4 tracking-[0.06em] text-[#316be8]">
                Pick up where you left off
              </p>
              <div className="mt-4 flex items-start gap-4 border-b border-slate-200 pb-5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#637bea] text-white shadow-sm">
                  <CourseUsersIcon className="h-7 w-7 stroke-[1.6]" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-[1.375rem] font-semibold leading-7 tracking-[-0.02em] text-[#172033]">
                    {currentTitle}
                  </h2>
                  <p className="mt-1 text-base font-normal leading-6 text-slate-500">
                    Course
                  </p>
                </div>
              </div>

              <div className="grid gap-6 pt-5 sm:grid-cols-[minmax(0,1fr)_190px]">
                <div>
                  <p className="text-sm font-normal leading-5 text-slate-500">
                    Current lesson
                  </p>
                  <h3 className="mt-1 text-xl font-semibold leading-7 tracking-[-0.015em] text-[#172033]">
                    {currentLesson}
                  </h3>
                  <p className="mt-2 max-w-[38ch] text-base font-normal leading-6 text-slate-600">
                    Learn how to deliver feedback that inspires action and
                    builds trust.
                  </p>
                </div>
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <p className="text-sm font-normal leading-5 text-slate-500">
                      Your progress
                    </p>
                    <p className="text-[1.75rem] font-bold leading-none tabular-nums text-[#316be8]">
                      {progressValue}%
                    </p>
                  </div>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
                    role="progressbar"
                    aria-label="Course progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressValue}
                  >
                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-5 text-base font-medium leading-6 text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <ClockIcon className="h-5 w-5 stroke-[1.7]" />
                    18 min
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <BookmarkIcon className="h-5 w-5 stroke-[1.7]" />
                    Lesson 5 of 8
                  </span>
                </div>
                <Button
                  asChild
                  className="h-12 rounded-lg bg-[#316be8] px-5 text-base font-semibold shadow-md shadow-indigo-950/15 hover:bg-[#285dce] focus-visible:ring-indigo-500"
                >
                  <Link href={continueHref}>
                    Continue learning{" "}
                    <ArrowRightIcon className="ml-2 h-5 w-5 stroke-2" />
                  </Link>
                </Button>
              </div>
            </article>
          </div>

          <div
            className="pointer-events-none relative z-10 hidden h-full lg:block"
            aria-hidden="true"
          >
            {[
              {
                step: 5,
                className: "left-[18%] top-[55%]",
                color: "text-indigo-600",
              },
              {
                step: 6,
                className: "left-[47%] top-[40%]",
                color: "text-[#ef7448]",
              },
              {
                step: 7,
                className: "left-[67%] top-[27%]",
                color: "text-[#e7ad35]",
              },
              {
                step: 8,
                className: "left-[83%] top-[9%]",
                color: "text-emerald-600",
              },
            ].map((marker) => (
              <div
                key={marker.step}
                className={cn(
                  "absolute grid h-16 w-12 place-items-center drop-shadow-lg",
                  marker.className,
                )}
              >
                <MapPinIcon
                  className={cn(
                    "absolute h-16 w-16 fill-white stroke-[1.5]",
                    marker.color,
                  )}
                />
                <span
                  className={cn(
                    "relative -mt-4 text-sm font-black",
                    marker.color,
                  )}
                >
                  {marker.step}
                </span>
              </div>
            ))}
            <div className="absolute bottom-[7%] right-[5%] max-w-64 rounded-xl bg-slate-950/90 px-5 py-4 text-white shadow-xl backdrop-blur">
              <div className="flex gap-3">
                <SparklesIcon className="mt-0.5 h-6 w-6 shrink-0 stroke-[1.7] text-slate-100" />
                <div>
                  <p className="text-base font-semibold leading-6">
                    Keep going!
                  </p>
                  <p className="mt-1 text-sm font-normal leading-5 text-slate-200">
                    {completionCopy}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1600px] gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 xl:px-14">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <FireIconSolid className="h-5 w-5 text-[#f48a5b]" />
            <h2 className="text-base font-semibold leading-6">
              Learning streak
            </h2>
          </div>
          <p className="mt-5 text-base font-semibold leading-6">
            4 of 5 days this week
          </p>
          <p className="mt-1 text-sm font-normal leading-5 text-slate-500">
            Nice work—keep the streak alive!
          </p>
          <div className="mt-6 grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
              (day, index) => (
                <div key={day} className="text-center">
                  <span
                    className={cn(
                      "mx-auto grid h-9 w-9 place-items-center rounded-full border text-white",
                      index < 4
                        ? "border-emerald-500 bg-emerald-500"
                        : index === 4
                          ? "border-dashed border-slate-400 bg-white text-slate-400"
                          : "border-slate-100 bg-slate-100 text-slate-300",
                    )}
                  >
                    {index < 4 ? (
                      <CheckIcon className="h-5 w-5 stroke-[2.5]" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span className="mt-2 block text-sm font-normal leading-5 text-slate-600">
                    {day}
                  </span>
                </div>
              ),
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <QueueListIcon className="h-5 w-5 stroke-[1.7] text-slate-600" />
                <h2 className="text-base font-semibold leading-6">Up next</h2>
              </div>
              <p className="mt-1 text-sm font-normal leading-5 text-slate-500">
                Your upcoming lessons
              </p>
            </div>
            <Link
              href="/learning/paths"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
            >
              View path <ArrowRightIcon className="h-4 w-4 stroke-[1.7]" />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-200">
            {upNext.map((item) => (
              <Link
                key={item.step}
                href={item.href}
                className="group flex items-center gap-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-semibold text-white",
                    item.color,
                  )}
                >
                  {item.step}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold leading-6 group-hover:text-indigo-700">
                    {item.title}
                  </span>
                  <span className="mt-1 block truncate text-sm font-normal leading-5 text-slate-500">
                    {item.description}
                  </span>
                </span>
                <span className="hidden text-sm font-normal leading-5 tabular-nums text-slate-500 sm:block">
                  {item.minutes} min
                </span>
                <ChevronRightIcon className="h-5 w-5 stroke-[1.7] text-slate-500 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function LegacyCourseCatalog({
  courses,
  onAddNew,
  onAiCreate,
  onRemove,
  onAssign,
  removingCourseId,
}: {
  courses: LearningRecord[];
  onAddNew: () => void;
  onAiCreate?: () => void;
  onRemove: (course: LearningRecord) => void;
  onAssign: (course: LearningRecord) => void;
  removingCourseId: string | null;
}) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [display, setDisplay] = React.useState<"grid" | "list">("grid");
  const catalogCourses = courses.filter(isCourseActive);
  const categories = Array.from(
    new Set(catalogCourses.map((course) => text(course.category, "General"))),
  ).sort();
  const filtered = catalogCourses.filter((course) => {
    const matchesQuery =
      `${text(course.title, "")} ${text(course.description, "")} ${text(course.category, "")}`
        .toLowerCase()
        .includes(query.toLowerCase());
    return (
      matchesQuery &&
      (category === "all" || text(course.category, "General") === category)
    );
  });

  if (catalogCourses.length === 0) {
    return (
      <div className="min-h-[calc(100vh-7rem)] bg-[#fbfaf6] px-4 pb-14 pt-7 text-[#172033] dark:bg-zinc-950 dark:text-zinc-50 sm:px-7 lg:px-12 xl:px-[68px]">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.035em] sm:text-[2.35rem]">
              Courses
            </h1>
            <p className="mt-1.5 text-[15px] text-[#6f7886] dark:text-zinc-400">
              Explore skills for every stage of your journey.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {onAiCreate && (
              <Button
                type="button"
                variant="outline"
                onClick={onAiCreate}
                className="h-10 rounded-md border-[#cbd3dc] bg-white px-4 font-semibold text-[#314052] shadow-none hover:bg-[#f3f5f6] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <SparklesIcon className="mr-2 h-4 w-4 text-[#316be8]" />
                Create with AI
              </Button>
            )}
            <Button
              type="button"
              onClick={onAddNew}
              className="h-10 rounded-md bg-[#316be8] px-4 font-semibold shadow-none hover:bg-[#285dce]"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Create course
            </Button>
          </div>
        </header>
        <div className="mt-10">
          <EmptyState
            icon={AcademicCapIcon}
            title="Build your learning catalog"
            description="Start with one useful course. Add the duration, category, and whether every employee needs to complete it."
            action="Create first course"
            onAction={onAddNew}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-[#fbfaf5] shadow-[0_10px_35px_rgba(30,48,42,.06)] dark:border-zinc-800 dark:bg-[#171d1a]">
        <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center">
          <label className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <span className="sr-only">Search courses</span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, category, or topic"
              className="h-11 rounded-xl border-0 bg-white pl-9 shadow-none focus-visible:ring-2 focus-visible:ring-[#6b8e7f] dark:bg-white/5"
            />
          </label>
          <div className="flex rounded-md border border-slate-200 p-0.5 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setDisplay("grid")}
              aria-label="Grid view"
              aria-pressed={display === "grid"}
              className={cn(
                "grid h-8 w-9 place-items-center rounded text-slate-500",
                display === "grid" &&
                  "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950",
              )}
            >
              <RectangleGroupIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDisplay("list")}
              aria-label="List view"
              aria-pressed={display === "list"}
              className={cn(
                "grid h-8 w-9 place-items-center rounded text-slate-500",
                display === "list" &&
                  "bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950",
              )}
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav
          aria-label="Course categories"
          className="flex gap-2 overflow-x-auto border-t border-slate-200 px-3 py-3 [scrollbar-width:none] dark:border-white/10"
        >
          <button
            type="button"
            onClick={() => setCategory("all")}
            aria-pressed={category === "all"}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              category === "all"
                ? "bg-[#173f35] text-[#f7f4e9]"
                : "text-slate-600 hover:bg-[#e8eadf] hover:text-[#173f35] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white",
            )}
          >
            All courses
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                category === item
                  ? "bg-[#173f35] text-[#f7f4e9]"
                  : "text-slate-600 hover:bg-[#e8eadf] hover:text-[#173f35] dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white",
              )}
            >
              {item}
            </button>
          ))}
        </nav>
      </section>

      {category !== "all" && (
        <section className="relative overflow-hidden rounded-[24px] bg-[#e5e9d9] px-6 py-7 text-[#173f35] dark:bg-[#1c2923] dark:text-[#e9f0eb] sm:px-8 sm:py-9">
          <span
            className="pointer-events-none absolute -right-12 -top-20 h-44 w-44 rounded-full border-[28px] border-[#d6df6d] opacity-80"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#65776e] dark:text-[#a9b9b0]">
                Selected collection
              </p>
              <h2 className="mt-2 max-w-2xl text-[clamp(1.8rem,4vw,3.25rem)] font-semibold leading-none tracking-[-.05em]">
                {category}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#52665d] dark:text-[#b9c8c0]">
                A focused collection for building practical{" "}
                {category.toLowerCase()} capability across your team.
              </p>
            </div>
            <div className="relative flex items-center gap-4 pr-16 sm:pr-0">
              <span className="text-4xl font-semibold tracking-[-.06em]">
                {filtered.length}
              </span>
              <span className="max-w-20 text-xs font-bold uppercase leading-4 tracking-[.12em] text-[#65776e] dark:text-[#a9b9b0]">
                course{filtered.length === 1 ? "" : "s"} available
              </span>
            </div>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
          {category === "all"
            ? `${filtered.length} course${filtered.length === 1 ? "" : "s"} in the catalog`
            : query
              ? `${filtered.length} matching course${filtered.length === 1 ? "" : "s"}`
              : `Explore ${category}`}
        </p>
        {(query || category !== "all") && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
            className="text-xs font-semibold text-[#315f50] hover:underline dark:text-[#9bc4b1]"
          >
            View all courses
          </button>
        )}
      </div>

      {filtered.length ? (
        display === "grid" ? (
          <CourseGrid
            courses={filtered}
            onRemove={onRemove}
            onAssign={onAssign}
            removingCourseId={removingCourseId}
          />
        ) : (
          <CourseList
            courses={filtered}
            onRemove={onRemove}
            onAssign={onAssign}
            removingCourseId={removingCourseId}
          />
        )
      ) : (
        <EmptyInline
          title="No courses match"
          description="Try a broader search or clear the category filter."
        />
      )}
    </div>
  );
}

function CourseGrid({
  courses,
  onRemove,
  onAssign,
  removingCourseId,
}: {
  courses: LearningRecord[];
  onRemove: (course: LearningRecord) => void;
  onAssign: (course: LearningRecord) => void;
  removingCourseId: string | null;
}) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {courses.map((course) => (
        <article
          key={course.id}
          className="group flex min-h-72 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(30,48,87,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_38px_rgba(49,107,232,0.14)] dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-indigo-800 dark:hover:bg-zinc-900"
        >
          <div className="relative flex h-24 items-start justify-between overflow-hidden bg-[#eaf3f5] px-5 pt-4 text-[#35536d] dark:bg-[#243342] dark:text-blue-200">
            <BookOpenIcon className="relative z-10 h-7 w-7 stroke-[1.5] transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110" />
            <span className="relative z-10 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] dark:bg-zinc-900/70">
              {text(course.category, "General")}
            </span>
            <span
              className="absolute right-7 top-4 h-8 w-8 rounded-full bg-[#f4c95d] opacity-80"
              aria-hidden="true"
            />
            <span
              className="absolute -bottom-12 -left-8 h-24 w-48 rotate-6 rounded-[50%] bg-[#93b89a]"
              aria-hidden="true"
            />
            <span
              className="absolute -bottom-14 left-[28%] h-24 w-56 -rotate-3 rounded-[50%] bg-[#6f977d]"
              aria-hidden="true"
            />
            <span
              className={cn(
                "absolute bottom-0 left-0 h-1.5 w-full",
                courseColor(course.category),
              )}
              aria-hidden="true"
            />
          </div>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                Ready to explore
              </p>
              <StatusPill
                status={isCourseActive(course) ? "active" : "archived"}
              />
            </div>
            <Link
              href={`/learning/courses/${course.id}`}
              className="mt-4 block"
            >
              <h2 className="line-clamp-2 text-lg font-semibold leading-6 tracking-[-0.02em] group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                {text(course.title, "Untitled course")}
              </h2>
            </Link>
            <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-500 dark:text-zinc-400">
              {text(
                course.description,
                "Add a short description so employees know what they will learn.",
              )}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-zinc-800 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4" />
                {text(
                  recordValue(course, "durationHours", "duration_hours"),
                  "0",
                )}
                h
              </span>
              {booleanValue(course.isRequired, course.is_required) && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#7b5531] dark:text-amber-300">
                  <ShieldCheckIcon className="h-4 w-4" />
                  Required
                </span>
              )}
              <button
                type="button"
                onClick={() => onAssign(course)}
                className="ml-auto inline-flex items-center font-semibold text-indigo-700 hover:text-indigo-900 dark:text-indigo-300"
              >
                <UserGroupIcon className="mr-1 h-4 w-4" />
                Assign
              </button>
              <button
                type="button"
                onClick={() => onRemove(course)}
                disabled={removingCourseId === course.id}
                className="inline-flex items-center font-semibold text-rose-600 hover:text-rose-700 disabled:cursor-wait disabled:opacity-50 dark:text-rose-400 dark:hover:text-rose-300"
                aria-label={`Remove ${text(course.title, "course")}`}
              >
                <TrashIcon className="mr-1 h-4 w-4" />
                {removingCourseId === course.id ? "Removing…" : "Remove"}
              </button>
              <Link
                href={`/learning/courses/${course.id}/studio`}
                className="font-semibold hover:text-slate-950 dark:hover:text-white"
              >
                Studio
              </Link>
              <Link
                href={`/learning/courses/${course.id}`}
                className="inline-flex items-center font-semibold text-indigo-700 dark:text-indigo-300"
              >
                Open{" "}
                <ChevronRightIcon className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function CourseList({
  courses,
  onRemove,
  onAssign,
  removingCourseId,
}: {
  courses: LearningRecord[];
  onRemove: (course: LearningRecord) => void;
  onAssign: (course: LearningRecord) => void;
  removingCourseId: string | null;
}) {
  return (
    <section className="divide-y divide-slate-100 overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50">
      {courses.map((course) => (
        <article
          key={course.id}
          className="grid gap-3 px-4 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900 sm:grid-cols-[8px_minmax(0,1fr)_120px_110px_90px_86px_90px] sm:items-center"
        >
          <div
            className={cn("h-full min-h-10 w-2", courseColor(course.category))}
          />
          <div className="min-w-0">
            <Link
              href={`/learning/courses/${course.id}`}
              className="truncate text-sm font-semibold hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              {text(course.title, "Untitled course")}
            </Link>
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-zinc-400">
              {text(course.description, "No description")}
            </p>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
            {text(course.category, "General")}
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
            <ClockIcon className="h-4 w-4" />
            {text(
              recordValue(course, "durationHours", "duration_hours"),
              "0",
            )}{" "}
            hours
          </span>
          <StatusPill status={isCourseActive(course) ? "active" : "archived"} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAssign(course)}
          >
            <UserGroupIcon className="mr-1.5 h-4 w-4" />
            Assign
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onRemove(course)}
            disabled={removingCourseId === course.id}
            className="justify-start text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 sm:justify-center"
          >
            <TrashIcon className="mr-1.5 h-4 w-4" />
            {removingCourseId === course.id ? "Removing…" : "Remove"}
          </Button>
        </article>
      ))}
    </section>
  );
}

const courseCatalogArtwork = [
  "/learning/paths/new-manager-foundations.webp",
  "/learning/paths/customer-excellence.webp",
  "/learning/paths/workplace-essentials.webp",
];

function courseArtwork(course: LearningRecord, index: number) {
  const uploaded = text(
    recordValue(course, "coverImageUrl", "cover_image_url"),
    "",
  );
  return uploaded || courseCatalogArtwork[index % courseCatalogArtwork.length];
}

function CourseCatalog({
  courses,
  enrollments,
  onAddNew,
  onAiCreate,
  onRemove,
  onAssign,
  removingCourseId,
}: {
  courses: LearningRecord[];
  enrollments: LearningRecord[];
  onAddNew: () => void;
  onAiCreate: () => void;
  onRemove: (course: LearningRecord) => void;
  onAssign: (course: LearningRecord) => void;
  removingCourseId: string | null;
}) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [sort, setSort] = React.useState<"recommended" | "title" | "duration">(
    "recommended",
  );
  const catalogCourses = courses.filter(isCourseActive);
  const courseById = new Map(
    catalogCourses.map((course) => [course.id, course]),
  );
  const activeEnrollments = enrollments
    .filter(
      (enrollment) =>
        !["completed", "cancelled"].includes(
          normalizeStatus(enrollment.status),
        ),
    )
    .filter((enrollment) =>
      courseById.has(
        String(recordValue(enrollment, "courseId", "course_id") || ""),
      ),
    )
    .sort((a, b) => numberValue(b.progress) - numberValue(a.progress));
  const featuredEnrollment = activeEnrollments[0];
  const featuredCourse =
    courseById.get(
      String(
        featuredEnrollment
          ? recordValue(featuredEnrollment, "courseId", "course_id")
          : "",
      ),
    ) || catalogCourses[0];
  const requiredCourse =
    catalogCourses.find(
      (course) =>
        course.id !== featuredCourse?.id &&
        booleanValue(course.isRequired, course.is_required),
    ) || catalogCourses.find((course) => course.id !== featuredCourse?.id);
  const requiredEnrollment = activeEnrollments.find(
    (enrollment) =>
      String(recordValue(enrollment, "courseId", "course_id")) ===
      requiredCourse?.id,
  );
  const progress = Math.min(
    100,
    Math.max(0, numberValue(featuredEnrollment?.progress)),
  );
  const categories = Array.from(
    new Set(catalogCourses.map((course) => text(course.category, "General"))),
  ).sort();
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = catalogCourses
    .filter((course) => {
      const matchesQuery =
        `${text(course.title, "")} ${text(course.description, "")} ${text(course.category, "")}`
          .toLowerCase()
          .includes(normalizedQuery);
      return (
        matchesQuery &&
        (category === "all" || text(course.category, "General") === category)
      );
    })
    .sort((a, b) => {
      if (sort === "title")
        return text(a.title, "").localeCompare(text(b.title, ""));
      if (sort === "duration")
        return (
          numberValue(recordValue(a, "durationHours", "duration_hours")) -
          numberValue(recordValue(b, "durationHours", "duration_hours"))
        );
      const score = (course: LearningRecord) =>
        (booleanValue(course.isRequired, course.is_required) ? 2 : 0) +
        (activeEnrollments.some(
          (item) => recordValue(item, "courseId", "course_id") === course.id,
        )
          ? 1
          : 0);
      return score(b) - score(a);
    });
  const browseCourses = filtered.filter(
    (course) =>
      course.id !== featuredCourse?.id && course.id !== requiredCourse?.id,
  );
  const visibleBrowseCourses = browseCourses.length ? browseCourses : filtered;
  const dueInDays = daysUntil(
    requiredEnrollment
      ? recordValue(requiredEnrollment, "dueDate", "due_date")
      : null,
  );

  if (!catalogCourses.length) {
    return (
      <LegacyCourseCatalog
        courses={courses}
        onAddNew={onAddNew}
        onAiCreate={onAiCreate}
        onRemove={onRemove}
        onAssign={onAssign}
        removingCourseId={removingCourseId}
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-[#fbfaf6] px-4 pb-14 pt-7 font-sans text-[#172033] dark:bg-zinc-950 dark:text-zinc-50 sm:px-7 lg:px-12 xl:px-[68px]">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.035em] sm:text-[2.35rem]">
            Courses
          </h1>
          <p className="mt-1.5 text-[15px] text-[#6f7886] dark:text-zinc-400">
            Explore skills for every stage of your journey.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onAiCreate}
            className="h-10 rounded-md border-[#cbd3dc] bg-white px-4 font-semibold text-[#314052] shadow-none hover:bg-[#f3f5f6] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <SparklesIcon className="mr-2 h-4 w-4 text-[#316be8]" />
            Create with AI
          </Button>
          <Button
            type="button"
            onClick={onAddNew}
            className="h-10 rounded-md bg-[#316be8] px-4 font-semibold shadow-none hover:bg-[#285dce]"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Create course
          </Button>
        </div>
      </header>

      <section className="mt-7 flex flex-col gap-4 border-b border-[#d7dce2] pb-3 lg:flex-row lg:items-end lg:justify-between dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          <label className="relative block max-w-[760px]">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#687384]" />
            <span className="sr-only">Search courses</span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search courses"
              className="h-12 rounded-md border-[#bcc5ce] bg-white pl-12 text-[15px] shadow-none focus-visible:ring-[#316be8] dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <nav
            aria-label="Course categories"
            className="mt-4 flex gap-7 overflow-x-auto [scrollbar-width:none]"
          >
            <button
              type="button"
              onClick={() => setCategory("all")}
              aria-pressed={category === "all"}
              className={cn(
                "relative shrink-0 pb-3 text-sm font-semibold text-[#697484] transition-colors hover:text-[#172033] dark:text-zinc-400 dark:hover:text-white",
                category === "all" &&
                  "text-[#172033] after:absolute after:inset-x-0 after:-bottom-[13px] after:h-0.5 after:bg-[#316be8] dark:text-white",
              )}
            >
              All
            </button>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
                className={cn(
                  "relative shrink-0 pb-3 text-sm font-semibold text-[#697484] transition-colors hover:text-[#172033] dark:text-zinc-400 dark:hover:text-white",
                  category === item &&
                    "text-[#172033] after:absolute after:inset-x-0 after:-bottom-[13px] after:h-0.5 after:bg-[#316be8] dark:text-white",
                )}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
        <label className="flex shrink-0 items-center gap-2 pb-2 text-sm text-[#687384] dark:text-zinc-400">
          <span>Sort by</span>
          <span className="relative">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="h-9 appearance-none rounded-md border-0 bg-transparent py-0 pl-2 pr-7 text-sm font-semibold text-[#172033] outline-none focus:ring-2 focus:ring-[#316be8] dark:text-white"
            >
              <option value="recommended">Recommended</option>
              <option value="title">Title</option>
              <option value="duration">Duration</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2" />
          </span>
        </label>
      </section>

      {!normalizedQuery && category === "all" && (
        <section className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,2.85fr)_minmax(300px,1fr)]">
          {featuredCourse && (
            <article className="overflow-hidden rounded-[9px] border border-[#d6dce3] bg-white shadow-[0_2px_8px_rgba(20,30,45,.06)] dark:border-zinc-800 dark:bg-zinc-900">
              <div className="grid min-h-[278px] md:grid-cols-[43%_57%]">
                <div className="relative min-h-[210px] overflow-hidden bg-[#dfe9e7] md:min-h-full">
                  <Image
                    src={courseArtwork(featuredCourse, 0)}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 38vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col p-6 sm:p-7">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#316be8]">
                    {featuredEnrollment
                      ? "Continue learning"
                      : "Recommended for you"}
                  </p>
                  <h2 className="mt-2 text-[1.55rem] font-bold leading-tight tracking-[-0.025em]">
                    {text(featuredCourse.title, "Untitled course")}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#697484] dark:text-zinc-400">
                    {text(
                      featuredCourse.description,
                      "Build practical skills with this guided course.",
                    )}
                  </p>
                  {featuredEnrollment && (
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                        <span className="text-[#697484] dark:text-zinc-400">
                          Your progress
                        </span>
                        <span className="text-[#316be8]">{progress}%</span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-[#e2e6ea] dark:bg-zinc-700"
                        role="progressbar"
                        aria-label={`${text(featuredCourse.title, "Course")} progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                      >
                        <div
                          className="h-full rounded-full bg-[#316be8]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-4 pt-5 text-xs text-[#697484] dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <ClockIcon className="h-4 w-4" />
                      {text(
                        recordValue(
                          featuredCourse,
                          "durationHours",
                          "duration_hours",
                        ),
                        "0",
                      )}{" "}
                      hours
                    </span>
                    <span>{text(featuredCourse.category, "General")}</span>
                    <button
                      type="button"
                      onClick={() => onAssign(featuredCourse)}
                      className="font-semibold text-[#43546a] hover:text-[#316be8] dark:text-zinc-300"
                    >
                      Assign
                    </button>
                    <Button
                      asChild
                      className="ml-auto h-9 rounded-md bg-[#316be8] px-4 text-sm font-semibold shadow-none hover:bg-[#285dce]"
                    >
                      <Link href={`/learning/courses/${featuredCourse.id}`}>
                        {featuredEnrollment ? "Continue" : "View course"}
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          )}
          {requiredCourse && (
            <article className="flex min-h-[278px] flex-col overflow-hidden rounded-[9px] border border-[#d6dce3] bg-white shadow-[0_2px_8px_rgba(20,30,45,.06)] dark:border-zinc-800 dark:bg-zinc-900">
              <div className="relative h-[116px] overflow-hidden bg-[#e6eeec]">
                <Image
                  src={courseArtwork(requiredCourse, 1)}
                  alt=""
                  fill
                  unoptimized
                  sizes="360px"
                  className="object-cover"
                />
                <span className="absolute left-4 top-4 rounded-sm bg-[#f4e6b8] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#6b5120]">
                  Required learning
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="line-clamp-2 text-lg font-bold leading-6 tracking-[-0.02em]">
                  {text(requiredCourse.title, "Required course")}
                </h2>
                <p className="mt-1 text-xs font-medium text-[#b05a41]">
                  {dueInDays === null
                    ? "Complete when ready"
                    : dueInDays < 0
                      ? `${Math.abs(dueInDays)} days overdue`
                      : `Due in ${dueInDays} days`}
                </p>
                <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-[#697484] dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="h-4 w-4" />
                    {text(
                      recordValue(
                        requiredCourse,
                        "durationHours",
                        "duration_hours",
                      ),
                      "0",
                    )}
                    h
                  </span>
                  <button
                    type="button"
                    onClick={() => onAssign(requiredCourse)}
                    className="font-semibold hover:text-[#316be8]"
                  >
                    Assign
                  </button>
                  <Link
                    href={`/learning/courses/${requiredCourse.id}`}
                    className="ml-auto inline-flex h-8 items-center rounded-md border border-[#aeb9c4] px-3 font-semibold text-[#263649] hover:border-[#316be8] hover:text-[#316be8]"
                  >
                    Start course
                  </Link>
                </div>
              </div>
            </article>
          )}
        </section>
      )}

      <section className="mt-9">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[1.35rem] font-bold tracking-[-0.025em]">
              Browse the catalog
            </h2>
            <p className="mt-1 text-sm text-[#747d89] dark:text-zinc-400">
              {visibleBrowseCourses.length} course
              {visibleBrowseCourses.length === 1 ? "" : "s"} available
            </p>
          </div>
          {(normalizedQuery || category !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="text-sm font-semibold text-[#316be8] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
        {visibleBrowseCourses.length ? (
          <div className="mt-4 divide-y divide-[#e0e4e8] border-y border-[#d7dce2] dark:divide-zinc-800 dark:border-zinc-800">
            {visibleBrowseCourses.map((course, index) => (
              <article
                key={course.id}
                className="group grid gap-4 py-4 md:grid-cols-[174px_minmax(0,1fr)_auto] md:items-center"
              >
                <Link
                  href={`/learning/courses/${course.id}`}
                  className="relative block h-[92px] overflow-hidden rounded-[6px] bg-[#e4ece9]"
                >
                  <Image
                    src={courseArtwork(course, index + 2)}
                    alt=""
                    fill
                    unoptimized
                    sizes="174px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </Link>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#718096]">
                    {text(course.category, "General")}
                  </p>
                  <Link
                    href={`/learning/courses/${course.id}`}
                    className="mt-1 block"
                  >
                    <h3 className="truncate text-[1.05rem] font-bold tracking-[-0.015em] group-hover:text-[#316be8]">
                      {text(course.title, "Untitled course")}
                    </h3>
                  </Link>
                  <p className="mt-1 line-clamp-1 text-sm text-[#727b88] dark:text-zinc-400">
                    {text(
                      course.description,
                      "Build practical skills with this course.",
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#727b88] dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      <ClockIcon className="h-4 w-4" />
                      {text(
                        recordValue(course, "durationHours", "duration_hours"),
                        "0",
                      )}{" "}
                      hours
                    </span>
                    {booleanValue(course.isRequired, course.is_required) && (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[#8a6832]">
                        <ShieldCheckIcon className="h-4 w-4" />
                        Required
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => onAssign(course)}
                    className="h-9 rounded-md px-2 text-xs font-semibold text-[#536174] hover:bg-white hover:text-[#316be8] dark:hover:bg-zinc-900"
                  >
                    Assign
                  </button>
                  <Link
                    href={`/learning/courses/${course.id}/studio`}
                    className="inline-flex h-9 items-center rounded-md px-2 text-xs font-semibold text-[#536174] hover:bg-white hover:text-[#316be8] dark:hover:bg-zinc-900"
                  >
                    Studio
                  </Link>
                  <button
                    type="button"
                    onClick={() => onRemove(course)}
                    disabled={removingCourseId === course.id}
                    aria-label={`Remove ${text(course.title, "course")}`}
                    className="grid h-9 w-9 place-items-center rounded-md text-[#8b95a3] hover:bg-rose-50 hover:text-rose-600 disabled:cursor-wait disabled:opacity-50 dark:hover:bg-rose-950/30"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                  <Link
                    href={`/learning/courses/${course.id}`}
                    className="inline-flex h-9 items-center rounded-md border border-[#aeb9c4] px-3 text-xs font-semibold text-[#263649] hover:border-[#316be8] hover:text-[#316be8] dark:text-zinc-200"
                  >
                    View course
                    <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyInline
              title="No courses match"
              description="Try a broader search or clear the category filter."
            />
          </div>
        )}
      </section>
    </div>
  );
}

function LearningPaths({
  paths,
  courses,
  enrollments,
  onCreatePath,
  onConfigurePath,
  onAssignPath,
  onAiCreate,
}: {
  paths: LearningRecord[];
  courses: LearningRecord[];
  enrollments: LearningRecord[];
  onCreatePath: () => void;
  onConfigurePath: (path: LearningRecord) => void;
  onAssignPath: (path: LearningRecord) => void;
  onAiCreate: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const imagePaths = [
    "/learning/paths/new-manager-foundations.webp",
    "/learning/paths/customer-excellence.webp",
    "/learning/paths/workplace-essentials.webp",
  ];
  const milestoneColors = [
    "bg-indigo-600",
    "bg-[#ef6d4f]",
    "bg-[#e9a414]",
    "bg-[#2f8f83]",
    "bg-[#2463c5]",
  ];
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const visiblePaths = paths.filter((path) => {
    const pathStatus = text(path.status, "draft").toLowerCase();
    const matchesStatus = statusFilter === "all" || pathStatus === statusFilter;
    const searchable =
      `${text(path.title, "")} ${text(path.description, "")}`.toLowerCase();
    return matchesStatus && searchable.includes(query.trim().toLowerCase());
  });
  const activeCount = paths.filter(
    (path) => text(path.status, "").toLowerCase() === "active",
  ).length;
  const draftCount = paths.filter(
    (path) => text(path.status, "").toLowerCase() === "draft",
  ).length;
  const needsReviewCount = paths.filter(
    (path) =>
      booleanValue(recordValue(path, "needsReview", "needs_review")) ||
      stringArrayValue(recordValue(path, "courseIds", "course_ids")).length ===
        0,
  ).length;

  if (
    paths.some(
      (path) =>
        recordValue(path, "designVariant", "design_variant") === "legacy",
    )
  ) {
    return (
      <LegacyLearningPaths
        paths={paths}
        courses={courses}
        enrollments={enrollments}
        onCreatePath={onCreatePath}
        onConfigurePath={onConfigurePath}
      />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[22px] bg-[#fbfaf6] px-4 py-6 text-[#15213a] shadow-[0_18px_50px_rgba(37,45,68,.05)] dark:bg-[#151924] dark:text-[#f5f3ed] sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-6 border-b border-[#dedbd2] pb-7 dark:border-white/10 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-[clamp(2.25rem,3.2vw,3rem)] font-semibold leading-none tracking-[-.05em]">
            Learning Paths
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#616a7d] dark:text-zinc-300">
            Shape courses into journeys that move people forward.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={onCreatePath}
              className="h-11 rounded-[8px] bg-indigo-600 px-5 text-white hover:bg-indigo-700"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Create learning path
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onAiCreate}
              className="h-11 rounded-[8px] border-[#d4d2ca] bg-white px-5 dark:border-white/15 dark:bg-white/5"
            >
              <SparklesIcon className="mr-2 h-4 w-4" />
              Create with AI
            </Button>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row xl:max-w-[560px]">
          <label className="relative flex-1">
            <span className="sr-only">Search learning paths</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#747b8b]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search learning paths"
              className="h-12 rounded-[8px] border-[#d6d3ca] bg-white pl-11 dark:border-white/15 dark:bg-white/5"
            />
          </label>
          <label>
            <span className="sr-only">Filter paths by status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-12 min-w-40 rounded-[8px] border border-[#d6d3ca] bg-white px-4 text-sm font-semibold outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/15 dark:bg-[#202532]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
      </header>

      {paths.length === 0 ? (
        <div className="py-8">
          <EmptyState
            icon={AdjustmentsHorizontalIcon}
            title="Build your first learning path"
            description="Create an ordered journey from the courses in your catalog."
            action="Create path"
            onAction={onCreatePath}
          />
        </div>
      ) : (
        <div className="grid gap-6 pt-7 xl:grid-cols-[minmax(0,1fr)_240px]">
          <section className="space-y-4" aria-label="Learning paths">
            {visiblePaths.map((path, pathIndex) => {
              const courseIds = stringArrayValue(
                recordValue(path, "courseIds", "course_ids"),
              );
              const steps = courseIds
                .map((courseId) => courseById.get(courseId))
                .filter((course): course is LearningRecord => Boolean(course));
              const stepIds = new Set(courseIds);
              const relevantEnrollments = enrollments.filter((item) =>
                stepIds.has(String(recordValue(item, "courseId", "course_id"))),
              );
              const progress = relevantEnrollments.length
                ? Math.round(
                    relevantEnrollments.reduce(
                      (sum, item) => sum + numberValue(item.progress),
                      0,
                    ) / relevantEnrollments.length,
                  )
                : 0;
              const pathStatus = text(path.status, "draft").toLowerCase();
              const enrolledEmployeeCount = new Set(
                relevantEnrollments
                  .map((item) =>
                    String(recordValue(item, "employeeId", "employee_id")),
                  )
                  .filter(Boolean),
              ).size;
              const employeeCount =
                numberValue(
                  recordValue(path, "employeeCount", "employee_count"),
                ) || enrolledEmployeeCount;

              return (
                <article
                  key={path.id}
                  className="grid overflow-hidden rounded-[14px] border border-[#ddd9d0] bg-white shadow-[0_8px_28px_rgba(37,45,68,.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(37,45,68,.09)] dark:border-white/10 dark:bg-[#1d222e] lg:grid-cols-[250px_minmax(0,1fr)_136px]"
                >
                  <div className="relative min-h-44 overflow-hidden lg:min-h-[210px]">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${imagePaths[pathIndex % imagePaths.length]})`,
                      }}
                    />
                  </div>
                  <div className="min-w-0 p-5 lg:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-semibold tracking-[-.035em]">
                          {text(path.title, "Untitled learning path")}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#677084] dark:text-zinc-400">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 font-semibold capitalize",
                              pathStatus === "active"
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-[#687083] dark:text-zinc-300",
                            )}
                          >
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                pathStatus === "active"
                                  ? "bg-emerald-500"
                                  : "bg-slate-400",
                              )}
                            />
                            {pathStatus}
                          </span>
                          <span>
                            {steps.length} course{steps.length === 1 ? "" : "s"}
                          </span>
                          <span>
                            {employeeCount
                              ? `${employeeCount.toLocaleString()} employees`
                              : "Not assigned"}
                          </span>
                          <span>{progress}% average progress</span>
                        </div>
                      </div>
                      <div className="flex min-w-40 items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e5e2da] dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-300">
                          {progress}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-7 overflow-x-auto pb-1 [scrollbar-width:none]">
                      <ol className="flex min-w-max items-start">
                        {steps.length ? (
                          steps.map((course, index) => (
                            <li
                              key={course.id}
                              className="relative flex w-36 flex-col items-center px-2 text-center first:items-start first:px-0 first:text-left last:items-end last:px-0 last:text-right"
                            >
                              {index > 0 && (
                                <span
                                  className="absolute right-1/2 top-4 h-px w-full border-t border-dashed border-[#c7c4ba] dark:border-white/20"
                                  aria-hidden="true"
                                />
                              )}
                              <span
                                className={cn(
                                  "relative z-10 grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white shadow-sm",
                                  milestoneColors[
                                    index % milestoneColors.length
                                  ],
                                )}
                              >
                                {index + 1}
                              </span>
                              <span className="relative z-10 mt-2 max-w-28 text-xs font-semibold leading-4">
                                {text(course.title, "Untitled course")}
                              </span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-[#707889] dark:text-zinc-400">
                            No courses configured yet.
                          </li>
                        )}
                      </ol>
                    </div>
                  </div>
                  <div className="flex flex-row gap-2 border-t border-[#ece9e2] p-4 dark:border-white/10 lg:flex-col lg:justify-end lg:border-l lg:border-t-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onAssignPath(path)}
                      disabled={!courseIds.length}
                      className="flex-1 rounded-[8px] bg-white dark:bg-transparent"
                    >
                      <UserGroupIcon className="mr-2 h-4 w-4" />
                      Assign
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onConfigurePath(path)}
                      className="flex-1 rounded-[8px] bg-white dark:bg-transparent"
                    >
                      <PencilSquareIcon className="mr-2 h-4 w-4" />
                      Configure
                    </Button>
                  </div>
                </article>
              );
            })}
            {visiblePaths.length === 0 && (
              <EmptyInline
                title="No learning paths match"
                description="Try a broader search or another status."
              />
            )}
          </section>

          <aside className="h-fit rounded-[14px] border border-[#ddd9d0] bg-white p-5 dark:border-white/10 dark:bg-[#1d222e] xl:sticky xl:top-24">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-[-.03em]">
                Path health
              </h2>
              <ChartBarIcon className="h-5 w-5 text-[#697287]" />
            </div>
            <dl className="mt-6 space-y-6">
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCircleIcon className="h-5 w-5" />
                </span>
                <div>
                  <dd className="text-2xl font-semibold">{activeCount}</dd>
                  <dt className="text-sm font-semibold">Active</dt>
                  <p className="mt-1 text-xs leading-5 text-[#737b8c] dark:text-zinc-400">
                    On track and driving progress
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <PencilSquareIcon className="h-5 w-5" />
                </span>
                <div>
                  <dd className="text-2xl font-semibold">{draftCount}</dd>
                  <dt className="text-sm font-semibold">Draft</dt>
                  <p className="mt-1 text-xs leading-5 text-[#737b8c] dark:text-zinc-400">
                    In progress, not yet assigned
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                  <ShieldCheckIcon className="h-5 w-5" />
                </span>
                <div>
                  <dd className="text-2xl font-semibold">{needsReviewCount}</dd>
                  <dt className="text-sm font-semibold">Needs review</dt>
                  <p className="mt-1 text-xs leading-5 text-[#737b8c] dark:text-zinc-400">
                    Missing courses or assignments
                  </p>
                </div>
              </div>
            </dl>
            <Link
              href="/learning"
              className="mt-7 inline-flex items-center gap-1 border-t border-[#ece9e2] pt-5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:border-white/10 dark:text-indigo-300"
            >
              Review assignments <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

function LegacyLearningPaths({
  paths,
  courses,
  enrollments,
  onCreatePath,
  onConfigurePath,
}: {
  paths: LearningRecord[];
  courses: LearningRecord[];
  enrollments: LearningRecord[];
  onCreatePath: () => void;
  onConfigurePath: (path: LearningRecord) => void;
}) {
  const pathColors = [
    "bg-indigo-600",
    "bg-emerald-600",
    "bg-amber-600",
    "bg-rose-600",
  ];

  if (!paths.length) {
    return (
      <EmptyState
        icon={AdjustmentsHorizontalIcon}
        title="Build your first learning path"
        description="Create an ordered journey from the courses in your catalog. You can return at any time to change the sequence."
        action="Create path"
        onAction={onCreatePath}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-5 py-5 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Purposeful course journeys
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 dark:text-zinc-400">
                Each path follows the course order you configure. Reopen a path
                to add, remove, or reorder courses.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onCreatePath}
            className="h-9 shrink-0 bg-white dark:bg-zinc-900"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            New path
          </Button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {paths.map((path, pathIndex) => {
          const courseIds = stringArrayValue(
            recordValue(path, "courseIds", "course_ids"),
          );
          const courseById = new Map(
            courses.map((course) => [course.id, course]),
          );
          const steps = courseIds
            .map((courseId) => courseById.get(courseId))
            .filter((course): course is LearningRecord => Boolean(course));
          const stepIds = new Set(courseIds);
          const relevantEnrollments = enrollments.filter((item) =>
            stepIds.has(String(recordValue(item, "courseId", "course_id"))),
          );
          const progress = relevantEnrollments.length
            ? Math.round(
                relevantEnrollments.reduce(
                  (sum, item) => sum + numberValue(item.progress),
                  0,
                ) / relevantEnrollments.length,
              )
            : 0;
          const duration = steps.reduce(
            (sum, course) =>
              sum +
              numberValue(
                recordValue(course, "durationHours", "duration_hours"),
              ),
            0,
          );

          return (
            <article
              key={path.id}
              className="group flex min-h-[430px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(30,48,87,0.06)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(30,95,75,0.13)] dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <div className="relative flex h-24 items-start justify-between overflow-hidden bg-[#edf4ee] px-5 py-4 text-[#355c4b] dark:bg-[#24362f] dark:text-emerald-200">
                <MapPinIcon
                  className={cn(
                    "relative z-10 h-9 w-9 fill-white stroke-[1.5] transition-transform duration-300 group-hover:-translate-y-1",
                    pathIndex % 2 ? "text-[#e58b51]" : "text-[#4f83d1]",
                  )}
                />
                <span className="relative z-10 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold dark:bg-zinc-900/70">
                  {steps.length} course{steps.length === 1 ? "" : "s"} ·{" "}
                  {duration}h
                </span>
                <span
                  className="absolute -bottom-12 -left-6 h-24 w-52 rotate-3 rounded-[50%] bg-[#a9c79c]"
                  aria-hidden="true"
                />
                <span
                  className="absolute -bottom-14 left-[34%] h-24 w-60 -rotate-2 rounded-[50%] bg-[#739b78]"
                  aria-hidden="true"
                />
                <span
                  className="absolute bottom-0 left-[48%] h-10 w-2 rotate-[22deg] rounded-full bg-[#f3e1bc]"
                  aria-hidden="true"
                />
              </div>
              <div className="border-b border-slate-100 p-5 dark:border-zinc-800">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-[-0.02em]">
                    {text(path.title, "Untitled path")}
                  </h2>
                  <StatusPill status={path.status} />
                </div>
                <p className="mt-1.5 min-h-10 text-sm leading-5 text-slate-500 dark:text-zinc-400">
                  {text(
                    path.description,
                    "A focused sequence of learning courses.",
                  )}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    {progress}%
                  </span>
                </div>
              </div>
              <ol className="flex-1 divide-y divide-slate-100 px-5 dark:divide-zinc-800">
                {steps.length ? (
                  steps.map((course, index) => (
                    <li key={course.id} className="flex items-start gap-3 py-4">
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white shadow-sm",
                          pathColors[pathIndex % pathColors.length],
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {text(course.title, "Untitled course")}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                          {text(
                            recordValue(
                              course,
                              "durationHours",
                              "duration_hours",
                            ),
                            "0",
                          )}{" "}
                          hours · {text(course.category, "General")}
                        </p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                    The configured courses are no longer available.
                  </li>
                )}
              </ol>
              <div className="border-t border-slate-100 p-4 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => onConfigurePath(path)}
                >
                  <PencilSquareIcon className="mr-2 h-4 w-4" />
                  Configure courses
                </Button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function AchievementJourney({
  courses,
  enrollments,
  certificates,
  career,
}: {
  courses: LearningRecord[];
  enrollments: LearningRecord[];
  certificates: LearningRecord[];
  career: CareerSnapshot | null;
}) {
  const [showRequirements, setShowRequirements] = React.useState(false);
  const [showRecommendationReason, setShowRecommendationReason] =
    React.useState(false);
  const progressAverage = enrollments.length
    ? Math.round(
        enrollments.reduce(
          (total, record) => total + numberValue(record.progress),
          0,
        ) / enrollments.length,
      )
    : 0;
  const selectedGoalTitle = career?.goal?.title.replace(
    /^Career goal:\s*/i,
    "",
  );
  const targetRole =
    career?.roles.find((role) => role.title === selectedGoalTitle) ||
    career?.roles[0] ||
    null;
  const currentReadiness = Math.min(
    100,
    Math.max(
      0,
      progressAverage +
        Math.min(
          20,
          certificates.filter(
            (item) => normalizeStatus(item.status) === "active",
          ).length * 4,
        ),
    ),
  );
  const targetReadiness = targetRole?.readiness || 0;
  const nextReadiness = targetReadiness
    ? Math.min(100, Math.round((currentReadiness + targetReadiness) / 2))
    : currentReadiness;
  const completedEnrollments = enrollments.filter(
    (item) => normalizeStatus(item.status) === "completed",
  );
  const completedCourses = courses.filter((course) =>
    completedEnrollments.some(
      (item) =>
        String(recordValue(item, "courseId", "course_id")) === course.id,
    ),
  );
  const skillDefinitions = targetRole
    ? [
        ...targetRole.strengths.map((skill, index) => ({
          ...skill,
          strength: "Demonstrated",
          impact: Math.max(5, 14 - index * 2),
        })),
        ...targetRole.gaps.map((skill, index) => ({
          ...skill,
          strength: "To build",
          impact: Math.max(4, 10 - index * 2),
        })),
      ].slice(0, 5)
    : career?.evidence.skills
        .map((title, index) => ({
          title,
          detail: "Recorded on your employee profile.",
          strength: "Profile skill",
          impact: Math.max(4, 12 - index * 2),
        }))
        .slice(0, 5) || [];
  const skillIcons = [
    UserGroupIcon,
    ChartBarIcon,
    MapPinIcon,
    AcademicCapIcon,
    RectangleGroupIcon,
  ];
  const skillAreas = skillDefinitions.map((skill, index) => {
    const skillWords = skill.title
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3);
    const course = completedCourses.find((item) =>
      skillWords.some((word) =>
        `${text(item.title, "")} ${text(item.category, "")} ${text(item.description, "")}`
          .toLowerCase()
          .includes(word),
      ),
    );
    const enrollment = course
      ? completedEnrollments.find(
          (item) =>
            String(recordValue(item, "courseId", "course_id")) === course.id,
        )
      : undefined;
    return {
      title: skill.title,
      description: skill.detail,
      impact: skill.impact,
      strength: skill.strength,
      icon: skillIcons[index % skillIcons.length],
      evidence: course
        ? text(course.title, "Completed learning")
        : "No completed course evidence yet",
      completedAt: enrollment
        ? formatDate(recordValue(enrollment, "completedAt", "completed_at"))
        : null,
    };
  });
  const activeCertificates = certificates.filter(
    (item) => normalizeStatus(item.status) === "active",
  ).length;
  const recommendedCourse =
    targetRole?.course ||
    courses.find(
      (course) =>
        isCourseActive(course) &&
        !enrollments.some(
          (item) =>
            String(recordValue(item, "courseId", "course_id")) === course.id,
        ),
    ) ||
    null;
  const currentRoleTitle =
    career?.employee.jobTitle || "Employee role not linked";
  const targetRoleTitle = targetRole?.title || "Choose a career goal";

  return (
    <div
      data-no-localize
      className="min-h-full bg-[#fbfaf6] text-[#15213a] dark:bg-[#151924] dark:text-[#f5f3ed]"
    >
      <section className="relative min-h-[760px] overflow-hidden border-b border-[#dedbd2] dark:border-white/10 sm:min-h-[455px]">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-full bg-cover bg-center opacity-95 lg:w-[58%]"
          style={{ backgroundImage: "url(/learning/adventure-trail-hero.png)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-full bg-[#fbfaf6] dark:bg-[#151924] lg:w-[47%]"
        />

        <div className="relative z-10 px-6 pt-10 lg:px-14">
          <p className="text-sm font-semibold text-[#4f6485] dark:text-zinc-400">
            {new Intl.DateTimeFormat("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            }).format(new Date())}
          </p>
          <h1 className="mt-4 text-[clamp(2.5rem,4vw,3.2rem)] font-semibold leading-none tracking-[-.055em]">
            Your career path
          </h1>
          <p className="mt-4 max-w-md text-lg leading-7 text-[#53627a] dark:text-zinc-300">
            Your achievements show you’re building the skills
            <br className="hidden sm:block" /> to take the next step.
          </p>
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-[88px] left-[10%] right-[13%] z-10 border-t-2 border-dashed border-indigo-500/80 lg:-rotate-[7deg]"
        />
        <div className="relative z-20 mx-auto mt-14 grid max-w-[1220px] gap-5 px-6 sm:grid-cols-3 lg:px-8">
          {[
            {
              eyebrow: "Current role",
              title: currentRoleTitle,
              value: currentReadiness,
              icon: CheckCircleIcon,
              offset: "lg:translate-y-12",
            },
            {
              eyebrow: "Development step",
              title: targetRole?.intermediateRole || "Build a learning plan",
              value: nextReadiness,
              icon: MapPinIcon,
              offset: "lg:-translate-y-2",
            },
            {
              eyebrow: "Career goal",
              title: targetRoleTitle,
              value: targetReadiness,
              icon: TrophyIcon,
              offset: "lg:-translate-y-28",
            },
          ].map((role) => {
            const RoleIcon = role.icon;
            return (
              <article
                key={role.title}
                className={cn(
                  "relative mx-auto w-full max-w-[205px] rounded-[10px] border border-[#ddd8ce] bg-white p-4 shadow-[0_6px_16px_rgba(37,45,68,.1)] dark:border-white/10 dark:bg-[#202532] sm:mx-0",
                  role.offset,
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-[.12em] text-indigo-600 dark:text-indigo-300">
                  {role.eyebrow}
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-.025em]">
                  {role.title}
                </h2>
                <p className="mt-2 text-2xl font-semibold text-indigo-600 dark:text-indigo-300">
                  {role.value}%
                </p>
                <p className="mt-1 text-xs text-[#657087] dark:text-zinc-400">
                  Role readiness
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e7e5df] dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-indigo-600"
                    style={{ width: `${role.value}%` }}
                  />
                </div>
                <span className="absolute -bottom-14 left-1/2 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full border-4 border-[#fbfaf6] bg-[#526277] text-white shadow-sm dark:border-[#151924]">
                  <RoleIcon className="h-4 w-4" />
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-8 px-6 py-7 lg:px-14 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-[#dcd9d1] pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-white/10">
            <div>
              <h2 className="text-xl font-semibold tracking-[-.025em]">
                Your achievements build readiness
              </h2>
              <p className="mt-1 text-sm text-[#60708a] dark:text-zinc-400">
                Each completed course and verified credential becomes evidence
                for {targetRoleTitle}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRequirements((value) => !value)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-300"
            >
              View role requirements{" "}
              <ChevronRightIcon
                className={cn(
                  "h-4 w-4 transition-transform",
                  showRequirements && "rotate-90",
                )}
              />
            </button>
          </div>

          <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.15fr)_150px] gap-4 border-b border-[#dcd9d1] px-1 py-3 text-[10px] font-bold uppercase tracking-[.09em] text-[#68758c] dark:border-white/10 dark:text-zinc-500 sm:grid">
            <span>Skill area</span>
            <span>Evidence you’ve earned</span>
            <span>Impact on readiness</span>
          </div>
          <div>
            {skillAreas.map((skill) => {
              const SkillIcon = skill.icon;
              return (
                <article
                  key={skill.title}
                  className="grid grid-cols-1 gap-3 border-b border-[#e3e0d9] py-3.5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.15fr)_150px] sm:items-center sm:gap-4 dark:border-white/10"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-indigo-600 text-white">
                      <SkillIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">
                        {skill.title}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-[#67738a] dark:text-zinc-400">
                        {skill.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex min-w-0 gap-2.5">
                    <BookOpenIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#5e6b83]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {skill.evidence}
                      </p>
                      <p className="text-xs text-[#67738a] dark:text-zinc-400">
                        {skill.completedAt
                          ? `Completed ${skill.completedAt}`
                          : "Complete a relevant course to add evidence"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span
                      className={cn(
                        "font-semibold",
                        skill.strength === "Demonstrated"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : skill.strength === "To build"
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-[#60708a] dark:text-zinc-400",
                      )}
                    >
                      {skill.strength}
                    </span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                      +{skill.impact}%
                    </span>
                    <ChevronDownIcon className="h-4 w-4 text-[#68758c]" />
                  </div>
                </article>
              );
            })}
          </div>
          {skillAreas.length === 0 && (
            <EmptyInline
              title="No career evidence yet"
              description="Link an employee profile, add skills, or choose a career goal to build this view."
            />
          )}
          {showRequirements && (
            <div className="mt-4 rounded-[10px] border border-indigo-200 bg-indigo-50/70 p-4 text-sm leading-6 text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200">
              {targetRoleTitle} readiness combines position requirements,
              completed learning, profile skills, and verified credentials. You
              currently have {activeCertificates} active certificate
              {activeCertificates === 1 ? "" : "s"} contributing to your
              profile.
            </div>
          )}
        </div>

        <aside className="h-fit rounded-[12px] border border-[#ddd8ce] bg-white p-7 shadow-[0_8px_24px_rgba(37,45,68,.05)] dark:border-white/10 dark:bg-[#1d222e]">
          <h2 className="text-xl font-semibold tracking-[-.025em]">
            Next best move
          </h2>
          <div className="mt-7 flex items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.12em] text-indigo-600 dark:text-indigo-300">
                Recommended for you
              </p>
              <h3 className="mt-2 text-2xl font-semibold leading-7 tracking-[-.035em]">
                {recommendedCourse
                  ? text(recommendedCourse.title, "Recommended learning")
                  : "Choose your next course"}
              </h3>
            </div>
            <Image
              src="/learning/achievements/career-growth-badge.png"
              alt="Career growth achievement"
              width={112}
              height={112}
              unoptimized
              className="h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28"
            />
          </div>
          <p className="mt-4 text-sm leading-6 text-[#5e6b82] dark:text-zinc-400">
            {recommendedCourse
              ? text(
                  recommendedCourse.description,
                  `Build evidence for ${targetRoleTitle}.`,
                )
              : "Browse the catalog and start building evidence toward your career goal."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-[#55647c] dark:text-zinc-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f1f4] px-3 py-1.5 dark:bg-white/10">
              <ClockIcon className="h-4 w-4" />
              {recommendedCourse
                ? `${numberValue(recordValue(recommendedCourse, "durationHours", "duration_hours")) || 0}h`
                : "Self-paced"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f1f4] px-3 py-1.5 dark:bg-white/10">
              <BookOpenIcon className="h-4 w-4" />
              {recommendedCourse
                ? text(recommendedCourse.category, "General")
                : "Course catalog"}
            </span>
          </div>
          <Button
            asChild
            className="mt-6 h-12 w-full rounded-[8px] bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Link
              href={
                recommendedCourse?.id
                  ? `/learning/courses/${recommendedCourse.id}`
                  : "/learning/courses"
              }
            >
              {recommendedCourse
                ? "Start recommended course"
                : "Browse courses"}{" "}
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setShowRecommendationReason((value) => !value)}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#4f5f77] hover:text-indigo-700 dark:text-zinc-300 dark:hover:text-indigo-300"
          >
            Why this course?{" "}
            <ChevronRightIcon
              className={cn(
                "h-4 w-4 transition-transform",
                showRecommendationReason && "rotate-90",
              )}
            />
          </button>
          {showRecommendationReason && (
            <p className="mt-3 border-t border-[#e5e2da] pt-3 text-xs leading-5 text-[#66738a] dark:border-white/10 dark:text-zinc-400">
              This recommendation is selected from active courses by matching
              the configured requirements for {targetRoleTitle} against the
              skills you still need to build.
            </p>
          )}
        </aside>
      </section>
    </div>
  );
}

function CertificateRegister({
  certificates,
  mode,
  isSaving,
  onAdd,
  onVerify,
  onRequestChanges,
}: {
  certificates: LearningRecord[];
  mode: "employee" | "trusted";
  isSaving: boolean;
  onAdd: () => void;
  onVerify: (certificateId: string) => void;
  onRequestChanges: (certificateId: string) => void;
}) {
  if (mode === "employee")
    return (
      <EmployeeCertificateCommandCenter
        certificates={certificates}
        isSaving={isSaving}
        onAdd={onAdd}
        onVerify={onVerify}
        onRequestChanges={onRequestChanges}
      />
    );
  return (
    <LegacyCertificateRegister
      certificates={certificates}
      mode={mode}
      isSaving={isSaving}
      onAdd={onAdd}
      onVerify={onVerify}
    />
  );
}

function LegacyCertificateRegister({
  certificates,
  mode,
  isSaving,
  onAdd,
  onVerify,
}: {
  certificates: LearningRecord[];
  mode: "employee" | "trusted";
  isSaving: boolean;
  onAdd: () => void;
  onVerify: (certificateId: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);
  const visibleCertificates = certificates.filter((item) =>
    mode === "trusted"
      ? isTrustedCertificate(item)
      : !isTrustedCertificate(item),
  );
  const filtered = visibleCertificates.filter((item) => {
    const matchesQuery =
      `${text(item.name, "")} ${text(item.issuer, "")} ${text(recordValue(item, "employeeId", "employee_id"), "")}`
        .toLowerCase()
        .includes(query.toLowerCase());
    return (
      matchesQuery &&
      (status === "all" || normalizeStatus(item.status) === status)
    );
  });
  const sortResolvers = React.useMemo<SortValueResolverMap<LearningRecord>>(
    () => ({
      credential: (item) => text(item.name, ""),
      identity: (item) =>
        mode === "trusted"
          ? recordValue(item, "validityMonths", "validity_months")
            ? text(recordValue(item, "validityMonths", "validity_months"), "0")
            : text(item.issuer, "")
          : text(recordValue(item, "employeeId", "employee_id"), ""),
      siteOrIssued: (item) =>
        mode === "trusted"
          ? text(recordValue(item, "verificationUrl", "verification_url"), "")
          : text(recordValue(item, "issuedAt", "issued_at"), ""),
      approveOrExpires: (item) =>
        mode === "trusted"
          ? text(recordValue(item, "verifiedAt", "verified_at"), "")
          : text(recordValue(item, "expiresAt", "expires_at"), ""),
      status: (item) => text(item.status, ""),
      hrVerification: (item) =>
        text(
          recordValue(item, "verificationStatus", "verification_status"),
          "",
        ),
    }),
    [mode],
  );
  const sorted = React.useMemo(
    () => sortRowsByColumn(filtered, sortColumn, sortDirection, sortResolvers),
    [filtered, sortColumn, sortDirection, sortResolvers],
  );
  const handleSort = (column: string | null, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);
  };
  const active = visibleCertificates.filter(
    (item) => normalizeStatus(item.status) === "active",
  ).length;
  const expiring =
    mode === "employee"
      ? visibleCertificates.filter((item) => {
          const days = daysUntil(recordValue(item, "expiresAt", "expires_at"));
          return days !== null && days >= 0 && days <= 60;
        }).length
      : 0;

  return (
    <div className="space-y-5">
      <section className="grid overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-[0_8px_24px_rgba(74,62,119,0.07)] dark:border-violet-900/40 dark:bg-zinc-900/50 sm:grid-cols-3">
        <InlineMetric
          label={
            mode === "trusted"
              ? "Trusted certificates"
              : "Employee certificates"
          }
          value={visibleCertificates.length}
          icon={mode === "trusted" ? ShieldCheckIcon : CheckBadgeIcon}
        />
        <InlineMetric
          label={mode === "trusted" ? "Active" : "Awaiting HR verification"}
          value={
            mode === "trusted"
              ? active
              : visibleCertificates.filter(
                  (item) =>
                    normalizeStatus(
                      recordValue(
                        item,
                        "verificationStatus",
                        "verification_status",
                      ),
                    ) === "pending",
                ).length
          }
          icon={mode === "trusted" ? CheckCircleIcon : ClockIcon}
          border
        />
        <InlineMetric
          label={mode === "trusted" ? "With validity policy" : "Expiring soon"}
          value={
            mode === "trusted"
              ? visibleCertificates.filter((item) =>
                  Boolean(
                    recordValue(item, "validityMonths", "validity_months"),
                  ),
                ).length
              : expiring
          }
          icon={CalendarDaysIcon}
          border
        />
      </section>
      <section className="rounded-[8px] border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900/70 dark:bg-indigo-950/30 dark:text-indigo-200">
        {mode === "trusted"
          ? "This catalog defines qualification types and recognized issuers. Dates belong to each employee certificate, not to this catalog."
          : "Employee certificates stay here after HR verification. Issue and expiry dates apply to the individual employee record."}
      </section>
      <section className="flex flex-col gap-3 rounded-[8px] border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Search certificates</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              mode === "trusted"
                ? "Search credential or issuer"
                : "Search credential, issuer, or employee ID"
            }
            className="h-10 bg-slate-50 pl-9 dark:bg-zinc-900"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="archived">Archived</option>
        </select>
      </section>

      {filtered.length ? (
        <section className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <SortableNativeHeader
                    column="credential"
                    label="Credential"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="px-5 py-3"
                  />
                  <SortableNativeHeader
                    column="identity"
                    label={mode === "trusted" ? "Validity policy" : "Employee"}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="px-5 py-3"
                  />
                  <SortableNativeHeader
                    column="siteOrIssued"
                    label={mode === "trusted" ? "Verification site" : "Issued"}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="px-5 py-3"
                  />
                  <SortableNativeHeader
                    column="approveOrExpires"
                    label={mode === "trusted" ? "Approved" : "Expires"}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="px-5 py-3"
                  />
                  <SortableNativeHeader
                    column="status"
                    label="Status"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="px-5 py-3"
                  />
                  <SortableNativeHeader
                    column="hrVerification"
                    label="HR verification"
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="px-5 py-3"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {sorted.map((certificate) => {
                  const expiresAt = recordValue(
                    certificate,
                    "expiresAt",
                    "expires_at",
                  );
                  const days = daysUntil(expiresAt);
                  const verificationStatus =
                    recordValue(
                      certificate,
                      "verificationStatus",
                      "verification_status",
                    ) || "pending";
                  return (
                    <tr
                      key={certificate.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-[8px] bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                            <CheckBadgeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {text(certificate.name, "Untitled certificate")}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                              {text(certificate.issuer, "Issuer not recorded")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-600 dark:text-zinc-300">
                        {mode === "trusted"
                          ? recordValue(
                              certificate,
                              "validityMonths",
                              "validity_months",
                            )
                            ? `${text(recordValue(certificate, "validityMonths", "validity_months"))} months`
                            : "Does not expire / varies"
                          : text(
                              recordValue(
                                certificate,
                                "employeeId",
                                "employee_id",
                              ),
                            )}
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-zinc-400">
                        {mode === "trusted" ? (
                          recordValue(
                            certificate,
                            "verificationUrl",
                            "verification_url",
                          ) ? (
                            <a
                              className="font-medium text-indigo-700 hover:underline dark:text-indigo-300"
                              href={String(
                                recordValue(
                                  certificate,
                                  "verificationUrl",
                                  "verification_url",
                                ),
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open site
                            </a>
                          ) : (
                            "Not recorded"
                          )
                        ) : (
                          formatDate(
                            recordValue(certificate, "issuedAt", "issued_at"),
                          )
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-600 dark:text-zinc-300">
                          {mode === "trusted"
                            ? formatDate(
                                recordValue(
                                  certificate,
                                  "verifiedAt",
                                  "verified_at",
                                ),
                              )
                            : formatDate(expiresAt)}
                        </p>
                        {mode === "employee" &&
                          days !== null &&
                          days >= 0 &&
                          days <= 60 && (
                            <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                              {days} days remaining
                            </p>
                          )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={certificate.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <StatusPill status={verificationStatus} />
                            {verificationStatus === "verified" && (
                              <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                                Verified by HR ·{" "}
                                {formatDate(
                                  recordValue(
                                    certificate,
                                    "verifiedAt",
                                    "verified_at",
                                  ),
                                )}
                              </p>
                            )}
                          </div>
                          {mode === "employee" &&
                            verificationStatus !== "verified" &&
                            normalizeStatus(certificate.status) !==
                              "archived" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isSaving}
                                onClick={() => onVerify(certificate.id)}
                              >
                                <ShieldCheckIcon className="mr-2 h-4 w-4" />
                                Verify
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : visibleCertificates.length ? (
        <EmptyInline
          title="No credentials match"
          description="Try another search or status filter."
        />
      ) : (
        <EmptyState
          icon={mode === "trusted" ? ShieldCheckIcon : CheckBadgeIcon}
          title={
            mode === "trusted"
              ? "Create the trusted certificate register"
              : "No employee certificates awaiting review"
          }
          description={
            mode === "trusted"
              ? "Register a recognized qualification type, its issuer, and optional standard validity policy."
              : "Add an employee credential here, then verify it after HR reviews the evidence."
          }
          action={
            mode === "trusted"
              ? "Register trusted certificate"
              : "Add employee certificate"
          }
          onAction={onAdd}
        />
      )}
    </div>
  );
}

function EmployeeCertificateCommandCenter({
  certificates,
  isSaving,
  onAdd,
  onVerify,
  onRequestChanges,
}: {
  certificates: LearningRecord[];
  isSaving: boolean;
  onAdd: () => void;
  onVerify: (certificateId: string) => void;
  onRequestChanges: (certificateId: string) => void;
}) {
  const employeeCertificates = React.useMemo(
    () => certificates.filter((item) => !isTrustedCertificate(item)),
    [certificates],
  );
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [tab, setTab] = React.useState<"review" | "active" | "expired">(
    "review",
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = React.useState(false);

  const certificateBucket = React.useCallback((item: LearningRecord) => {
    const verification = normalizeStatus(
      recordValue(item, "verificationStatus", "verification_status"),
    );
    const days = daysUntil(recordValue(item, "expiresAt", "expires_at"));
    if (
      normalizeStatus(item.status) === "expired" ||
      (days !== null && days < 0)
    )
      return "expired";
    if (verification !== "verified") return "review";
    return "active";
  }, []);
  const counts = React.useMemo(
    () => ({
      review: employeeCertificates.filter(
        (item) => certificateBucket(item) === "review",
      ).length,
      active: employeeCertificates.filter(
        (item) => certificateBucket(item) === "active",
      ).length,
      expired: employeeCertificates.filter(
        (item) => certificateBucket(item) === "expired",
      ).length,
    }),
    [certificateBucket, employeeCertificates],
  );
  const expiring = employeeCertificates.filter((item) => {
    const days = daysUntil(recordValue(item, "expiresAt", "expires_at"));
    return days !== null && days >= 0 && days <= 60;
  }).length;
  const rows = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return employeeCertificates
      .filter((item) => certificateBucket(item) === tab)
      .filter(
        (item) =>
          statusFilter === "all" ||
          normalizeStatus(item.status) === statusFilter,
      )
      .filter((item) =>
        `${text(item.name, "")} ${text(item.issuer, "")} ${text(recordValue(item, "employeeName", "employee_name"), "")} ${text(recordValue(item, "employeeId", "employee_id"), "")}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .sort((a, b) =>
        String(recordValue(b, "issuedAt", "issued_at") || "").localeCompare(
          String(recordValue(a, "issuedAt", "issued_at") || ""),
        ),
      );
  }, [certificateBucket, employeeCertificates, query, statusFilter, tab]);
  const selected =
    rows.find((item) => item.id === selectedId) || rows[0] || null;
  const selectCertificate = (id: string) => {
    setSelectedId(id);
    setInspectorOpen(true);
  };
  const employeeIdentity = selected
    ? text(
        recordValue(selected, "employeeName", "employee_name"),
        `Employee ${text(recordValue(selected, "employeeId", "employee_id"), "").slice(0, 8) || "record"}`,
      )
    : "";
  const employeeEmail = selected
    ? text(
        recordValue(selected, "employeeEmail", "employee_email"),
        text(
          recordValue(selected, "employeeId", "employee_id"),
          "Employee ID unavailable",
        ),
      )
    : "";
  const verificationStatus = selected
    ? normalizeStatus(
        recordValue(selected, "verificationStatus", "verification_status"),
      )
    : "";
  const showReferencePortrait = Boolean(
    selected && /first aid|cpr/i.test(text(selected.name, "")),
  );
  const verificationUrl = selected
    ? text(recordValue(selected, "verificationUrl", "verification_url"), "")
    : "";

  const exportRegister = () => {
    const header = [
      "Certificate",
      "Employee",
      "Issuer",
      "Issued",
      "Expires",
      "Status",
      "HR verification",
    ];
    const body = rows.map((item) => [
      text(item.name, ""),
      text(
        recordValue(item, "employeeName", "employee_name"),
        text(recordValue(item, "employeeId", "employee_id"), ""),
      ),
      text(item.issuer, ""),
      text(recordValue(item, "issuedAt", "issued_at"), ""),
      text(recordValue(item, "expiresAt", "expires_at"), ""),
      text(item.status, ""),
      text(recordValue(item, "verificationStatus", "verification_status"), ""),
    ]);
    const csv = [header, ...body]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `employee-certificates-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-[#f8fafc] px-4 pb-10 pt-6 font-sans text-[#172033] dark:bg-[#09111d] dark:text-zinc-50 sm:px-7 lg:px-8">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[2rem] font-bold leading-tight tracking-[-.04em] sm:text-[2.35rem]">
            Employee certificates
          </h1>
          <p className="mt-1.5 text-[15px] text-[#6f7886] dark:text-zinc-400">
            Verify employee credentials, review submitted evidence, and track
            expiration risk.
          </p>
          <p className="mt-1 text-xs text-[#7d8795] dark:text-zinc-500">
            Data as of {formatDate(new Date())}
          </p>
        </div>
        <Button
          type="button"
          onClick={onAdd}
          className="h-11 bg-[#316be8] px-5 font-semibold hover:bg-[#285dce]"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Add certificate
        </Button>
      </header>

      <section
        aria-label="Certificate summary"
        className="mt-7 flex flex-wrap gap-x-8 gap-y-4 border-b border-[#d5dce5] pb-6 dark:border-[#263447]"
      >
        <div className="flex min-w-32 items-center gap-3">
          <CheckBadgeIcon className="h-6 w-6 text-[#66758b]" />
          <div>
            <p className="text-xl font-bold">{employeeCertificates.length}</p>
            <p className="text-xs text-[#68768a] dark:text-zinc-400">
              Total certificates
            </p>
          </div>
        </div>
        <div className="flex min-w-36 items-center gap-3 border-l border-[#d5dce5] pl-8 dark:border-[#263447]">
          <ClockIcon className="h-6 w-6 text-amber-500" />
          <div>
            <p className="text-xl font-bold">{counts.review}</p>
            <p className="text-xs text-[#68768a] dark:text-zinc-400">
              Awaiting review
            </p>
          </div>
        </div>
        <div className="flex min-w-40 items-center gap-3 border-l border-[#d5dce5] pl-8 dark:border-[#263447]">
          <ExclamationCircleIcon className="h-6 w-6 text-rose-500" />
          <div>
            <p className="text-xl font-bold">{expiring}</p>
            <p className="text-xs text-[#68768a] dark:text-zinc-400">
              Expiring within 60 days
            </p>
          </div>
        </div>
      </section>

      <div
        className={cn(
          "mt-6 grid gap-4",
          inspectorOpen && selected
            ? "xl:grid-cols-[minmax(0,1.7fr)_minmax(390px,1fr)]"
            : "grid-cols-1",
        )}
      >
        <section className="min-w-0 overflow-hidden rounded-[8px] border border-[#cbd3de] bg-white dark:border-[#314056] dark:bg-[#101a28]">
          <div className="flex flex-col gap-3 border-b border-[#d5dce5] p-4 dark:border-[#314056] sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#788598]" />
              <span className="sr-only">Search certificates</span>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search certificates, employees, or issuers"
                className="h-10 border-[#aeb9c7] bg-transparent pl-9 shadow-none dark:border-[#415069]"
              />
            </label>
            <label className="relative">
              <FunnelIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#788598]" />
              <span className="sr-only">Filter by status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 min-w-40 appearance-none rounded-md border border-[#aeb9c7] bg-transparent pl-9 pr-8 text-sm font-semibold dark:border-[#415069]"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <Button
              type="button"
              variant="ghost"
              onClick={exportRegister}
              className="h-10"
            >
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
          <nav
            aria-label="Certificate review state"
            className="flex gap-6 border-b border-[#d5dce5] px-4 dark:border-[#314056]"
          >
            {(
              [
                { id: "review", label: "Needs review", count: counts.review },
                { id: "active", label: "Active", count: counts.active },
                { id: "expired", label: "Expired", count: counts.expired },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setSelectedId(null);
                }}
                className={cn(
                  "relative py-3 text-sm font-semibold text-[#69778b] dark:text-zinc-400",
                  tab === item.id &&
                    "text-[#172033] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#316be8] dark:text-white",
                )}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </nav>

          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-[#d5dce5] text-xs text-[#69778b] dark:border-[#314056] dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Certificate</th>
                    <th className="px-4 py-3 font-medium">Employee</th>
                    <th className="px-4 py-3 font-medium">Issuer</th>
                    <th className="px-4 py-3 font-medium">Issue date</th>
                    <th className="px-4 py-3 font-medium">Expiry date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d9dfe7] dark:divide-[#29374a]">
                  {rows.map((certificate) => {
                    const isSelected =
                      certificate.id === selected?.id && inspectorOpen;
                    const certificateVerification = normalizeStatus(
                      recordValue(
                        certificate,
                        "verificationStatus",
                        "verification_status",
                      ),
                    );
                    const employeeName = text(
                      recordValue(certificate, "employeeName", "employee_name"),
                      `Employee ${text(recordValue(certificate, "employeeId", "employee_id"), "").slice(0, 8) || "record"}`,
                    );
                    return (
                      <tr
                        key={certificate.id}
                        onClick={() => selectCertificate(certificate.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ")
                            selectCertificate(certificate.id);
                        }}
                        tabIndex={0}
                        className={cn(
                          "cursor-pointer outline-none transition-colors hover:bg-[#f3f7fd] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#316be8] dark:hover:bg-[#152338]",
                          isSelected &&
                            "bg-[#eaf2ff] shadow-[inset_3px_0_0_#316be8] dark:bg-[#142744]",
                        )}
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-semibold">
                            {text(certificate.name, "Untitled certificate")}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#738095] dark:text-zinc-400">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                certificateVerification === "verified"
                                  ? "bg-lime-500"
                                  : certificateVerification === "rejected"
                                    ? "bg-rose-500"
                                    : "bg-amber-500",
                              )}
                            />
                            {certificateVerification === "verified"
                              ? "Verified"
                              : certificateVerification === "rejected"
                                ? "Changes requested"
                                : "Awaiting review"}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium">{employeeName}</p>
                          <p className="mt-1 text-xs text-[#738095] dark:text-zinc-400">
                            {text(
                              recordValue(
                                certificate,
                                "employeeId",
                                "employee_id",
                              ),
                              "",
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-[#536176] dark:text-zinc-300">
                          {text(certificate.issuer, "Issuer not recorded")}
                        </td>
                        <td className="px-4 py-3.5 text-[#536176] dark:text-zinc-300">
                          {formatDate(
                            recordValue(certificate, "issuedAt", "issued_at"),
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-[#536176] dark:text-zinc-300">
                          {formatDate(
                            recordValue(certificate, "expiresAt", "expires_at"),
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusPill
                            status={
                              certificateVerification === "pending"
                                ? "pending review"
                                : certificate.status
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-16">
              {employeeCertificates.length ? (
                <EmptyInline
                  title={`No ${tab === "review" ? "certificates need review" : `${tab} certificates`}`}
                  description="Try another search or filter."
                />
              ) : (
                <EmptyState
                  icon={CheckBadgeIcon}
                  title="No employee certificates yet"
                  description="Add an employee credential, then verify it after HR reviews the evidence."
                  action="Add employee certificate"
                  onAction={onAdd}
                />
              )}
            </div>
          )}
        </section>

        {inspectorOpen && selected && (
          <aside className="h-fit overflow-hidden rounded-[8px] border border-[#cbd3de] bg-white dark:border-[#314056] dark:bg-[#101a28] xl:sticky xl:top-24">
            <div className="flex items-center justify-between border-b border-[#d5dce5] px-4 py-3 dark:border-[#314056]">
              <h2 className="font-bold">Evidence inspector</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setInspectorOpen(false)}
                aria-label="Close evidence inspector"
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3 border-b border-[#d5dce5] px-4 py-4 dark:border-[#314056]">
              {showReferencePortrait ? (
                <Image
                  src="/learning/certificates/maya-chen-avatar.png"
                  alt=""
                  width={54}
                  height={54}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[#e8edf4] text-sm font-bold text-[#526177] dark:bg-[#1d2a3d] dark:text-zinc-200">
                  {employeeIdentity
                    .split(/\s+/)
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-bold">
                  {employeeIdentity}
                </p>
                <p className="mt-0.5 truncate text-xs text-[#6f7c90] dark:text-zinc-400">
                  {employeeEmail}
                </p>
                <p className="mt-1 text-xs text-[#6f7c90] dark:text-zinc-400">
                  {text(
                    recordValue(selected, "employeeRole", "employee_role"),
                    "Employee credential record",
                  )}
                </p>
              </div>
            </div>
            <div className="border-b border-[#d5dce5] px-4 py-4 text-sm dark:border-[#314056]">
              <h3 className="font-bold">Certificate details</h3>
              <dl className="mt-3 grid grid-cols-[112px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs">
                <dt className="text-[#738095]">Certificate</dt>
                <dd className="font-medium">
                  {text(selected.name, "Untitled certificate")}
                </dd>
                <dt className="text-[#738095]">Issuer</dt>
                <dd>{text(selected.issuer, "Not recorded")}</dd>
                <dt className="text-[#738095]">Credential ID</dt>
                <dd className="font-mono">
                  {selected.id.slice(0, 18).toUpperCase()}
                </dd>
                <dt className="text-[#738095]">Issue date</dt>
                <dd>
                  {formatDate(recordValue(selected, "issuedAt", "issued_at"))}
                </dd>
                <dt className="text-[#738095]">Expiry date</dt>
                <dd>
                  {formatDate(recordValue(selected, "expiresAt", "expires_at"))}
                </dd>
                <dt className="text-[#738095]">Status</dt>
                <dd>
                  <StatusPill status={verificationStatus} />
                </dd>
              </dl>
            </div>
            <div className="grid gap-4 border-b border-[#d5dce5] p-4 dark:border-[#314056] sm:grid-cols-[minmax(0,1fr)_minmax(160px,.8fr)] xl:grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_minmax(160px,.8fr)]">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Evidence</h3>
                  {verificationUrl && (
                    <a
                      href={verificationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#316be8] hover:underline"
                    >
                      Open original
                    </a>
                  )}
                </div>
                <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-[6px] border border-[#cbd3de] bg-[#eef1f5] dark:border-[#415069] dark:bg-[#172335]">
                  <Image
                    src="/learning/certificates/first-aid-evidence.png"
                    alt="Certificate evidence preview"
                    fill
                    sizes="340px"
                    className="object-cover object-top"
                  />
                </div>
                <p className="mt-2 flex items-center gap-2 truncate text-xs text-[#6f7c90] dark:text-zinc-400">
                  <DocumentMagnifyingGlassIcon className="h-4 w-4 shrink-0" />
                  {verificationUrl
                    ? "Submitted evidence link"
                    : "Evidence preview"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold">Verification checks</h3>
                <ul className="mt-3 space-y-3 text-xs">
                  {[
                    ["Credential format", Boolean(selected.id)],
                    [
                      "Issue date is valid",
                      Boolean(recordValue(selected, "issuedAt", "issued_at")),
                    ],
                    [
                      "Expiry date is valid",
                      Boolean(recordValue(selected, "expiresAt", "expires_at")),
                    ],
                    ["Issuer recorded", Boolean(selected.issuer)],
                  ].map(([label, passed]) => (
                    <li key={String(label)} className="flex items-center gap-2">
                      <CheckCircleIcon
                        className={cn(
                          "h-4 w-4",
                          passed ? "text-lime-500" : "text-[#7a879a]",
                        )}
                      />
                      <span>{String(label)}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-amber-500" />
                    <span>Authenticity review required</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              <Button
                type="button"
                className="flex-1 bg-[#316be8] hover:bg-[#285dce]"
                disabled={isSaving || verificationStatus === "verified"}
                onClick={() => onVerify(selected.id)}
              >
                <ShieldCheckIcon className="mr-2 h-4 w-4" />
                {verificationStatus === "verified"
                  ? "Verified"
                  : "Verify certificate"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-[#93a0b2] bg-transparent"
                disabled={isSaving || verificationStatus === "rejected"}
                onClick={() => onRequestChanges(selected.id)}
              >
                {verificationStatus === "rejected"
                  ? "Changes requested"
                  : "Request changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-[#93a0b2] bg-transparent"
                aria-label="More certificate actions"
              >
                <EllipsisHorizontalIcon className="h-5 w-5" />
              </Button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function OnboardingWorkspace({
  cases,
  templates,
  tasks,
  metrics,
}: {
  cases: LearningRecord[];
  templates: LearningRecord[];
  tasks: LearningRecord[];
  metrics: Array<{ label: string; value: string | number; helper?: string }>;
}) {
  const [tab, setTab] = React.useState<"people" | "templates" | "tasks">(
    "people",
  );
  const average = cases.length
    ? Math.round(
        cases.reduce((sum, item) => sum + numberValue(item.progress), 0) /
          cases.length,
      )
    : 0;
  const overdue = cases.filter((item) => {
    const days = daysUntil(recordValue(item, "targetDate", "target_date"));
    return (
      days !== null && days < 0 && normalizeStatus(item.status) !== "completed"
    );
  }).length;

  return (
    <div className="space-y-9">
      <section
        aria-label="Onboarding summary"
        className="grid border-y border-slate-200 dark:border-zinc-800 sm:grid-cols-3"
      >
        {[
          {
            label: "Active journeys",
            value: cases.filter(
              (item) =>
                normalizeStatus(item.status) !== "completed" &&
                normalizeStatus(item.status) !== "archived",
            ).length,
            icon: UserGroupIcon,
            tone: "text-[#4f83d1]",
          },
          {
            label: "Average progress",
            value: `${average}%`,
            icon: ChartBarIcon,
            tone: "text-[#3f9d77]",
          },
          {
            label: "Need attention",
            value: overdue,
            icon: CalendarDaysIcon,
            tone: "text-[#df8351]",
          },
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                "flex items-center gap-4 py-5 sm:px-6",
                index > 0 &&
                  "border-t border-slate-200 dark:border-zinc-800 sm:border-l sm:border-t-0",
              )}
            >
              <Icon
                className={cn("h-6 w-6 shrink-0 stroke-[1.6]", metric.tone)}
              />
              <div>
                <p className="text-2xl font-bold tracking-[-0.03em] text-[#172033] dark:text-zinc-50">
                  {metric.value}
                </p>
                <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-zinc-400">
                  {metric.label}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      <div className="flex gap-7 overflow-x-auto border-b border-slate-200 dark:border-zinc-800">
        {(
          [
            ["people", "New hires", cases.length],
            ["templates", "Templates", templates.length],
            ["tasks", "Task library", tasks.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "relative shrink-0 pb-3 text-sm font-semibold transition-colors",
              tab === value
                ? "text-[#316be8] dark:text-blue-300"
                : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100",
            )}
          >
            {label} <span className="ml-1 text-xs opacity-55">{count}</span>
            {tab === value && (
              <span
                className="absolute inset-x-0 -bottom-px h-0.5 bg-[#316be8]"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>

      {tab === "people" ? (
        cases.length ? (
          <section className="relative ml-3 border-l border-dashed border-[#9fb2c5] dark:border-zinc-700">
            {cases.map((item) => {
              const progress = Math.min(
                100,
                Math.max(0, numberValue(item.progress)),
              );
              const targetDate = recordValue(item, "targetDate", "target_date");
              return (
                <article
                  key={item.id}
                  className="group relative grid gap-5 border-b border-slate-200 py-6 pl-9 last:border-b-0 dark:border-zinc-800 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)] lg:items-center"
                >
                  <span
                    className="absolute -left-[7px] top-8 h-3.5 w-3.5 rounded-full border-[3px] border-[#f6f8fc] bg-[#4f83d1] transition-transform duration-200 group-hover:scale-125 dark:border-zinc-950"
                    aria-hidden="true"
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full border border-slate-300 text-sm font-bold text-[#4f83d1] dark:border-zinc-700 dark:text-blue-300">
                        {text(
                          recordValue(item, "employeeId", "employee_id"),
                          "NH",
                        )
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {text(
                            item.title ||
                              recordValue(item, "employeeId", "employee_id"),
                            "New hire",
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                          Started{" "}
                          {formatDate(
                            recordValue(item, "startDate", "start_date"),
                          )}
                        </p>
                      </div>
                    </div>
                    <StatusPill status={item.status} />
                  </div>
                  <div>
                    <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      <span>Journey progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
                      <div
                        className="h-full rounded-full bg-[#4f83d1]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDaysIcon className="h-4 w-4" />
                        Target {formatDate(targetDate)}
                      </span>
                      <span>{tasks.length} tasks available</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <OnboardingOpenEmpty
            icon={MapPinIcon}
            title="Base Camp is ready"
            description="Start an onboarding journey to place the first new hire on the trail."
          />
        )
      ) : tab === "templates" ? (
        templates.length ? (
          <section className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
            {templates.map((item) => (
              <article
                key={item.id}
                className="grid gap-4 py-5 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center"
              >
                <ClipboardDocumentCheckIcon className="h-6 w-6 text-[#4f83d1] dark:text-blue-300" />
                <div>
                  <h2 className="text-base font-semibold">
                    {text(item.name, "Untitled template")}
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-zinc-400">
                    {text(
                      item.description,
                      "A reusable onboarding journey for new employees.",
                    )}
                  </p>
                </div>
                <div className="justify-self-start sm:justify-self-end">
                  <StatusPill
                    status={
                      booleanValue(item.isActive, item.is_active)
                        ? "active"
                        : "archived"
                    }
                  />
                </div>
              </article>
            ))}
          </section>
        ) : (
          <OnboardingOpenEmpty
            icon={ClipboardDocumentCheckIcon}
            title="No routes saved yet"
            description="Templates turn a great first week into a repeatable journey."
          />
        )
      ) : tasks.length ? (
        <section className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-zinc-800 dark:border-zinc-800">
          {tasks.map((item, index) => (
            <article
              key={item.id}
              className="grid gap-3 py-5 sm:grid-cols-[32px_minmax(0,1fr)_120px_90px] sm:items-center"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e9f0fb] text-[10px] font-bold text-[#4f83d1] dark:bg-blue-950/50 dark:text-blue-300">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">
                  {text(item.title, "Untitled task")}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                  {text(item.description, "No description")}
                </p>
              </div>
              <p className="text-xs font-semibold capitalize text-slate-500 dark:text-zinc-400">
                {text(recordValue(item, "ownerRole", "owner_role"), "HR")}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Day {text(recordValue(item, "dueDay", "due_day"), "0")}
              </p>
            </article>
          ))}
        </section>
      ) : (
        <OnboardingOpenEmpty
          icon={ClipboardDocumentCheckIcon}
          title="The task trail is open"
          description="Add practical steps for HR, managers, IT, and each new employee."
        />
      )}
      {metrics[0]?.helper && (
        <p className="text-right text-[11px] text-slate-400 dark:text-zinc-600">
          {metrics[0].helper}
        </p>
      )}
    </div>
  );
}

function OnboardingOpenEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="relative min-h-48 py-10 pl-14">
      <span
        className="absolute bottom-0 left-4 top-0 border-l border-dashed border-[#9fb2c5] dark:border-zinc-700"
        aria-hidden="true"
      />
      <span
        className="absolute left-[9px] top-11 grid h-4 w-4 place-items-center rounded-full bg-[#4f83d1] ring-4 ring-[#f6f8fc] dark:ring-zinc-950"
        aria-hidden="true"
      />
      <Icon className="h-7 w-7 text-[#4f83d1] dark:text-blue-300" />
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-[#172033] dark:text-zinc-50">
        {title}
      </h2>
      <p className="mt-1 max-w-lg text-sm leading-6 text-slate-500 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}

function CourseStrip({ courses }: { courses: LearningRecord[] }) {
  if (!courses.length)
    return (
      <EmptyInline
        title="Your catalog is ready for its first course"
        description="Create a course to start building learning paths and assignments."
      />
    );
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {courses.map((course) => (
        <Link
          key={course.id}
          href="/learning/courses"
          className="group flex items-center gap-3 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-900"
        >
          <span
            className={cn("h-10 w-2 shrink-0", courseColor(course.category))}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {text(course.title, "Untitled course")}
            </span>
            <span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400">
              {text(course.category, "General")} ·{" "}
              {text(
                recordValue(course, "durationHours", "duration_hours"),
                "0",
              )}
              h
            </span>
          </span>
          <ChevronRightIcon className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1" />
        </Link>
      ))}
    </div>
  );
}

function InlineMetric({
  label,
  value,
  icon: Icon,
  border = false,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  border?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-5 py-5",
        border &&
          "border-t border-slate-200 dark:border-zinc-800 sm:border-l sm:border-t-0",
      )}
    >
      <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#272f8f] dark:text-indigo-300">
          {value}
        </p>
        <p className="text-xs text-slate-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: unknown }) {
  return <HrisStatusBadge value={status || "active"} />;
}

function LoadingSurface() {
  return (
    <section className="space-y-5" aria-label="Loading learning data">
      <div className="grid animate-pulse overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 border-slate-200 sm:border-l dark:border-zinc-800"
          />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-[8px] border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    </section>
  );
}

function EmptyInline({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 px-5 py-10 text-center dark:border-indigo-900/60 dark:bg-indigo-950/20">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-white px-6 py-16 text-center shadow-[0_12px_36px_rgba(49,107,232,0.08)] dark:border-indigo-900/50 dark:bg-zinc-900/50">
      <span
        className="absolute left-1/2 top-10 h-32 w-32 -translate-x-1/2 rounded-full bg-indigo-100/60 blur-2xl dark:bg-indigo-800/20"
        aria-hidden="true"
      />
      <div className="relative">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
          <Icon className="h-8 w-8 stroke-[1.6]" />
        </div>
        <h2 className="mt-5 text-lg font-semibold">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-zinc-400">
          {description}
        </p>
        <Button
          type="button"
          onClick={onAction}
          className="mt-6 h-11 rounded-full bg-[#316be8] px-5 hover:bg-[#285dce]"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          {action}
        </Button>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function LegacyCourseDialog({
  open,
  onOpenChange,
  form,
  setForm,
  categories,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CourseForm;
  setForm: React.Dispatch<React.SetStateAction<CourseForm>>;
  categories: LearningCourseCategory[];
  isSaving: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create a course</DialogTitle>
          <DialogDescription>
            Add a focused learning experience to the employee catalog.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="Course title">
            <Input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Security awareness essentials"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <Field label="Category">
              <CourseCategoryPicker
                value={form.category}
                categories={categories}
                onChange={(category) =>
                  setForm((current) => ({ ...current, category }))
                }
                disabled={isSaving}
              />
            </Field>
            <Field label="Duration (hours)">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.durationHours}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    durationHours: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="What employees will know or be able to do after this course"
              className="min-h-24"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Required learning">
              <select
                value={form.isRequired}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isRequired: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="false">Optional</option>
                <option value="true">Required</option>
              </select>
            </Field>
            <Field label="Catalog status">
              <select
                value={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSaving}>
            {isSaving ? "Creating…" : "Create course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CourseDialog({
  open,
  onOpenChange,
  form,
  setForm,
  categories,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CourseForm;
  setForm: React.Dispatch<React.SetStateAction<CourseForm>>;
  categories: LearningCourseCategory[];
  isSaving: boolean;
  onSubmit: (submission: CourseWizardSubmission) => Promise<string>;
}) {
  const defaultSections = React.useCallback(
    (): CourseWizardSection[] => [
      {
        title: "Getting started",
        lessonTitle: "Introduction",
        description: "",
      },
      { title: "Core lesson", lessonTitle: "Core concepts", description: "" },
      {
        title: "Knowledge check",
        lessonTitle: "Knowledge check",
        description: "",
      },
    ],
    [],
  );
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [wizardError, setWizardError] = React.useState("");
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [sections, setSections] =
    React.useState<CourseWizardSection[]>(defaultSections);

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setWizardError("");
    setCoverFile(null);
    setSections(defaultSections());
  }, [defaultSections, open]);

  if (!Array.isArray(categories)) {
    return (
      <LegacyCourseDialog
        open={open}
        onOpenChange={onOpenChange}
        form={form}
        setForm={setForm}
        categories={[]}
        isSaving={isSaving}
        onSubmit={() => void onSubmit({ coverFile, sections })}
      />
    );
  }

  const steps = [
    { number: 1, label: "Details", helper: "Course basics" },
    { number: 2, label: "Content", helper: "Build the lessons" },
    { number: 3, label: "Review", helper: "Check and publish" },
  ] as const;
  const validateCurrentStep = () => {
    if (step === 1) {
      if (!form.title.trim()) return "Enter a course title to continue.";
      if (!form.category.trim()) return "Choose a course category to continue.";
      if (numberValue(form.durationHours) <= 0)
        return "Enter a duration greater than zero.";
    }
    if (
      step === 2 &&
      sections.some(
        (section) => !section.title.trim() || !section.lessonTitle.trim(),
      )
    )
      return "Every section needs a section title and lesson title.";
    return "";
  };
  const continueWizard = () => {
    const validationError = validateCurrentStep();
    if (validationError) return setWizardError(validationError);
    setWizardError("");
    setStep((current) => Math.min(3, current + 1) as 1 | 2 | 3);
  };
  const createCourse = async () => {
    setWizardError("");
    try {
      await onSubmit({ coverFile, sections });
    } catch (submissionError) {
      setWizardError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create course.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-24px)] overflow-hidden border-[#cbd3de] bg-[#f8fafc] p-0 text-[#172033] shadow-[0_28px_90px_rgba(2,8,23,.45)] dark:border-[#344154] dark:bg-[#151d29] dark:text-zinc-50 sm:max-w-[1100px] [&>button]:right-5 [&>button]:top-5 [&>button]:z-20">
        <DialogTitle className="sr-only">Create a course</DialogTitle>
        <DialogDescription className="sr-only">
          Create the course details, initial lessons, and publishing settings.
        </DialogDescription>
        <div className="grid max-h-[calc(100vh-24px)] overflow-y-auto lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border-b border-[#d5dce5] bg-[#f1f5f9] px-6 py-8 dark:border-[#344154] dark:bg-[#182231] lg:border-b-0 lg:border-r lg:px-7 lg:py-[76px]">
            <ol className="grid grid-cols-3 gap-3 lg:block">
              {steps.map((item, index) => {
                const active = step === item.number;
                const complete = step > item.number;
                return (
                  <li
                    key={item.number}
                    className="relative flex min-w-0 gap-3 lg:min-h-[116px]"
                  >
                    {index < steps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute left-[15px] top-8 hidden h-[84px] w-px lg:block",
                          complete ? "bg-[#316be8]" : "bg-[#728096]/55",
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-semibold",
                        active || complete
                          ? "border-[#4a8cff] bg-[#316be8] text-white shadow-[0_0_0_3px_rgba(49,107,232,.12)]"
                          : "border-[#69778a] bg-transparent text-[#69778a] dark:text-zinc-300",
                      )}
                    >
                      {complete ? (
                        <CheckIcon className="h-4 w-4 stroke-[2.5]" />
                      ) : (
                        item.number
                      )}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p
                        className={cn(
                          "text-sm font-bold",
                          active
                            ? "text-[#172033] dark:text-white"
                            : "text-[#566477] dark:text-zinc-300",
                        )}
                      >
                        {item.label}
                      </p>
                      <p className="mt-1 hidden text-xs leading-5 text-[#718096] dark:text-zinc-400 sm:block">
                        {item.helper}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>

          <div className="flex min-h-[700px] min-w-0 flex-col">
            <div className="flex-1 px-5 pb-6 pt-8 sm:px-9 lg:px-10">
              <DialogHeader className="pr-10 text-left">
                <DialogTitle className="text-[1.65rem] font-bold tracking-[-0.035em]">
                  Create a course
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-[#6b7788] dark:text-zinc-400">
                  {step === 1
                    ? "Add the essentials learners need before you build the course."
                    : step === 2
                      ? "Create a useful starting structure. You can refine every lesson in Studio."
                      : "Check the details, then create and publish your course."}
                </DialogDescription>
              </DialogHeader>
              {wizardError && (
                <div
                  role="alert"
                  className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300"
                >
                  {wizardError}
                </div>
              )}

              {step === 1 && (
                <div className="mt-7 grid gap-5">
                  <Field label="Course title *">
                    <Input
                      autoFocus
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="Enter a clear, descriptive title for your course"
                      maxLength={100}
                      className="h-12 border-[#b9c4d1] bg-white px-4 shadow-none dark:border-[#455267] dark:bg-[#141c28]"
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(190px,.72fr)]">
                    <Field label="Category *">
                      <CourseCategoryPicker
                        value={form.category}
                        categories={categories}
                        onChange={(category) =>
                          setForm((current) => ({ ...current, category }))
                        }
                        disabled={isSaving}
                      />
                    </Field>
                    <Field label="Duration (hours) *">
                      <Input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={form.durationHours}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            durationHours: event.target.value,
                          }))
                        }
                        placeholder="e.g. 2.5"
                        className="h-12 border-[#b9c4d1] bg-white px-4 shadow-none dark:border-[#455267] dark:bg-[#141c28]"
                      />
                    </Field>
                  </div>
                  <Field label="Description">
                    <Textarea
                      value={form.description}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Describe what employees will know or be able to do after this course"
                      maxLength={1000}
                      className="min-h-[108px] resize-y border-[#b9c4d1] bg-white px-4 py-3 shadow-none dark:border-[#455267] dark:bg-[#141c28]"
                    />
                  </Field>
                  <div className="divide-y divide-[#d5dce5] overflow-hidden rounded-md border border-[#b9c4d1] bg-white dark:divide-[#344154] dark:border-[#455267] dark:bg-[#141c28]">
                    <div className="flex items-center gap-4 px-4 py-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#e9eef5] text-[#53657b] dark:bg-[#263244] dark:text-zinc-200">
                        <AcademicCapIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">Required learning</p>
                        <p className="mt-0.5 text-xs text-[#718096] dark:text-zinc-400">
                          Mark this course as required for assigned learners
                        </p>
                      </div>
                      <Switch
                        checked={form.isRequired === "true"}
                        onCheckedChange={(checked) =>
                          setForm((current) => ({
                            ...current,
                            isRequired: String(checked),
                          }))
                        }
                        aria-label="Required learning"
                      />
                    </div>
                    <div className="flex items-center gap-4 px-4 py-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#e9eef5] text-[#53657b] dark:bg-[#263244] dark:text-zinc-200">
                        <GlobeAltIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">Publish to catalog</p>
                        <p className="mt-0.5 text-xs text-[#718096] dark:text-zinc-400">
                          Make this course discoverable in the learning catalog
                        </p>
                      </div>
                      <Switch
                        checked={form.isActive === "true"}
                        onCheckedChange={(checked) =>
                          setForm((current) => ({
                            ...current,
                            isActive: String(checked),
                          }))
                        }
                        aria-label="Publish to catalog"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="course-cover" className="text-sm font-bold">
                      Course cover{" "}
                      <span className="font-normal text-[#718096] dark:text-zinc-400">
                        (optional)
                      </span>
                    </Label>
                    <label
                      htmlFor="course-cover"
                      className="mt-2 flex min-h-[112px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#8ea0b7] bg-white px-5 text-center transition-colors hover:border-[#316be8] hover:bg-blue-50/40 dark:border-[#526177] dark:bg-[#141c28] dark:hover:border-[#4a8cff] dark:hover:bg-blue-950/20"
                    >
                      <PhotoIcon className="h-8 w-8 text-[#69798e]" />
                      <span className="mt-2 text-sm font-semibold text-[#316be8]">
                        {coverFile ? coverFile.name : "Upload image"}
                      </span>
                      <span className="mt-1 text-xs text-[#718096] dark:text-zinc-400">
                        PNG, JPG or WEBP up to 5MB
                      </span>
                    </label>
                    <input
                      id="course-cover"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        if (file && file.size > 5 * 1024 * 1024) {
                          setWizardError(
                            "Course cover must be 5MB or smaller.",
                          );
                          event.target.value = "";
                          return;
                        }
                        setWizardError("");
                        setCoverFile(file);
                      }}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="mt-7">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold">Course structure</h3>
                      <p className="mt-1 text-sm text-[#718096] dark:text-zinc-400">
                        Each section starts with one editable lesson.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSections((current) => [
                          ...current,
                          {
                            title: `Section ${current.length + 1}`,
                            lessonTitle: "",
                            description: "",
                          },
                        ])
                      }
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Add section
                    </Button>
                  </div>
                  <div className="mt-5 space-y-4">
                    {sections.map((section, index) => (
                      <article
                        key={index}
                        className="rounded-md border border-[#c7d0db] bg-white p-4 dark:border-[#455267] dark:bg-[#141c28]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-[.12em] text-[#316be8]">
                            Section {index + 1}
                          </p>
                          {sections.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setSections((current) =>
                                  current.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                )
                              }
                              className="grid h-8 w-8 place-items-center rounded-md text-[#7b8797] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                              aria-label={`Remove section ${index + 1}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          <Field label="Section title">
                            <Input
                              value={section.title}
                              onChange={(event) =>
                                setSections((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, title: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </Field>
                          <Field label="Lesson title">
                            <Input
                              value={section.lessonTitle}
                              onChange={(event) =>
                                setSections((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          lessonTitle: event.target.value,
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </Field>
                        </div>
                        <div className="mt-4">
                          <Field label="Lesson description">
                            <Textarea
                              value={section.description}
                              onChange={(event) =>
                                setSections((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          description: event.target.value,
                                        }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="What should learners understand or practice?"
                              className="min-h-20"
                            />
                          </Field>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(250px,.75fr)]">
                  <section className="rounded-md border border-[#c7d0db] bg-white p-5 dark:border-[#455267] dark:bg-[#141c28]">
                    <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#316be8]">
                      Course details
                    </p>
                    <h3 className="mt-2 text-xl font-bold tracking-[-.025em]">
                      {form.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#68768a] dark:text-zinc-400">
                      {form.description || "No course description added."}
                    </p>
                    <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-[#dbe1e8] pt-4 text-sm dark:border-[#344154]">
                      <div>
                        <dt className="text-xs text-[#718096]">Category</dt>
                        <dd className="mt-1 font-semibold">{form.category}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[#718096]">Duration</dt>
                        <dd className="mt-1 font-semibold">
                          {form.durationHours} hours
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[#718096]">Assignment</dt>
                        <dd className="mt-1 font-semibold">
                          {form.isRequired === "true" ? "Required" : "Optional"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-[#718096]">Catalog</dt>
                        <dd className="mt-1 font-semibold">
                          {form.isActive === "true"
                            ? "Publish now"
                            : "Keep private"}
                        </dd>
                      </div>
                    </dl>
                  </section>
                  <section className="rounded-md border border-[#c7d0db] bg-white p-5 dark:border-[#455267] dark:bg-[#141c28]">
                    <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#316be8]">
                      Initial curriculum
                    </p>
                    <ol className="mt-4 space-y-4">
                      {sections.map((section, index) => (
                        <li key={index} className="flex gap-3">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e8eef8] text-xs font-bold text-[#316be8] dark:bg-[#263854]">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {section.title}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[#718096] dark:text-zinc-400">
                              {section.lessonTitle}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    {coverFile && (
                      <p className="mt-5 border-t border-[#dbe1e8] pt-4 text-xs text-[#718096] dark:border-[#344154]">
                        Cover:{" "}
                        <span className="font-semibold text-[#3f4e62] dark:text-zinc-300">
                          {coverFile.name}
                        </span>
                      </p>
                    )}
                  </section>
                </div>
              )}
            </div>
            <DialogFooter className="flex-row items-center border-t border-[#d5dce5] bg-[#f4f7fa] px-5 py-4 dark:border-[#344154] dark:bg-[#182231] sm:justify-between sm:px-9 lg:px-10">
              <p className="mr-auto text-sm font-medium text-[#68768a] dark:text-zinc-400">
                Step {step} of 3
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  step === 1
                    ? onOpenChange(false)
                    : setStep(
                        (current) => Math.max(1, current - 1) as 1 | 2 | 3,
                      )
                }
                disabled={isSaving}
                className="h-11 min-w-24 border-[#aeb9c6] bg-transparent"
              >
                {step === 1 ? "Cancel" : "Back"}
              </Button>
              {step < 3 ? (
                <Button
                  type="button"
                  onClick={continueWizard}
                  className="h-11 min-w-36 bg-[#316be8] hover:bg-[#285dce]"
                >
                  Continue
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void createCourse()}
                  disabled={isSaving}
                  className="h-11 min-w-36 bg-[#316be8] hover:bg-[#285dce]"
                >
                  {isSaving ? "Creating…" : "Create course"}
                  <CheckIcon className="ml-2 h-4 w-4" />
                </Button>
              )}
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CourseCategoryPicker({
  value,
  categories,
  onChange,
  disabled,
}: {
  value: string;
  categories: LearningCourseCategory[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = categories.find(
    (category) =>
      getLearningCourseCategoryPath(category.id, categories) === value,
  );

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-4 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        aria-haspopup="tree"
        aria-expanded={open}
      >
        <span
          className={cn(
            "truncate",
            selected ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {selected
            ? getLearningCourseCategoryPath(selected.id, categories)
            : value || "Select a category"}
        </span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close category selector"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 top-[calc(100%+4px)] z-20 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            role="tree"
            aria-label="Course categories"
          >
            {getLearningCourseCategoryChildren(null, categories).map(
              (category) => (
                <CourseCategoryTreeNode
                  key={category.id}
                  category={category}
                  categories={categories}
                  value={value}
                  onSelect={(categoryId) => {
                    onChange(
                      getLearningCourseCategoryPath(categoryId, categories),
                    );
                    setOpen(false);
                  }}
                />
              ),
            )}
            {getLearningCourseCategoryChildren(null, categories).length ===
              0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                No active course categories are configured.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CourseCategoryTreeNode({
  category,
  categories,
  value,
  onSelect,
}: {
  category: LearningCourseCategory;
  categories: LearningCourseCategory[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const children = getLearningCourseCategoryChildren(category.id, categories);
  const categoryPath = getLearningCourseCategoryPath(category.id, categories);
  return (
    <div role="treeitem" aria-selected={value === categoryPath}>
      <div
        className={cn(
          "flex items-center gap-1 rounded px-1 py-1 hover:bg-slate-100 dark:hover:bg-zinc-800",
          value === categoryPath &&
            "bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
        )}
      >
        <button
          type="button"
          className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground"
          onClick={() => children.length && setExpanded((current) => !current)}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${category.name}`}
        >
          {children.length ? (
            expanded ? (
              <ChevronDownIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronRightIcon className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="h-1 w-1 rounded-full bg-current opacity-40" />
          )}
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 truncate px-1 py-1 text-left text-xs font-medium"
          onClick={() => onSelect(category.id)}
        >
          {category.name}
        </button>
      </div>
      {expanded && children.length > 0 && (
        <div className="ml-5 border-l border-slate-200 pl-1 dark:border-zinc-700">
          {children.map((child) => (
            <CourseCategoryTreeNode
              key={child.id}
              category={child}
              categories={categories}
              value={value}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CertificateDialog({
  open,
  onOpenChange,
  form,
  setForm,
  isSaving,
  trusted,
  trustedCreateMode,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CertificateForm;
  setForm: React.Dispatch<React.SetStateAction<CertificateForm>>;
  isSaving: boolean;
  trusted: boolean;
  trustedCreateMode: "issuer" | "credential";
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[88vh] overflow-y-auto",
          trusted ? "sm:max-w-[760px]" : "sm:max-w-[600px]",
        )}
      >
        <DialogHeader>
          <DialogTitle>
            {trusted
              ? trustedCreateMode === "issuer"
                ? "Add a trusted issuer"
                : "Add a trusted certificate"
              : "Add an employee certificate"}
          </DialogTitle>
          <DialogDescription>
            {trusted
              ? trustedCreateMode === "issuer"
                ? "Configure the issuer trust policy and add its first accepted credential."
                : "Add an accepted credential and its complete verification policy."
              : "Record an employee credential for HR review and verification."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className={cn("grid gap-4", !trusted && "sm:grid-cols-2")}>
            {!trusted && (
              <Field label="Employee">
                <HrEmployeeSearchSelect
                  value={form.employeeId}
                  onValueChange={(employeeId) =>
                    setForm((current) => ({ ...current, employeeId }))
                  }
                  disabled={isSaving}
                />
              </Field>
            )}
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </div>
          <Field
            label={
              trusted && trustedCreateMode === "issuer"
                ? "First accepted credential"
                : "Certificate name"
            }
          >
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Certified People Manager"
            />
          </Field>
          <Field label="Issuer">
            <Input
              value={form.issuer}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  issuer: event.target.value,
                }))
              }
              placeholder="Issuing organization"
            />
          </Field>
          {trusted ? (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <Input
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    placeholder="Technology, Leadership, Safety…"
                  />
                </Field>
                <Field label="Geographic coverage">
                  <Input
                    value={form.geographicCoverage}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        geographicCoverage: event.target.value,
                      }))
                    }
                    placeholder="Global"
                  />
                </Field>
                <Field label="Standard validity (months, optional)">
                  <Input
                    type="number"
                    min="1"
                    value={form.validityMonths}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        validityMonths: event.target.value,
                      }))
                    }
                    placeholder="For example, 36"
                  />
                </Field>
                <Field label="Renewal requirement">
                  <select
                    value={form.renewalRequirement}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        renewalRequirement: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="required">Required</option>
                    <option value="not_required">Not required</option>
                    <option value="varies">Varies by credential</option>
                  </select>
                </Field>
                <Field label="Credential ID pattern">
                  <Input
                    value={form.credentialIdPattern}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        credentialIdPattern: event.target.value,
                      }))
                    }
                    placeholder="PMP-\\d{6,10}"
                  />
                </Field>
                <Field label="Policy owner">
                  <Input
                    value={form.policyOwner}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        policyOwner: event.target.value,
                      }))
                    }
                    placeholder="Learning & Development"
                  />
                </Field>
              </div>
              <Field label="Official verification URL">
                <Input
                  type="url"
                  value={form.verificationUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      verificationUrl: event.target.value,
                    }))
                  }
                  placeholder="https://issuer.example/verify"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Approved on">
                  <Input
                    type="date"
                    value={form.approvedOn}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        approvedOn: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Next policy review">
                  <Input
                    type="date"
                    value={form.nextReviewAt}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nextReviewAt: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              <Field label="Verification requirements (one per line)">
                <Textarea
                  value={form.verificationRequirements}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      verificationRequirements: event.target.value,
                    }))
                  }
                  className="min-h-28"
                />
              </Field>
              <Field label="Policy change note">
                <Textarea
                  value={form.policyChangeNote}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      policyChangeNote: event.target.value,
                    }))
                  }
                  placeholder="Describe why this trust policy was added or changed."
                  className="min-h-20"
                />
              </Field>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Issued date">
                <Input
                  type="date"
                  value={form.issuedAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      issuedAt: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Expiry date">
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expiresAt: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSaving}>
            {isSaving
              ? "Saving…"
              : trusted
                ? trustedCreateMode === "issuer"
                  ? "Add issuer and credential"
                  : "Add trusted certificate"
                : "Add employee certificate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OnboardingDialog({
  open,
  onOpenChange,
  form,
  setForm,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: OnboardingForm;
  setForm: React.Dispatch<React.SetStateAction<OnboardingForm>>;
  isSaving: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Start employee onboarding</DialogTitle>
          <DialogDescription>
            Create a learning and onboarding journey for a new employee.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="Employee">
            <HrEmployeeSearchSelect
              value={form.employeeId}
              onValueChange={(employeeId) =>
                setForm((current) => ({ ...current, employeeId }))
              }
              disabled={isSaving}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Target date">
              <Input
                type="date"
                value={form.targetDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    targetDate: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
            <Field label="Initial progress">
              <Input
                type="number"
                min="0"
                max="100"
                value={form.progress}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    progress: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSaving}>
            {isSaving ? "Starting…" : "Start onboarding"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LearningAssignmentDialog({
  open,
  onOpenChange,
  form,
  setForm,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: LearningAssignmentForm;
  setForm: React.Dispatch<React.SetStateAction<LearningAssignmentForm>>;
  isSaving: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign {form.sourceLabel || "learning"}</DialogTitle>
          <DialogDescription>
            Create {form.courseIds.length} real enrollment
            {form.courseIds.length === 1 ? "" : "s"} for an employee. Existing
            enrollments are preserved.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label>Employee</Label>
            <HrEmployeeSearchSelect
              value={form.employeeId}
              onValueChange={(employeeId) =>
                setForm((current) => ({ ...current, employeeId }))
              }
              disabled={isSaving}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="learning-assignment-due-date">Due date</Label>
            <Input
              id="learning-assignment-due-date"
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  dueDate: event.target.value,
                }))
              }
              disabled={isSaving}
            />
          </div>
          <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            The employee will see the assigned course
            {form.courseIds.length === 1 ? "" : "s"} in My Learning and progress
            will be tracked against the live enrollment records.
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSaving || !form.employeeId || !form.courseIds.length}
          >
            {isSaving
              ? "Assigning…"
              : `Assign ${form.courseIds.length} course${form.courseIds.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LearningPathDialog({
  open,
  onOpenChange,
  form,
  setForm,
  courses,
  isSaving,
  isEditing,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: LearningPathForm;
  setForm: React.Dispatch<React.SetStateAction<LearningPathForm>>;
  courses: LearningRecord[];
  isSaving: boolean;
  isEditing: boolean;
  onSubmit: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const filteredCourses = courses.filter((course) =>
    `${text(course.title, "")} ${text(course.category, "")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const courseById = new Map(courses.map((course) => [course.id, course]));

  const toggleCourse = (courseId: string) => {
    setForm((current) => ({
      ...current,
      courseIds: current.courseIds.includes(courseId)
        ? current.courseIds.filter((id) => id !== courseId)
        : [...current.courseIds, courseId],
    }));
  };

  const moveCourse = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.courseIds.length)
        return current;
      const courseIds = [...current.courseIds];
      [courseIds[index], courseIds[nextIndex]] = [
        courseIds[nextIndex],
        courseIds[index],
      ];
      return { ...current, courseIds };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[780px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Configure learning path" : "Create a learning path"}
          </DialogTitle>
          <DialogDescription>
            Choose the courses employees should complete, then arrange them in
            the intended order.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-2">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
            <Field label="Path title">
              <Input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="New manager foundation"
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="What employees will be ready to do after completing this path"
              className="min-h-20"
            />
          </Field>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="overflow-hidden rounded-[8px] border border-slate-200 dark:border-zinc-700">
              <div className="border-b border-slate-200 p-3 dark:border-zinc-700">
                <p className="text-sm font-semibold">Course catalog</p>
                <label className="relative mt-3 block">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <span className="sr-only">Search courses</span>
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search courses"
                    className="h-9 pl-9"
                  />
                </label>
              </div>
              <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto dark:divide-zinc-800">
                {filteredCourses.length ? (
                  filteredCourses.map((course) => {
                    const checked = form.courseIds.includes(course.id);
                    return (
                      <label
                        key={course.id}
                        className="flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/70"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCourse(course.id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {text(course.title, "Untitled course")}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500 dark:text-zinc-400">
                            {text(course.category, "General")} ·{" "}
                            {text(
                              recordValue(
                                course,
                                "durationHours",
                                "duration_hours",
                              ),
                              "0",
                            )}
                            h
                          </span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                    {courses.length
                      ? "No courses match your search."
                      : "Create a course before building a path."}
                  </p>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-[8px] border border-slate-200 dark:border-zinc-700">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3 dark:border-zinc-700">
                <p className="text-sm font-semibold">Path order</p>
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                  {form.courseIds.length} selected
                </span>
              </div>
              <ol className="max-h-[316px] divide-y divide-slate-100 overflow-y-auto dark:divide-zinc-800">
                {form.courseIds.length ? (
                  form.courseIds.map((courseId, index) => {
                    const course = courseById.get(courseId);
                    if (!course) return null;
                    return (
                      <li
                        key={courseId}
                        className="flex items-center gap-2 px-3 py-3"
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {text(course.title, "Untitled course")}
                        </span>
                        <div className="flex shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            disabled={index === 0}
                            onClick={() => moveCourse(index, -1)}
                            aria-label={`Move ${text(course.title, "course")} earlier`}
                          >
                            <ChevronUpIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            disabled={index === form.courseIds.length - 1}
                            onClick={() => moveCourse(index, 1)}
                            aria-label={`Move ${text(course.title, "course")} later`}
                          >
                            <ChevronDownIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="px-4 py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                    Select at least one course from the catalog.
                  </li>
                )}
              </ol>
            </section>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSaving || !form.title.trim() || !form.courseIds.length}
          >
            {isSaving ? "Saving…" : isEditing ? "Save path" : "Create path"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
