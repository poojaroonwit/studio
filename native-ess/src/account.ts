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
  try {
    const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ''
    const response = await accountFetch(`/api/account/applications${query}`)
    if (!response.ok) return fallback
    const body = await response.json() as { applications?: unknown[] }
    const applications = Array.isArray(body.applications) ? body.applications : []
    const people = applications.find((raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
      const app = raw as Record<string, unknown>
      const name = text(app.name).toLowerCase()
      const launchUrl = text(app.launchUrl).toLowerCase()
      return name === 'obsi people'
        || name === 'hrive'
        || launchUrl.includes('people.outborn.co')
        || launchUrl.includes('app-hrive.up.railway.app')
    }) as Record<string, unknown> | undefined
    if (!people) return fallback
    return {
      name: text(people.name) || fallback.name,
      logoUrl: text(people.iconUrl) || undefined,
    }
  } catch {
    return fallback
  }
}

export const outbornAccountUrl = accountUrl