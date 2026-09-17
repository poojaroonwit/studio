import Constants from 'expo-constants'
import { accountAuth } from './auth'

export type AccountOrganization = {
  id: string
  name?: string
  slug?: string
  role?: string
}

export type AccountIdentity = {
  sub?: string
  name: string
  email: string
  imageUrl?: string
  organizationId?: string
  organizations: AccountOrganization[]
}

export type AccountApplicationIdentity = {
  name: string
  logoUrl?: string
}

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined
const accountUrl = (extra?.accountUrl || 'https://account.outborn.co').replace(/\/$/, '')

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseOrganizations(value: unknown): AccountOrganization[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const row = item as Record<string, unknown>
    const id = text(row.id || row.organization_id || row.organizationId)
    if (!id) return []
    return [{
      id,
      name: text(row.name) || undefined,
      slug: text(row.slug) || undefined,
      role: text(row.role) || undefined,
    }]
  })
}

async function accountFetch(path: string, init?: RequestInit) {
  const token = await accountAuth.getToken()
  if (!token) throw new Error('Sign in is required')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    return await fetch(`${accountUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

export async function loadAccountIdentity(): Promise<AccountIdentity> {
  const response = await accountFetch('/api/auth/oauth2/userinfo')
  if (!response.ok) throw new Error(`Unable to load Outborn Account profile (${response.status})`)
  const body = await response.json() as Record<string, unknown>
  const organizations = parseOrganizations(body.organizations)
  const organizationId = text(body.organization_id || body.organizationId) || organizations[0]?.id
  const email = text(body.email)
  const name = text(body.name) || text(body.preferred_username) || email.split('@')[0] || 'Account'
  const imageUrl = text(body.picture) || text(body.image) || text(body.avatar_url) || text(body.avatarUrl)
  return {
    sub: text(body.sub) || undefined,
    name,
    email,
    imageUrl: imageUrl || undefined,
    organizationId: organizationId || undefined,
    organizations,
  }
}

function applicationScore(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return -1
  const app = raw as Record<string, unknown>
  const slug = text(app.slug).toLowerCase()
  const name = text(app.name).toLowerCase()
  const launchUrl = text(app.launchUrl).toLowerCase()
  const applicationId = text(app.applicationId || app.id).toLowerCase()
  if (slug === 'obsi-people') return 100
  if (name === 'obsi people') return 90
  if (launchUrl.includes('people.outborn.co')) return 80
  if (launchUrl.includes('app-hrive.up.railway.app')) return 70
  if (applicationId.includes('people') || applicationId.includes('hrive')) return 60
  if (name === 'hrive') return 50
  return -1
}

export async function loadAccountApplicationIdentity(identity?: AccountIdentity): Promise<AccountApplicationIdentity> {
  const fallback: AccountApplicationIdentity = { name: 'Obsi People' }
  const organizationIds = [identity?.organizationId, ...(identity?.organizations || []).map((organization) => organization.id)]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)

  const queries = organizationIds.length
    ? organizationIds.map((organizationId) => `?organizationId=${encodeURIComponent(organizationId)}`)
    : ['']

  for (const query of queries) {
    try {
      const response = await accountFetch(`/api/account/applications${query}`)
      if (!response.ok) continue
      const body = await response.json() as { applications?: unknown[] }
      const applications = Array.isArray(body.applications) ? body.applications : []
      const people = applications
        .map((application) => ({ application, score: applicationScore(application) }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => b.score - a.score)[0]?.application as Record<string, unknown> | undefined
      if (!people) continue
      const logoUrl = text(people.iconUrl || people.logoUrl || people.icon || people.logo)
      return {
        name: text(people.name) || fallback.name,
        logoUrl: logoUrl || undefined,
      }
    } catch {}
  }

  return fallback
}

export const outbornAccountUrl = accountUrl
