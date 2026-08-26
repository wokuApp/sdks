import type { components } from './_generated/openapi';

/** The full generated schema map (advanced use / escape hatch). */
export type Schemas = components['schemas'];

// Request-body types, generated from the OpenAPI spec (source of truth for
// validation bounds). Re-exported under clean names for ergonomic call sites.

export type CreateTrackerParams = Schemas['CreateExternalTrackerDefinitionDTO'];
export type UpdateTrackerParams = Schemas['UpdateExternalTrackerDefinitionDTO'];
export type SearchEntitiesByTrackersParams =
  Schemas['SearchEntitiesByTrackersDTO'];
export type AssignTrackerByNameParams =
  Schemas['AssignExternalTrackerByNameDTO'];

export type CreateNpsToolParams = Schemas['CreateNpsToolBodyDTO'];
export type UpdateNpsToolParams = Schemas['UpdateNpsToolBodyDTO'];
export type CreateCsatToolParams = Schemas['CreateCsatToolBodyDTO'];
export type UpdateCsatToolParams = Schemas['UpdateCsatToolBodyDTO'];
export type CreateCesToolParams = Schemas['CreateCesToolBodyDTO'];
export type UpdateCesToolParams = Schemas['UpdateCesToolBodyDTO'];

export type SendInvitationsParams = Schemas['V1CreateInvitationsBodyDto'];
export type SendNpsInvitationsParams = Schemas['V1CreateNpsInvitationsBodyDto'];
export type SendCsatInvitationsParams =
  Schemas['V1CreateCsatInvitationsBodyDto'];
export type SendCesInvitationsParams = Schemas['V1CreateCesInvitationsBodyDto'];

export type CreateWokuParams = Schemas['CreateWokuApiDto'];
export type UpdateWokuParams = Schemas['UpdateWokuBodyDTO'];
export type UpdateWokuSettingsParams = Schemas['UpdateWokuSettingsBodyDTO'];
export type MoveWokuParams = Schemas['MoveWokuBodyDTO'];
export type ShareWokuParams = Schemas['V1ShareWokuBodyDto'];

export type UpdateTicketParams = Schemas['UpdateTicketBodyDTO'];
export type CreateTicketDestinationParams =
  Schemas['CreateTicketDestinationDto'];
export type UpdateTicketDestinationParams =
  Schemas['UpdateTicketDestinationDto'];

export type CreateActionPlanGroupParams = Schemas['CreateActionPlanGroupDto'];
export type UpdateActionPlanGroupParams = Schemas['UpdateActionPlanGroupDto'];
export type CreateActionPlanTaskParams = Schemas['CreateActionPlanTaskDto'];
export type UpdateActionPlanTaskParams = Schemas['UpdateActionPlanTaskDto'];
export type ReorderActionPlanTasksParams = Schemas['ReorderActionPlanTasksDto'];
export type PostPlanReplyParams = Schemas['PostPlanReplyBodyDTO'];
