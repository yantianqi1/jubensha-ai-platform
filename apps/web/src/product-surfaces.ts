export type ProductSurfaceId = "studio-web" | "play-web" | "admin-web";

export interface ProductSurfaceRoute {
  readonly id: ProductSurfaceId;
  readonly basePath: string;
  readonly apiScopes: readonly string[];
  readonly label: string;
  readonly purpose: string;
}

export const productSurfaceRoutes: readonly ProductSurfaceRoute[] = [
  {
    id: "studio-web",
    basePath: "/studio",
    apiScopes: ["creation", "content"],
    label: "Studio",
    purpose: "Creator workflow for generation, review, and draft compilation.",
  },
  {
    id: "play-web",
    basePath: "/play",
    apiScopes: ["runtime", "generation", "demo"],
    label: "Play",
    purpose: "Player-facing investigation and NPC interaction surface.",
  },
  {
    id: "admin-web",
    basePath: "/admin",
    apiScopes: ["content", "creation/review-workbench", "health"],
    label: "Admin",
    purpose: "Operator review, release checks, and service diagnostics.",
  },
];

export function getProductSurfaceRoute(id: ProductSurfaceId): ProductSurfaceRoute {
  const route = productSurfaceRoutes.find((surface) => surface.id === id);

  if (!route) {
    throw new Error(`Unknown product surface: ${id}`);
  }

  return route;
}

export function resolveProductSurfaceIdFromPath(pathname: string): ProductSurfaceId {
  const matchedRoute = productSurfaceRoutes.find((route) =>
    pathname === route.basePath || pathname.startsWith(`${route.basePath}/`),
  );

  return matchedRoute?.id ?? "play-web";
}
