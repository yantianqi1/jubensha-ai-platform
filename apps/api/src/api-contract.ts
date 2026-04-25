export type ApiSurface = "creation" | "review" | "runtime" | "content" | "demo" | "generation";
export type HttpMethod = "GET" | "POST" | "PATCH";

export interface ApiContractRoute {
  readonly surface: ApiSurface;
  readonly method: HttpMethod;
  readonly path: string;
  readonly success: string;
  readonly errors: readonly string[];
}

export interface ApiSurfaceDiscovery {
  readonly surface: ApiSurface;
  readonly routeCount: number;
  readonly routes: readonly ApiContractRoute[];
}

type ApiContractRouteInput = ApiContractRoute;

const invalidRequestError = "InvalidRequest";
const contentNotFoundErrors = ["ContentNotFoundError"] as const;
const contentWriteErrors = [invalidRequestError, "ContentValidationError"] as const;
const runtimeRoomErrors = ["RuntimeNotFoundError"] as const;
const runtimeActionErrors = [invalidRequestError, "RuntimeConflictError", "RuntimeNotFoundError", "RuntimeRuleError"] as const;

export const apiContractRoutes: readonly ApiContractRoute[] = [
  route({
    surface: "creation",
    method: "POST",
    path: "/creation/story-bibles/generate",
    success: "GenerateStoryBibleResult",
    errors: [invalidRequestError, "CreationModelValidationError"],
  }),
  route({
    surface: "creation",
    method: "POST",
    path: "/creation/story-bibles/compile-draft",
    success: "CreationDraftResult",
    errors: [invalidRequestError, "StoryBibleValidationError"],
  }),
  route({
    surface: "creation",
    method: "POST",
    path: "/creation/theme-assets/compile",
    success: "ThemeAssetManifest",
    errors: [invalidRequestError, "StoryBibleValidationError"],
  }),
  route({
    surface: "creation",
    method: "POST",
    path: "/creation/theme-assets/jobs",
    success: "ThemeAssetJobRecord",
    errors: [invalidRequestError, "StoryBibleValidationError"],
  }),
  route({
    surface: "creation",
    method: "GET",
    path: "/creation/theme-assets/jobs/:jobId",
    success: "ThemeAssetJobRecord",
    errors: ["ThemeAssetJobNotFoundError"],
  }),
  route({
    surface: "creation",
    method: "POST",
    path: "/creation/theme-assets/jobs/:jobId/run",
    success: "ThemeAssetJobRecord",
    errors: ["ThemeAssetJobNotFoundError"],
  }),
  route({
    surface: "review",
    method: "GET",
    path: "/creation/publish-review/packages/:packageId",
    success: "PublishReviewSummary",
    errors: ["ContentNotFoundError"],
  }),
  route({
    surface: "review",
    method: "GET",
    path: "/creation/review-workbench/packages/:packageId",
    success: "ReviewWorkbenchSummary",
    errors: ["ContentNotFoundError"],
  }),
  route({
    surface: "demo",
    method: "POST",
    path: "/demo/fog-harbor",
    success: "PlayableDemoResult",
    errors: ["ContentValidationError", "RuntimeRuleError"],
  }),
  route({
    surface: "generation",
    method: "POST",
    path: "/generation/rooms/:roomId/npc/:npcCode/ask",
    success: "NpcResponse",
    errors: [invalidRequestError, "RuntimeNotFoundError", "GenerationModelError"],
  }),
  route({
    surface: "runtime",
    method: "POST",
    path: "/runtime/rooms",
    success: "RuntimeRoomRecord",
    errors: [invalidRequestError, "RuntimeRuleError"],
  }),
  route({ surface: "runtime", method: "GET", path: "/runtime/rooms", success: "RuntimeRoomRecord[]", errors: [] }),
  route({
    surface: "runtime",
    method: "GET",
    path: "/runtime/rooms/:roomId",
    success: "RuntimeRoomRecord",
    errors: runtimeRoomErrors,
  }),
  route({
    surface: "runtime",
    method: "POST",
    path: "/runtime/rooms/:roomId/seats/:seatId/join",
    success: "RuntimeRoomRecord",
    errors: [invalidRequestError, "RuntimeNotFoundError", "RuntimeRuleError"],
  }),
  route({
    surface: "runtime",
    method: "GET",
    path: "/runtime/rooms/:roomId/snapshot",
    success: "RuntimePublicSnapshot",
    errors: runtimeRoomErrors,
  }),
  route({
    surface: "runtime",
    method: "GET",
    path: "/runtime/rooms/:roomId/seats/:seatId/snapshot",
    success: "RuntimeSeatSnapshot",
    errors: ["RuntimeNotFoundError"],
  }),
  route({
    surface: "runtime",
    method: "GET",
    path: "/runtime/rooms/:roomId/admin-snapshot",
    success: "RuntimeAdminSnapshot",
    errors: runtimeRoomErrors,
  }),
  route({
    surface: "runtime",
    method: "POST",
    path: "/runtime/rooms/:roomId/actions",
    success: "RuntimeRoomRecord",
    errors: runtimeActionErrors,
  }),
  route({
    surface: "runtime",
    method: "POST",
    path: "/runtime/rooms/:roomId/replay",
    success: "RuntimeRoomRecord",
    errors: runtimeActionErrors,
  }),
  route({ surface: "content", method: "POST", path: "/content/packages", success: "ScriptPackageRecord", errors: contentWriteErrors }),
  route({ surface: "content", method: "GET", path: "/content/packages", success: "ScriptPackageRecord[]", errors: [] }),
  route({
    surface: "content",
    method: "GET",
    path: "/content/packages/:packageId",
    success: "ScriptPackageRecord",
    errors: contentNotFoundErrors,
  }),
  route({
    surface: "content",
    method: "PATCH",
    path: "/content/packages/:packageId/draft",
    success: "ScriptPackageRecord",
    errors: [...contentNotFoundErrors, "ContentValidationError"],
  }),
  route({
    surface: "content",
    method: "POST",
    path: "/content/packages/:packageId/publish",
    success: "ScriptVersionRecord",
    errors: [invalidRequestError, ...contentNotFoundErrors, "ContentValidationError", "ContentPublishBlockedError"],
  }),
  route({
    surface: "content",
    method: "GET",
    path: "/content/versions/:versionId",
    success: "ScriptVersionRecord",
    errors: contentNotFoundErrors,
  }),
  route({
    surface: "content",
    method: "PATCH",
    path: "/content/versions/:versionId",
    success: "never",
    errors: [...contentNotFoundErrors, "ContentConflictError"],
  }),
];

const surfaceOrder: readonly ApiSurface[] = ["creation", "review", "runtime", "content", "demo", "generation"];

export function listApiContractRoutes(surface: ApiSurface): readonly ApiContractRoute[] {
  return apiContractRoutes.filter((contractRoute) => contractRoute.surface === surface);
}

export function discoverApiSurfaceRoutes(): readonly ApiSurfaceDiscovery[] {
  return surfaceOrder.map((surface) => {
    const routes = listApiContractRoutes(surface);

    return { surface, routeCount: routes.length, routes };
  });
}

function route(input: ApiContractRouteInput): ApiContractRoute {
  return input;
}
