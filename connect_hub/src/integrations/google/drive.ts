import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
import { google } from "googleapis";
import { VOptional } from "../../models/shared.js";

// ---------------------------------------------------------------------------
// Google Drive API helper
// ---------------------------------------------------------------------------
function createDriveClient(ctx: ExecutionContext) {
  if (!ctx?.tokenPayload) throw new Error("Google token missing");

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials(ctx.tokenPayload as Record<string, unknown>);

  return google.drive({ version: "v3", auth: oauth2Client });
}

// ---------------------------------------------------------------------------
// Drive Drives Schemas
// ---------------------------------------------------------------------------

export const capabilitiesSchema = Type.Object({
  canAddChildren: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canChangeCopyRequiresWriterPermissionRestriction: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  canChangeDomainUsersOnlyRestriction: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  canChangeDriveBackground: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  canChangeDriveMembersOnlyRestriction: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  canComment: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canCopy: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canDeleteChildren: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canDeleteDrive: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canDownload: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canEdit: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canListChildren: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canManageMembers: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canReadRevisions: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canRename: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canRenameDrive: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canChangeSharingFoldersRequiresOrganizerPermissionRestriction: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  canShare: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  canTrashChildren: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
});

export const driveDrivesListParamsSchema = Type.Object({
  pageSize: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 100,
      description: "Maximum number of drives to return",
    }),
  ),
  pageToken: Type.Optional(
    Type.String({
      description: "Page token to retrieve a specific page of results",
    }),
  ),
  q: Type.Optional(
    Type.String({ description: "Query string to filter drives" }),
  ),
  useDomainAdminAccess: Type.Optional(
    Type.Boolean({
      description: "Issue the request as a domain administrator",
    }),
  ),
});

const restrictionsSchema = Type.Object({
  adminManagedRestrictions: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  copyRequiresWriterPermission: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  domainUsersOnly: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  driveMembersOnly: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  sharingFoldersRequiresOrganizerPermission: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
});

const driveSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  colorRgb: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  backgroundImageFile: VOptional(
    Type.Object({
      id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      xCoordinate: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      yCoordinate: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      width: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    }),
  ),
  themeId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  createdTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  hidden: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  capabilities: VOptional(capabilitiesSchema),
  restrictions: VOptional(restrictionsSchema),
});

export const driveDrivesListResultSchema = Type.Object({
  drives: Type.Optional(Type.Array(driveSchema)),
  nextPageToken: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const driveDrivesGetParamsSchema = Type.Object({
  driveId: Type.String({ description: "The ID of the drive to retrieve" }),
  useDomainAdminAccess: Type.Optional(
    Type.Boolean({
      description: "Issue the request as a domain administrator",
    }),
  ),
});

export const driveDrivesGetResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  colorRgb: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  backgroundImageFile: VOptional(
    Type.Object({
      id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      xCoordinate: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      yCoordinate: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      width: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    }),
  ),
  themeId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  createdTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  hidden: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  capabilities: VOptional(capabilitiesSchema),
  restrictions: VOptional(restrictionsSchema),
});

// ---------------------------------------------------------------------------
// Drive Files Schemas
// ---------------------------------------------------------------------------

export const driveFilesListParamsSchema = Type.Object({
  pageSize: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 1000,
      description: "Maximum number of files to return",
    }),
  ),
  pageToken: Type.Optional(
    Type.String({
      description: "Page token to retrieve a specific page of results",
    }),
  ),
  q: Type.Optional(
    Type.String({ description: "Query string to filter files" }),
  ),
  spaces: Type.Optional(
    Type.String({ description: "Comma-separated list of spaces to query" }),
  ),
  fields: Type.Optional(
    Type.String({
      description:
        "Selector specifying which fields to include in a partial response",
    }),
  ),
  orderBy: Type.Optional(
    Type.String({ description: "Sort order for the returned files" }),
  ),
  includeTeamDriveItems: Type.Optional(
    Type.Boolean({ description: "Include team drive items" }),
  ),
  supportsTeamDrives: Type.Optional(
    Type.Boolean({ description: "Whether the request supports team drives" }),
  ),
  driveId: Type.Optional(
    Type.String({ description: "ID of the drive to search" }),
  ),
  includeItemsFromAllDrives: Type.Optional(
    Type.Boolean({ description: "Include items from all drives" }),
  ),
  supportsAllDrives: Type.Optional(
    Type.Boolean({ description: "Whether the request supports all drives" }),
  ),
  corpora: Type.Optional(
    Type.String({
      description: "Comma-separated list of bodies of items to search",
    }),
  ),
  corpus: Type.Optional(
    Type.String({ description: "Body of items to search" }),
  ),
});

const fileSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  mimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  starred: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  trashed: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  explicitlyTrashed: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  parents: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Null()])),
  properties: VOptional(Type.Record(Type.String(), Type.String())),
  appProperties: VOptional(Type.Record(Type.String(), Type.String())),
  spaces: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Null()])),
  version: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  webContentLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  webViewLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  iconLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  thumbnailLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  viewedByMe: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  viewedByMeTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  createdTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  modifiedTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  modifiedByMeTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  sharedWithMeTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  sharingUser: Type.Optional(
    Type.Object({
      displayName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      emailAddress: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
      permissionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  owners: Type.Optional(
    Type.Array(
      Type.Object({
        displayName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        emailAddress: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
        permissionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
    ),
  ),
  lastModifyingUser: Type.Optional(
    Type.Object({
      displayName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      emailAddress: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
      permissionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  shared: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  ownedByMe: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  capabilities: VOptional(capabilitiesSchema),
  restrictions: VOptional(restrictionsSchema),
  permissionIds: Type.Optional(
    Type.Union([Type.Array(Type.String()), Type.Null()]),
  ),
  hasAugmentedPermissions: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  folderColorRgb: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  originalFilename: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  fullFileExtension: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  fileExtension: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  md5Checksum: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  sha1Checksum: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  sha256Checksum: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  size: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  quotaBytesUsed: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  headRevisionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  contentHints: VOptional(
    Type.Object({
      thumbnail: Type.Optional(
        Type.Object({
          image: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          mimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        }),
      ),
      indexableText: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  imageMediaMetadata: VOptional(
    Type.Object({
      width: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      height: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      rotation: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      location: Type.Optional(
        Type.Object({
          latitude: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
          longitude: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
          altitude: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
        }),
      ),
      time: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      cameraMake: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      cameraModel: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      exposureTime: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      aperture: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      flashUsed: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
      focalLength: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      isoSpeed: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      meteringMode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      sensor: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      exposureMode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      colorSpace: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      whiteBalance: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      exposureBias: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      maxApertureValue: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      subjectDistance: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      lens: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  videoMediaMetadata: VOptional(
    Type.Object({
      width: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      height: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      durationMillis: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  isAppAuthorized: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  exportLinks: VOptional(Type.Record(Type.String(), Type.String())),
  shortcutDetails: VOptional(
    Type.Object({
      targetId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      targetMimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      targetResourceKey: Type.Optional(
        Type.Union([Type.String(), Type.Null()]),
      ),
    }),
  ),
  contentRestrictions: Type.Optional(
    Type.Array(
      Type.Object({
        readOnly: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
        reason: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        restrictingUser: Type.Optional(
          Type.Object({
            displayName: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            emailAddress: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
            permissionId: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          }),
        ),
        restrictionTime: Type.Optional(
          Type.Union([Type.String(), Type.Null()]),
        ),
        type: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
    ),
  ),
  resourceKey: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  linkShareMetadata: VOptional(
    Type.Object({
      securityUpdateEligible: Type.Optional(
        Type.Union([Type.Boolean(), Type.Null()]),
      ),
      securityUpdateEnabled: Type.Optional(
        Type.Union([Type.Boolean(), Type.Null()]),
      ),
    }),
  ),
  labelInfo: VOptional(
    Type.Object({
      labels: Type.Optional(
        Type.Array(
          Type.Object({
            id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            revisionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          }),
        ),
      ),
    }),
  ),
  copyRequiresWriterPermission: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  writersCanShare: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  viewersCanCopyContent: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  driveId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  teamDriveId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const driveFilesListResultSchema = Type.Object({
  files: Type.Optional(Type.Array(fileSchema)),
  nextPageToken: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  incompleteSearch: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
});

export const driveFilesGetParamsSchema = Type.Object({
  fileId: Type.String({ description: "The ID of the file to retrieve" }),
  acknowledgeAbuse: Type.Optional(
    Type.Boolean({
      description:
        "Whether to acknowledge the risk of downloading virus-infected files",
    }),
  ),
  includePermissionsForView: Type.Optional(
    Type.String({
      description:
        "Specifies which additional view's permissions to include in the response",
    }),
  ),
  supportsAllDrives: Type.Optional(
    Type.Boolean({ description: "Whether the request supports all drives" }),
  ),
  supportsTeamDrives: Type.Optional(
    Type.Boolean({ description: "Whether the request supports team drives" }),
  ),
  fields: Type.Optional(
    Type.String({
      description:
        "Selector specifying which fields to include in a partial response",
    }),
  ),
});

export const driveFilesGetResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  mimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  starred: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  trashed: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  explicitlyTrashed: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  parents: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Null()])),
  properties: VOptional(Type.Record(Type.String(), Type.String())),
  appProperties: VOptional(Type.Record(Type.String(), Type.String())),
  spaces: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Null()])),
  version: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  webContentLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  webViewLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  iconLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  thumbnailLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  viewedByMe: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  viewedByMeTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  createdTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  modifiedTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  modifiedByMeTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  sharedWithMeTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  sharingUser: Type.Optional(
    Type.Object({
      displayName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      emailAddress: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
      permissionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  owners: Type.Optional(
    Type.Array(
      Type.Object({
        displayName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        emailAddress: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
        permissionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
    ),
  ),
  lastModifyingUser: Type.Optional(
    Type.Object({
      displayName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      emailAddress: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
      permissionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  shared: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  ownedByMe: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  capabilities: VOptional(capabilitiesSchema),
  restrictions: VOptional(restrictionsSchema),
  permissionIds: Type.Optional(
    Type.Union([Type.Array(Type.String()), Type.Null()]),
  ),
  hasAugmentedPermissions: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  folderColorRgb: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  originalFilename: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  fullFileExtension: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  fileExtension: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  md5Checksum: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  sha1Checksum: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  sha256Checksum: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  size: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  quotaBytesUsed: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  headRevisionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  contentHints: VOptional(
    Type.Object({
      thumbnail: Type.Optional(
        Type.Object({
          image: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          mimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        }),
      ),
      indexableText: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  imageMediaMetadata: VOptional(
    Type.Object({
      width: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      height: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      rotation: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      location: Type.Optional(
        Type.Object({
          latitude: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
          longitude: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
          altitude: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
        }),
      ),
      time: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      cameraMake: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      cameraModel: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      exposureTime: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      aperture: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      flashUsed: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
      focalLength: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      isoSpeed: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      meteringMode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      sensor: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      exposureMode: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      colorSpace: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      whiteBalance: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      exposureBias: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      maxApertureValue: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      subjectDistance: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      lens: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  videoMediaMetadata: VOptional(
    Type.Object({
      width: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      height: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      durationMillis: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  isAppAuthorized: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  exportLinks: VOptional(Type.Record(Type.String(), Type.String())),
  shortcutDetails: VOptional(
    Type.Object({
      targetId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      targetMimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      targetResourceKey: Type.Optional(
        Type.Union([Type.String(), Type.Null()]),
      ),
    }),
  ),
  contentRestrictions: Type.Optional(
    Type.Array(
      Type.Object({
        readOnly: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
        reason: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        restrictingUser: Type.Optional(
          Type.Object({
            displayName: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            emailAddress: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
            permissionId: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          }),
        ),
        restrictionTime: Type.Optional(
          Type.Union([Type.String(), Type.Null()]),
        ),
        type: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
    ),
  ),
  resourceKey: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  linkShareMetadata: VOptional(
    Type.Object({
      securityUpdateEligible: Type.Optional(
        Type.Union([Type.Boolean(), Type.Null()]),
      ),
      securityUpdateEnabled: Type.Optional(
        Type.Union([Type.Boolean(), Type.Null()]),
      ),
    }),
  ),
  labelInfo: VOptional(
    Type.Object({
      labels: Type.Optional(
        Type.Array(
          Type.Object({
            id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            revisionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          }),
        ),
      ),
    }),
  ),
  copyRequiresWriterPermission: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  writersCanShare: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  viewersCanCopyContent: Type.Optional(
    Type.Union([Type.Boolean(), Type.Null()]),
  ),
  driveId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  teamDriveId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const driveFilesCreateParamsSchema = Type.Object({
  name: Type.String({ description: "The name of the file" }),
  parents: Type.Optional(
    Type.Array(
      Type.String({ description: "The parent folders which contain the file" }),
    ),
  ),
  mimeType: Type.Optional(
    Type.String({ description: "The MIME type of the file" }),
  ),
  description: Type.Optional(
    Type.String({ description: "A short description of the file" }),
  ),
  properties: VOptional(Type.Record(Type.String(), Type.String())),
  appProperties: VOptional(Type.Record(Type.String(), Type.String())),
  starred: Type.Optional(
    Type.Boolean({ description: "Whether the user has starred the file" }),
  ),
  folderColorRgb: Type.Optional(
    Type.String({ description: "The color for a folder as an RGB hex string" }),
  ),
  originalFilename: Type.Optional(
    Type.String({
      description: "The original filename of the uploaded content",
    }),
  ),
  copyRequiresWriterPermission: Type.Optional(
    Type.Boolean({
      description: "Whether the file needs writers permission to be copied",
    }),
  ),
  writersCanShare: Type.Optional(
    Type.Boolean({ description: "Whether writers can share the file" }),
  ),
  viewersCanCopyContent: Type.Optional(
    Type.Boolean({ description: "Whether viewers can copy content" }),
  ),
  content: Type.Optional(
    Type.String({ description: "The content of the file as a string" }),
  ),
  uploadType: Type.Optional(
    Type.Union(
      [
        Type.Literal("media"),
        Type.Literal("multipart"),
        Type.Literal("resumable"),
      ],
      { description: "The type of upload request" },
    ),
  ),
  supportsAllDrives: Type.Optional(
    Type.Boolean({ description: "Whether the request supports all drives" }),
  ),
  supportsTeamDrives: Type.Optional(
    Type.Boolean({ description: "Whether the request supports team drives" }),
  ),
  useContentAsIndexableText: Type.Optional(
    Type.Boolean({
      description: "Whether to use the content as indexable text",
    }),
  ),
  includePermissionsForView: Type.Optional(
    Type.String({
      description: "Specifies which additional view's permissions to include",
    }),
  ),
  keepRevisionForever: Type.Optional(
    Type.Boolean({ description: "Whether to keep the revision forever" }),
  ),
  ocrLanguage: Type.Optional(
    Type.String({ description: "The language hint for OCR processing" }),
  ),
  ignoreDefaultVisibility: Type.Optional(
    Type.Boolean({ description: "Whether to ignore the default visibility" }),
  ),
  fields: Type.Optional(
    Type.String({
      description:
        "Selector specifying which fields to include in the response",
    }),
  ),
});

export const driveFilesCreateResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  mimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  parents: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Null()])),
  createdTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  modifiedTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  webViewLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  webContentLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  starred: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  trashed: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  version: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  size: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  quotaBytesUsed: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  headRevisionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  properties: VOptional(Type.Record(Type.String(), Type.String())),
  appProperties: VOptional(Type.Record(Type.String(), Type.String())),
  capabilities: VOptional(capabilitiesSchema),
  owners: Type.Optional(
    Type.Array(
      Type.Object({
        displayName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        emailAddress: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
        permissionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
    ),
  ),
});

export const driveFilesUpdateParamsSchema = Type.Object({
  fileId: Type.String({ description: "The ID of the file to update" }),
  name: Type.Optional(Type.String({ description: "The name of the file" })),
  parents: Type.Optional(
    Type.Array(
      Type.String({ description: "The parent folders which contain the file" }),
    ),
  ),
  mimeType: Type.Optional(
    Type.String({ description: "The MIME type of the file" }),
  ),
  description: Type.Optional(
    Type.String({ description: "A short description of the file" }),
  ),
  properties: VOptional(Type.Record(Type.String(), Type.String())),
  appProperties: VOptional(Type.Record(Type.String(), Type.String())),
  starred: Type.Optional(
    Type.Boolean({ description: "Whether the user has starred the file" }),
  ),
  trashed: Type.Optional(
    Type.Boolean({ description: "Whether the file has been trashed" }),
  ),
  folderColorRgb: Type.Optional(
    Type.String({ description: "The color for a folder as an RGB hex string" }),
  ),
  originalFilename: Type.Optional(
    Type.String({
      description: "The original filename of the uploaded content",
    }),
  ),
  copyRequiresWriterPermission: Type.Optional(
    Type.Boolean({
      description: "Whether the file needs writers permission to be copied",
    }),
  ),
  writersCanShare: Type.Optional(
    Type.Boolean({ description: "Whether writers can share the file" }),
  ),
  viewersCanCopyContent: Type.Optional(
    Type.Boolean({ description: "Whether viewers can copy content" }),
  ),
  content: Type.Optional(
    Type.String({ description: "The content of the file as a string" }),
  ),
  uploadType: Type.Optional(
    Type.Union(
      [
        Type.Literal("media"),
        Type.Literal("multipart"),
        Type.Literal("resumable"),
      ],
      { description: "The type of upload request" },
    ),
  ),
  supportsAllDrives: Type.Optional(
    Type.Boolean({ description: "Whether the request supports all drives" }),
  ),
  supportsTeamDrives: Type.Optional(
    Type.Boolean({ description: "Whether the request supports team drives" }),
  ),
  useContentAsIndexableText: Type.Optional(
    Type.Boolean({
      description: "Whether to use the content as indexable text",
    }),
  ),
  includePermissionsForView: Type.Optional(
    Type.String({
      description: "Specifies which additional view's permissions to include",
    }),
  ),
  keepRevisionForever: Type.Optional(
    Type.Boolean({ description: "Whether to keep the revision forever" }),
  ),
  ocrLanguage: Type.Optional(
    Type.String({ description: "The language hint for OCR processing" }),
  ),
  addParents: Type.Optional(
    Type.String({ description: "A comma-separated list of parent IDs to add" }),
  ),
  removeParents: Type.Optional(
    Type.String({
      description: "A comma-separated list of parent IDs to remove",
    }),
  ),
  fields: Type.Optional(
    Type.String({
      description:
        "Selector specifying which fields to include in the response",
    }),
  ),
});

export const driveFilesUpdateResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  mimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  parents: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Null()])),
  createdTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  modifiedTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  webViewLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  webContentLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  starred: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  trashed: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  version: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  size: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  quotaBytesUsed: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  headRevisionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  properties: VOptional(Type.Record(Type.String(), Type.String())),
  appProperties: VOptional(Type.Record(Type.String(), Type.String())),
  capabilities: VOptional(capabilitiesSchema),
  owners: Type.Optional(
    Type.Array(
      Type.Object({
        displayName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        emailAddress: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
        permissionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
    ),
  ),
});

export const driveFilesExportParamsSchema = Type.Object({
  fileId: Type.String({ description: "The ID of the file to export" }),
  mimeType: Type.String({
    description: "The MIME type of the format requested for this export",
  }),
});

export const driveFilesExportResultSchema = Type.Object({
  data: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  mimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const driveFilesDownloadParamsSchema = Type.Object({
  fileId: Type.String({ description: "The ID of the file to download" }),
  acknowledgeAbuse: Type.Optional(
    Type.Boolean({
      description:
        "Whether to acknowledge the risk of downloading virus-infected files",
    }),
  ),
  supportsAllDrives: Type.Optional(
    Type.Boolean({ description: "Whether the request supports all drives" }),
  ),
  supportsTeamDrives: Type.Optional(
    Type.Boolean({ description: "Whether the request supports team drives" }),
  ),
});

export const driveFilesDownloadResultSchema = Type.Object({
  data: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  mimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  size: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

// ---------------------------------------------------------------------------
// Drive Comments Schemas
// ---------------------------------------------------------------------------

export const driveCommentsListParamsSchema = Type.Object({
  fileId: Type.String({
    description: "The ID of the file to list comments for",
  }),
  pageSize: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 100,
      description: "The maximum number of comments to return",
    }),
  ),
  pageToken: Type.Optional(
    Type.String({
      description:
        "The continuation token specifying which result page to return",
    }),
  ),
  includeDeleted: Type.Optional(
    Type.Boolean({ description: "Whether to include deleted comments" }),
  ),
  startModifiedTime: Type.Optional(
    Type.String({
      description: "The minimum value of modifiedTime for the result",
    }),
  ),
});

export const driveCommentsListResultSchema = Type.Object({
  comments: Type.Optional(
    Type.Array(
      Type.Object({
        id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        createdTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        modifiedTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        author: Type.Optional(
          Type.Object({
            displayName: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            emailAddress: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
            permissionId: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          }),
        ),
        content: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        deleted: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
        resolved: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
        quotedFileContent: VOptional(
          Type.Object({
            mimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            value: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          }),
        ),
        anchor: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        replies: Type.Optional(
          Type.Array(
            Type.Object({
              id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
              createdTime: Type.Optional(
                Type.Union([Type.String(), Type.Null()]),
              ),
              modifiedTime: Type.Optional(
                Type.Union([Type.String(), Type.Null()]),
              ),
              author: Type.Optional(
                Type.Object({
                  displayName: Type.Optional(
                    Type.Union([Type.String(), Type.Null()]),
                  ),
                  emailAddress: Type.Optional(
                    Type.Union([Type.String(), Type.Null()]),
                  ),
                  kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
                  me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
                  permissionId: Type.Optional(
                    Type.Union([Type.String(), Type.Null()]),
                  ),
                  photoLink: Type.Optional(
                    Type.Union([Type.String(), Type.Null()]),
                  ),
                }),
              ),
              content: Type.Optional(Type.Union([Type.String(), Type.Null()])),
              deleted: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
              action: Type.Optional(Type.Union([Type.String(), Type.Null()])),
              htmlContent: Type.Optional(
                Type.Union([Type.String(), Type.Null()]),
              ),
            }),
          ),
        ),
        htmlContent: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
    ),
  ),
  nextPageToken: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const driveCommentsGetParamsSchema = Type.Object({
  fileId: Type.String({
    description: "The ID of the file to get the comment from",
  }),
  commentId: Type.String({ description: "The ID of the comment to get" }),
  includeDeleted: Type.Optional(
    Type.Boolean({ description: "Whether to include deleted comments" }),
  ),
});

export const driveCommentsGetResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  createdTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  modifiedTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  author: Type.Optional(
    Type.Object({
      displayName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      emailAddress: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
      permissionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  content: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  deleted: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  resolved: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  quotedFileContent: VOptional(
    Type.Object({
      mimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      value: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  anchor: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  replies: Type.Optional(
    Type.Array(
      Type.Object({
        id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        createdTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        modifiedTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        author: Type.Optional(
          Type.Object({
            displayName: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            emailAddress: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
            permissionId: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          }),
        ),
        content: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        deleted: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
        action: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        htmlContent: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
    ),
  ),
  htmlContent: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const driveCommentsCreateParamsSchema = Type.Object({
  fileId: Type.String({
    description: "The ID of the file to add a comment to",
  }),
  content: Type.String({
    description: "The plain text content of the comment",
  }),
  quotedFileContent: VOptional(
    Type.Object({
      mimeType: Type.Optional(
        Type.String({ description: "The MIME type of the quoted content" }),
      ),
      value: Type.Optional(
        Type.String({ description: "The quoted content itself" }),
      ),
    }),
  ),
  anchor: Type.Optional(
    Type.String({
      description: "A region of the document represented as a JSON string",
    }),
  ),
});

export const driveCommentsCreateResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  createdTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  modifiedTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  author: Type.Optional(
    Type.Object({
      displayName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      emailAddress: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
      permissionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  content: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  deleted: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  resolved: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
  quotedFileContent: VOptional(
    Type.Object({
      mimeType: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      value: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  anchor: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  replies: Type.Optional(
    Type.Array(
      Type.Object({
        id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        createdTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        modifiedTime: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        author: Type.Optional(
          Type.Object({
            displayName: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            emailAddress: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            kind: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            me: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
            permissionId: Type.Optional(
              Type.Union([Type.String(), Type.Null()]),
            ),
            photoLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          }),
        ),
        content: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        deleted: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
        action: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        htmlContent: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
    ),
  ),
  htmlContent: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

// ---------------------------------------------------------------------------
// Type definitions derived from schemas (TypeBox Static pattern)
// ---------------------------------------------------------------------------

export type DriveDrivesListParams = Static<typeof driveDrivesListParamsSchema>;
export type DriveDrivesListResult = Static<typeof driveDrivesListResultSchema>;
export type DriveDrivesGetParams = Static<typeof driveDrivesGetParamsSchema>;
export type DriveDrivesGetResult = Static<typeof driveDrivesGetResultSchema>;

export type DriveFilesListParams = Static<typeof driveFilesListParamsSchema>;
export type DriveFilesListResult = Static<typeof driveFilesListResultSchema>;
export type DriveFilesGetParams = Static<typeof driveFilesGetParamsSchema>;
export type DriveFilesGetResult = Static<typeof driveFilesGetResultSchema>;
export type DriveFilesCreateParams = Static<
  typeof driveFilesCreateParamsSchema
>;
export type DriveFilesCreateResult = Static<
  typeof driveFilesCreateResultSchema
>;
export type DriveFilesUpdateParams = Static<
  typeof driveFilesUpdateParamsSchema
>;
export type DriveFilesUpdateResult = Static<
  typeof driveFilesUpdateResultSchema
>;
export type DriveFilesExportParams = Static<
  typeof driveFilesExportParamsSchema
>;
export type DriveFilesExportResult = Static<
  typeof driveFilesExportResultSchema
>;
export type DriveFilesDownloadParams = Static<
  typeof driveFilesDownloadParamsSchema
>;
export type DriveFilesDownloadResult = Static<
  typeof driveFilesDownloadResultSchema
>;

export type DriveCommentsListParams = Static<
  typeof driveCommentsListParamsSchema
>;
export type DriveCommentsListResult = Static<
  typeof driveCommentsListResultSchema
>;
export type DriveCommentsGetParams = Static<
  typeof driveCommentsGetParamsSchema
>;
export type DriveCommentsGetResult = Static<
  typeof driveCommentsGetResultSchema
>;
export type DriveCommentsCreateParams = Static<
  typeof driveCommentsCreateParamsSchema
>;
export type DriveCommentsCreateResult = Static<
  typeof driveCommentsCreateResultSchema
>;

// ---------------------------------------------------------------------------
// Capability implementations
// ---------------------------------------------------------------------------

export async function driveDrivesList(
  params: DriveDrivesListParams,
  ctx: ExecutionContext,
): Promise<DriveDrivesListResult> {
  const drive = createDriveClient(ctx);

  try {
    const response = await drive.drives.list(params);
    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Drive drives.list error: ${error.message}`);
  }
}

export async function driveDrivesGet(
  params: DriveDrivesGetParams,
  ctx: ExecutionContext,
): Promise<DriveDrivesGetResult> {
  const drive = createDriveClient(ctx);

  try {
    const response = await drive.drives.get(params);
    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Drive drives.get error: ${error.message}`);
  }
}

export async function driveFilesList(
  params: DriveFilesListParams,
  ctx: ExecutionContext,
): Promise<DriveFilesListResult> {
  const drive = createDriveClient(ctx);

  try {
    const response = await drive.files.list(params);
    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Drive files.list error: ${error.message}`);
  }
}

export async function driveFilesGet(
  params: DriveFilesGetParams,
  ctx: ExecutionContext,
): Promise<DriveFilesGetResult> {
  const drive = createDriveClient(ctx);

  try {
    const response = await drive.files.get(params);
    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Drive files.get error: ${error.message}`);
  }
}

export async function driveFilesCreate(
  params: DriveFilesCreateParams,
  ctx: ExecutionContext,
): Promise<DriveFilesCreateResult> {
  const drive = createDriveClient(ctx);

  try {
    const { content, ...fileMetadata } = params;

    let response;
    if (content) {
      // Create file with content
      response = await drive.files.create({
        requestBody: fileMetadata,
        media: {
          mimeType: fileMetadata.mimeType || "text/plain",
          body: content,
        },
        fields:
          params.fields ||
          "id,name,mimeType,parents,createdTime,modifiedTime,webViewLink,webContentLink",
      });
    } else {
      // Create file without content (e.g., folder)
      response = await drive.files.create({
        requestBody: fileMetadata,
        fields:
          params.fields ||
          "id,name,mimeType,parents,createdTime,modifiedTime,webViewLink,webContentLink",
      });
    }

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Drive files.create error: ${error.message}`);
  }
}

export async function driveFilesUpdate(
  params: DriveFilesUpdateParams,
  ctx: ExecutionContext,
): Promise<DriveFilesUpdateResult> {
  const drive = createDriveClient(ctx);

  try {
    const { fileId, content, ...fileMetadata } = params;

    let response;
    if (content) {
      // Update file with content
      response = await drive.files.update({
        fileId,
        requestBody: fileMetadata,
        media: {
          mimeType: fileMetadata.mimeType || "text/plain",
          body: content,
        },
        fields:
          params.fields ||
          "id,name,mimeType,parents,createdTime,modifiedTime,webViewLink,webContentLink",
      });
    } else {
      // Update file metadata only
      response = await drive.files.update({
        fileId,
        requestBody: fileMetadata,
        fields:
          params.fields ||
          "id,name,mimeType,parents,createdTime,modifiedTime,webViewLink,webContentLink",
      });
    }

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Drive files.update error: ${error.message}`);
  }
}

export async function driveFilesExport(
  params: DriveFilesExportParams,
  ctx: ExecutionContext,
): Promise<DriveFilesExportResult> {
  const drive = createDriveClient(ctx);

  try {
    const response = await drive.files.export({
      fileId: params.fileId,
      mimeType: params.mimeType,
    });

    return {
      data: response.data as string,
      mimeType: params.mimeType,
      name: null,
    };
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Drive files.export error: ${error.message}`);
  }
}

export async function driveFilesDownload(
  params: DriveFilesDownloadParams,
  ctx: ExecutionContext,
): Promise<DriveFilesDownloadResult> {
  const drive = createDriveClient(ctx);

  try {
    const response = await drive.files.get({
      fileId: params.fileId,
      alt: "media",
    });

    // Get file metadata for additional information
    const metadataResponse = await drive.files.get({
      fileId: params.fileId,
      fields: "name,mimeType,size",
    });

    return {
      data: response.data as string,
      mimeType: metadataResponse.data.mimeType || null,
      name: metadataResponse.data.name || null,
      size: metadataResponse.data.size || null,
    };
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Drive files.download error: ${error.message}`);
  }
}

export async function driveCommentsList(
  params: DriveCommentsListParams,
  ctx: ExecutionContext,
): Promise<DriveCommentsListResult> {
  const drive = createDriveClient(ctx);

  try {
    const response = await drive.comments.list(params);
    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Drive comments.list error: ${error.message}`);
  }
}

export async function driveCommentsGet(
  params: DriveCommentsGetParams,
  ctx: ExecutionContext,
): Promise<DriveCommentsGetResult> {
  const drive = createDriveClient(ctx);

  try {
    const response = await drive.comments.get(params);
    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Drive comments.get error: ${error.message}`);
  }
}

export async function driveCommentsCreate(
  params: DriveCommentsCreateParams,
  ctx: ExecutionContext,
): Promise<DriveCommentsCreateResult> {
  const drive = createDriveClient(ctx);

  try {
    const response = await drive.comments.create({
      fileId: params.fileId,
      requestBody: {
        content: params.content,
        quotedFileContent: params.quotedFileContent,
        anchor: params.anchor,
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Drive comments.create error: ${error.message}`);
  }
}
