import {
  ProviderRuntime,
  Capability,
  CapabilityMeta,
  CapabilityFactory,
  CapabilityRisk,
  OAuthAuthUrlParams,
  OAuthCallbackParams,
  OAuthContext,
  CallbackResult,
  ExecutionContext,
} from "../providers/types.js";
import { BaseProvider } from "../providers/base.js";
import { ProviderKind, ProviderAuth } from "../models/providers.js";
import { OwnershipScope } from "../models/shared.js";
import {
  courseList,
  courseListParamsSchema,
  courseListResultSchema,
  CourseListParams,
  CourseListResult,
  courseEnrollUser,
  courseEnrollUserParamsSchema,
  courseEnrollUserResultSchema,
  CourseEnrollUserParams,
  CourseEnrollUserResult,
} from "./canvas/courses.js";
import {
  assignmentList,
  assignmentListParamsSchema,
  assignmentListResultSchema,
  AssignmentListParams,
  AssignmentListResult,
  assignmentCreate,
  assignmentCreateParamsSchema,
  assignmentCreateResultSchema,
  AssignmentCreateParams,
  AssignmentCreateResult,
} from "./canvas/assignments.js";
import {
  submissionList,
  submissionListParamsSchema,
  submissionListResultSchema,
  SubmissionListParams,
  SubmissionListResult,
  submissionGrade,
  submissionGradeParamsSchema,
  submissionGradeResultSchema,
  SubmissionGradeParams,
  SubmissionGradeResult,
} from "./canvas/submissions.js";
import {
  quizCreate,
  quizCreateParamsSchema,
  quizCreateResultSchema,
  QuizCreateParams,
  QuizCreateResult,
} from "./canvas/quizzes.js";
import {
  enrollmentList,
  enrollmentListParamsSchema,
  enrollmentListResultSchema,
  EnrollmentListParams,
  EnrollmentListResult,
} from "./canvas/enrollments.js";
import {
  fileUpload,
  fileUploadParamsSchema,
  fileUploadResultSchema,
  FileUploadParams,
  FileUploadResult,
} from "./canvas/files.js";
import {
  announcementCreate,
  announcementCreateParamsSchema,
  announcementCreateResultSchema,
  AnnouncementCreateParams,
  AnnouncementCreateResult,
} from "./canvas/announcements.js";
import { Static } from "@sinclair/typebox";

// Capability Factories

function createCourseListCapability(): Capability<
  CourseListParams,
  CourseListResult
