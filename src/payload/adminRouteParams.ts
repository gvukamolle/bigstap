export type AdminRouteParamsInput = {
  segments?: string[]
}

export type NormalizedAdminRouteParams = {
  segments?: string[]
}

export function normalizeAdminRouteParams(
  params: AdminRouteParamsInput
): NormalizedAdminRouteParams {
  if (!Array.isArray(params.segments)) {
    return {}
  }

  return {
    segments: params.segments
  }
}
