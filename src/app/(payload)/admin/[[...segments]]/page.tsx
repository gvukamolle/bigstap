import config from '@payload-config'
import { generatePageMetadata, RootPage } from '@payloadcms/next/views'

import { normalizeAdminRouteParams } from '@/payload/adminRouteParams'

import { importMap } from '../importMap'

type SearchParams = {
  [key: string]: string | string[]
}

type Args = {
  params: Promise<{
    segments?: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[] | undefined
  }>
}

const getParams = async ({ params }: Args) => {
  const resolvedParams = await params

  return normalizeAdminRouteParams(resolvedParams) as { segments: string[] }
}

const getSearchParams = async ({ searchParams }: Args): Promise<SearchParams> => {
  const resolvedSearchParams = await searchParams
  const entries = Object.entries(resolvedSearchParams).filter(
    (entry): entry is [string, string | string[]] => entry[1] !== undefined
  )

  return Object.fromEntries(entries)
}

export const generateMetadata = (args: Args) =>
  generatePageMetadata({
    config,
    params: getParams(args),
    searchParams: getSearchParams(args)
  })

export default function Page(args: Args) {
  return RootPage({
    config,
    importMap,
    params: getParams(args),
    searchParams: getSearchParams(args)
  })
}