> {
  const meta: CapabilityMeta = {
    id: "course.list",
    displayName: "List Courses",
    description:
      "Returns a paginated list of active courses for the current user.",
    docsUrl:
      "https://canvas.instructure.com/doc/api/courses.html#method.courses.index",
    paramsSchema: courseListParamsSchema,
    resultSchema: courseListResultSchema,
    requiredScopes: ["url:GET|/api/v1/courses"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: courseList };
}

function createCourseEnrollUserCapability(): Capability<
  CourseEnrollUserParams,
  CourseEnrollUserResult
> {
  const meta: CapabilityMeta = {
    id: "course.enroll_user",
    displayName: "Enroll User in Course",
    description: "Enrolls a user into a course with a specified role.",
    docsUrl:
      "https://canvas.instructure.com/doc/api/enrollments.html#method.enrollments_api.create",
    paramsSchema: courseEnrollUserParamsSchema,
    resultSchema: courseEnrollUserResultSchema,
    requiredScopes: ["url:POST|/api/v1/courses/:course_id/enrollments"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: courseEnrollUser };
}

function createAssignmentListCapability(): Capability<
  AssignmentListParams,
  AssignmentListResult
> {
  const meta: CapabilityMeta = {
    id: "assignment.list",
    displayName: "List Assignments",
    description: "Retrieves the list of assignments for a specific course.",
    docsUrl:
      "https://canvas.instructure.com/doc/api/assignments.html#method.assignments_api.index",
    paramsSchema: assignmentListParamsSchema,
    resultSchema: assignmentListResultSchema,
    requiredScopes: ["url:GET|/api/v1/courses/:course_id/assignments"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: assignmentList };
}

function createAssignmentCreateCapability(): Capability<
  AssignmentCreateParams,
  AssignmentCreateResult
> {
  const meta: CapabilityMeta = {
    id: "assignment.create",
    displayName: "Create Assignment",
    description: "Creates a new assignment within a course.",
    docsUrl:
      "https://canvas.instructure.com/doc/api/assignments.html#method.assignments_api.create",
    paramsSchema: assignmentCreateParamsSchema,
    resultSchema: assignmentCreateResultSchema,
    requiredScopes: ["url:POST|/api/v1/courses/:course_id/assignments"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: assignmentCreate };
}

function createSubmissionListCapability(): Capability<
  SubmissionListParams,
  SubmissionListResult
> {
  const meta: CapabilityMeta = {
    id: "submission.list",
    displayName: "List Submissions",
    description: "Retrieves all submissions for a specific assignment.",
    docsUrl:
      "https://canvas.instructure.com/doc/api/submissions.html#method.submissions_api.index",
    paramsSchema: submissionListParamsSchema,
    resultSchema: submissionListResultSchema,
    requiredScopes: [
      "url:GET|/api/v1/courses/:course_id/assignments/:assignment_id/submissions",
    ],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: submissionList };
}

function createSubmissionGradeCapability(): Capability<
  SubmissionGradeParams,
  SubmissionGradeResult
> {
  const meta: CapabilityMeta = {
    id: "submission.grade",
    displayName: "Grade Submission",
    description: "Updates the grade for a student's submission.",
    docsUrl:
      "https://canvas.instructure.com/doc/api/submissions.html#method.submissions_api.update",
    paramsSchema: submissionGradeParamsSchema,
    resultSchema: submissionGradeResultSchema,
    requiredScopes: [
      "url:PUT|/api/v1/courses/:course_id/assignments/:assignment_id/submissions/:user_id",
    ],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: submissionGrade };
}

function createQuizCreateCapability(): Capability<
  QuizCreateParams,
  QuizCreateResult
> {
  const meta: CapabilityMeta = {
    id: "quiz.create",
    displayName: "Create Quiz",
    description: "Creates a new quiz within a course.",
    docsUrl:
      "https://canvas.instructure.com/doc/api/quizzes.html#method.quizzes_api.create",
    paramsSchema: quizCreateParamsSchema,
    resultSchema: quizCreateResultSchema,
    requiredScopes: ["url:POST|/api/v1/courses/:course_id/quizzes"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: quizCreate };
}

function createEnrollmentListCapability(): Capability<
  EnrollmentListParams,
  EnrollmentListResult
> {
  const meta: CapabilityMeta = {
    id: "enrollment.list",
    displayName: "List Enrollments",
    description: "Lists all enrollments in a given course.",
    docsUrl:
      "https://canvas.instructure.com/doc/api/enrollments.html#method.enrollments_api.index",
    paramsSchema: enrollmentListParamsSchema,
    resultSchema: enrollmentListResultSchema,
    requiredScopes: ["url:GET|/api/v1/courses/:course_id/enrollments"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: enrollmentList };
}

function createFileUploadCapability(): Capability<
  FileUploadParams,
  FileUploadResult
> {
  const meta: CapabilityMeta = {
    id: "file.upload",
    displayName: "Upload File",
    description: "Uploads a file to be associated with a course.",
    docsUrl:
      "https://canvas.instructure.com/doc/api/files.html#method.files_api.create",
    paramsSchema: fileUploadParamsSchema,
    resultSchema: fileUploadResultSchema,
    requiredScopes: ["url:POST|/api/v1/courses/:course_id/files"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: fileUpload };
}

function createAnnouncementCreateCapability(): Capability<
  AnnouncementCreateParams,
  AnnouncementCreateResult
> {
  const meta: CapabilityMeta = {
    id: "announcement.create",
    displayName: "Create Announcement",
    description:
      "Creates and posts a new announcement to a course, which may notify all enrolled users.",
    docsUrl:
      "https://canvas.instructure.com/doc/api/announcements.html#method.discussion_topics_api.create",
    paramsSchema: announcementCreateParamsSchema,
    resultSchema: announcementCreateResultSchema,
    requiredScopes: ["url:POST|/api/v1/courses/:course_id/discussion_topics"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: announcementCreate };
}

// Provider Class

export class CanvasProvider extends BaseProvider {
  constructor() {
    super({
      metadata: {
        id: "canvas",
        displayName: "Canvas LMS",
        description:
          "A learning management system for educational institutions.",
        icon: "https://www.instructure.com/themes/custom/instructure_theme/logo.svg",
        docsUrl: "https://canvas.instructure.com/doc/api/",
        kind: ProviderKind.External,
        auth: ProviderAuth.OAuth2,
      },
      capabilityFactories: {
        "course.list": createCourseListCapability,
        "course.enroll_user": createCourseEnrollUserCapability,
        "assignment.list": createAssignmentListCapability,
        "assignment.create": createAssignmentCreateCapability,
        "submission.list": createSubmissionListCapability,
        "submission.grade": createSubmissionGradeCapability,
        "quiz.create": createQuizCreateCapability,
        "enrollment.list": createEnrollmentListCapability,
        "file.upload": createFileUploadCapability,
        "announcement.create": createAnnouncementCreateCapability,
      },
    });
  }

  // OAuth Methods

  generateAuthUrl(
    params: OAuthAuthUrlParams,
    ctx: OAuthContext,
    instanceDomain?: string,
  ): string {
    if (!instanceDomain) {
      throw new Error(
        "Canvas instance domain is required for auth url generation.",
      );
    }
    const authUrl = new URL(`https://${instanceDomain}/login/oauth2/auth`);
    authUrl.searchParams.append(
      "client_id",
      ctx.clientId,
    );
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("state", params.state);
    authUrl.searchParams.append("redirect_uri", ctx.redirectUri);
    return authUrl.toString();
  }

  async handleCallback(
    callbackParams: OAuthCallbackParams,
    ctx: OAuthContext,
    instanceDomain?: string,
  ): Promise<CallbackResult> {
    if (callbackParams.error) {
      throw new Error(
        `OAuth error: ${
          callbackParams.error_description || callbackParams.error
        }`,
      );
    }
    if (!instanceDomain) {
      throw new Error(
        "Canvas instance domain is required for auth url generation.",
      );
    }

    const tokenUrl = `https://${instanceDomain}/login/oauth2/token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        code: callbackParams.code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorBody}`);
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      token_type: string;
      scope: string;
      expires_in: number;
      refresh_token: string;
    };

    const self = await this.getSelf(tokens.access_token, instanceDomain);

    return {
      tokenPayload: tokens,
      scopes: tokens.scope ? tokens.scope.split(" ") : [],
      externalAccountMetadata: {
        id: self.id,
        name: self.name,
        domain: instanceDomain,
      },
    };
  }

  private async getSelf(
    accessToken: string,
    instanceDomain: string,
  ): Promise<{ id: number; name: string }> {
    const response = await fetch(
      `https://${instanceDomain}/api/v1/users/self`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }
    return response.json() as Promise<{ id: number; name: string }>;
  }

  async refreshToken(
    tokenPayload: Record<string, unknown>,
    ctx: OAuthContext,
    instanceDomain?: string,
  ): Promise<Record<string, unknown>> {
    if (!instanceDomain) {
      throw new Error(
        "Canvas instance domain is required for auth url generation.",
      );
    }
    const tokenUrl = `https://${instanceDomain}/login/oauth2/token`;
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: tokenPayload.refresh_token,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    return response.json() as Promise<{
      access_token: string;
      token_type: string;
      scope: string;
      expires_in: number;
      refresh_token: string;
    }>;
  }

  async isTokenValid(accessToken: string): Promise<boolean> {
    try {
      // a token is valid if we can successfully query the /self endpoint
      const response = await fetch(
        `https://canvas.instructure.com/api/v1/users/self`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      return response.ok;
    } catch (e) {
      return false;
    }
  }
}
