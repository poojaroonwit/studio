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
const clientId = extra?.accountClientId || 'obsi-people-ess-mobile'

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseOrganizations(value: unknown): AccountOrganization[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const row = item as Record<string, unknown>
    const id = text(row.id || row.organization_id)
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
  const organizationId = text(body.organization_id) || organizations[0]?.id
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

export async function loadAccountApplicationIdentity(identity?: AccountIdentity): Promise<AccountApplicationIdentity> {
  const fallback: AccountApplicationIdentity = { name: 'Obsi People' }
  const organizationId = identity?.organizationId
  if (!organizationId) return fallback

  try {
    const response = await accountFetch(`/api/account/organizations/${encodeURIComponent(organizationId)}/external-applications`)
    if (!response.ok) return fallback
    const body = await response.json() as { applications?: unknown[] }
    const applications = Array.isArray(body.applications) ? body.applications : []
    for (const raw of applications) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
      const app = raw as Record<string, unknown>
      const oauth = app.oauthConfiguration && typeof app.oauthConfiguration === 'object' && !Array.isArray(app.oauthConfiguration)
        ? app.oauthConfiguration as Record<string, unknown>
        : undefined
      const candidateClientId = text(oauth?.clientId)
      const slug = text(app.slug)
      if (candidateClientId !== clientId && slug !== 'obsi-people-mobile' && slug !== 'obsi-people') continue
      return {
        name: text(app.name) || fallback.name,
        logoUrl: text(app.logoUrl) || undefined,
      }
    }
  } catch {
    // Account profile remains usable even when application metadata is not visible to this member.
  }
  return fallback
}

export const outbornAccountUrl = accountUrl
