'use client'

import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export const OUTBORN_APP_SHELL_PACKAGE_NAME = '@outborn/app-shell'
export const OUTBORN_APP_SHELL_VERSION = '0.1.5'
export const OUTBORN_APP_SHELL_ID = `${OUTBORN_APP_SHELL_PACKAGE_NAME}@${OUTBORN_APP_SHELL_VERSION}`

const recentStorageKey = 'outborn.app-shell.recent.v1'
const themeVariables = [
  '--outborn-app-shell-text',
  '--outborn-app-shell-strong',
  '--outborn-app-shell-muted',
  '--outborn-app-shell-hover',
  '--outborn-app-shell-focus',
  '--outborn-app-shell-border',
  '--outborn-app-shell-surface',
  '--outborn-app-shell-soft',
]

function initials(value) {
  return String(value || 'O').split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'O'
}

function safeAssetUrl(value) {
  if (!value) return null
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null } catch { return null }
}

function description(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readRecentIds() {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(recentStorageKey) || '[]')
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).slice(0, 8) : []
  } catch { return [] }
}

function writeRecentIds(ids) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(recentStorageKey, JSON.stringify(ids.slice(0, 8))) } catch {}
}

export function resolveCurrentApplication(applications = [], { applicationId, applicationName, origin } = {}) {
  const rows = Array.isArray(applications) ? applications.filter(Boolean) : []
  const wantedId = String(applicationId || '').trim().toLowerCase()
  if (wantedId) {
    const byId = rows.find((application) => String(application.applicationId || '').trim().toLowerCase() === wantedId)
    if (byId) return byId
  }

  const currentOrigin = String(origin || (typeof window !== 'undefined' ? window.location.origin : '') || '').trim()
  if (currentOrigin) {
    const byOrigin = rows.find((application) => {
      if (!application?.launchUrl) return false
      try { return new URL(application.launchUrl, currentOrigin).origin === currentOrigin } catch { return false }
    })
    if (byOrigin) return byOrigin
  }

  const wantedName = String(applicationName || '').trim().toLowerCase()
  if (wantedName) {
    const byName = rows.find((application) => String(application.name || '').trim().toLowerCase() === wantedName)
    if (byName) return byName
  }
  return null
}

export function syncOutbornApplicationFavicon(application) {
  if (typeof document === 'undefined') return false
  const icon = safeAssetUrl(application?.iconUrl)
  if (!icon) return false
  let favicon = document.head.querySelector('link[data-outborn-app-shell-favicon="true"]')
  if (!favicon) {
    favicon = document.createElement('link')
    favicon.setAttribute('data-outborn-app-shell-favicon', 'true')
    favicon.setAttribute('rel', 'icon')
    document.head.appendChild(favicon)
  }
  favicon.setAttribute('href', icon)
  return true
}

export function ApplicationGridIcon({ size = 18, className = '' } = {}) {
  return createElement('span', { className: `outbornAppShellGridIcon ${className}`.trim(), style: { width: size, height: size }, 'aria-hidden': 'true' }, Array.from({ length: 9 }, (_, index) => createElement('i', { key: index })))
}

function ApplicationMark({ application }) {
  const icon = safeAssetUrl(application.iconUrl)
  return createElement('span', { className: `outbornAppShellMark${icon ? ' hasImage' : ''}`, 'aria-hidden': 'true' }, icon ? createElement('img', { src: icon, alt: '', width: 32, height: 32, decoding: 'async' }) : initials(application.name))
}

export function OutbornApplicationBrand({ applications = [], applicationId, applicationName, href, className = '', showName = true, size = 32 } = {}) {
  const application = resolveCurrentApplication(applications, { applicationId, applicationName })
  const name = application?.name || applicationName || 'Outborn application'
  const icon = safeAssetUrl(application?.iconUrl)
  const mark = createElement('span', { className: `outbornAppShellApplicationBrandMark${icon ? ' hasImage' : ''}`, style: { width: size, height: size }, 'aria-hidden': 'true' }, icon ? createElement('img', { src: icon, alt: '', width: size, height: size, decoding: 'async' }) : initials(name))
  const content = [mark, showName ? createElement('strong', { className: 'outbornAppShellApplicationBrandName', key: 'name' }, name) : null]
  const props = { className: `outbornAppShellApplicationBrand ${className}`.trim(), 'aria-label': name }
  return href ? createElement('a', { ...props, href }, ...content) : createElement('span', props, ...content)
}

export function OutbornApplicationFavicon({ applications = [], applicationId, applicationName } = {}) {
  const application = useMemo(() => resolveCurrentApplication(applications, { applicationId, applicationName }), [applications, applicationId, applicationName])
  useEffect(() => { syncOutbornApplicationFavicon(application) }, [application?.iconUrl])
  return null
}

function ApplicationCopy({ application }) {
  const detail = description(application.description)
  return createElement('span', { className: 'outbornAppShellItemCopy' },
    createElement('strong', { className: 'outbornAppShellItemName' }, application.name),
    detail ? createElement('small', { className: 'outbornAppShellItemDescription' }, detail) : null)
}

function RecentApplications({ applications, onNavigate }) {
  if (!applications.length) return null
  return createElement('section', { className: 'outbornAppShellRecentSection', 'aria-label': 'Recent applications' },
    createElement('div', { className: 'outbornAppShellHeading' }, 'Recent'),
    createElement('div', { className: 'outbornAppShellRecentGrid' }, applications.map((application) => {
      const detail = description(application.description)
      const content = [
        createElement(ApplicationMark, { application, key: 'mark' }),
        createElement('span', { className: 'outbornAppShellRecentCopy', key: 'copy' },
          createElement('strong', null, application.name),
          detail ? createElement('small', null, detail) : null),
      ]
      if (application.launchUrl && application.accessible !== false) return createElement('a', {
        className: 'outbornAppShellRecentItem',
        href: application.launchUrl,
        key: application.applicationId,
        title: `Open ${application.name}`,
        'aria-label': `${application.name}${detail ? ` — ${detail}` : ''}`,
        onClick: () => onNavigate?.(application),
      }, ...content)
      return createElement('div', { className: 'outbornAppShellRecentItem isDisabled', key: application.applicationId, 'aria-disabled': 'true' }, ...content)
    })))
}

export function OutbornApplicationGrid({ applications, onNavigate } = {}) {
  const rows = Array.isArray(applications) ? applications : []
  if (!rows.length) return createElement('div', { className: 'outbornAppShellEmpty' }, 'None')
  return createElement('div', { className: 'outbornAppShellGrid' }, rows.map((application) => {
    const enabled = application.accessible !== false && Boolean(application.launchUrl)
    const content = [createElement(ApplicationMark, { application, key: 'mark' }), createElement(ApplicationCopy, { application, key: 'copy' })]
    if (enabled) return createElement('a', { className: 'outbornAppShellItem', href: application.launchUrl, key: application.applicationId, title: `Open ${application.name}`, onClick: () => onNavigate?.(application) }, ...content)
    return createElement('div', { className: 'outbornAppShellItem isDisabled', 'aria-disabled': 'true', key: application.applicationId, title: application.accessible === false ? `${application.name} is not available to this organization or account` : `No launch URL is configured for ${application.name}` }, ...content)
  }))
}

function AdministrationGrid({ items, onNavigate }) {
  if (!items.length) return createElement('div', { className: 'outbornAppShellEmpty' }, 'No administration services available.')
  return createElement('div', { className: 'outbornAppShellAdminGrid' }, items.map((item) => {
    const detail = description(item.description)
    const icon = safeAssetUrl(item.iconUrl)
    const content = [
      createElement('span', { className: `outbornAppShellAdminIcon${icon ? ' hasImage' : ''}`, key: 'icon', 'aria-hidden': 'true' }, icon ? createElement('img', { src: icon, alt: '', width: 32, height: 32, decoding: 'async' }) : createElement(ApplicationGridIcon, { size: 16 })),
      createElement('span', { className: 'outbornAppShellAdminCopy', key: 'copy' }, createElement('strong', null, item.name), detail ? createElement('small', null, detail) : null),
    ]
    if (item.accessible !== false && item.href) return createElement('a', { className: 'outbornAppShellAdminItem', href: item.href, key: item.id, onClick: () => onNavigate?.(item) }, ...content)
    return createElement('div', { className: 'outbornAppShellAdminItem isDisabled', 'aria-disabled': 'true', key: item.id }, ...content)
  }))
}

export function OutbornApplicationLauncher({ applications = [], administration = [], organizationName, accountHref, triggerLabel = 'Outborn apps', triggerDescription = 'Switch application', popoverLabel = 'Outborn applications', className = '', onOpenChange, onNavigate } = {}) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState({})
  const [recentIds, setRecentIds] = useState([])
  const accessible = useMemo(() => applications.filter((application) => application.accessible !== false), [applications])
  const unavailable = useMemo(() => applications.filter((application) => application.accessible === false), [applications])
  const recentApplications = useMemo(() => recentIds
    .map((id) => applications.find((application) => application.applicationId === id))
    .filter(Boolean)
    .filter((application) => application.accessible !== false)
    .slice(0, 5), [applications, recentIds])

  function rememberRecent(application) {
    if (!application?.applicationId) return
    setRecentIds((current) => {
      const next = [application.applicationId, ...current.filter((id) => id !== application.applicationId)].slice(0, 8)
      writeRecentIds(next)
      return next
    })
  }

  function updateOpen(next) { setOpen(next); onOpenChange?.(next) }

  function updatePopoverPosition() {
    if (!triggerRef.current || typeof window === 'undefined') return
    const rect = triggerRef.current.getBoundingClientRect()
    const computed = rootRef.current ? window.getComputedStyle(rootRef.current) : null
    const theme = {}
    if (computed) for (const variable of themeVariables) {
      const value = computed.getPropertyValue(variable).trim()
      if (value) theme[variable] = value
    }
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 24))
    setPopoverStyle({
      ...theme,
      left,
      bottom: Math.max(8, window.innerHeight - rect.top + 8),
      '--outborn-app-shell-origin-x': `${Math.max(22, rect.left + rect.width / 2 - left)}px`,
    })
  }

  useEffect(() => {
    let ids = readRecentIds()
    if (typeof window !== 'undefined') {
      const current = applications.find((application) => {
        if (!application?.launchUrl || application.accessible === false) return false
        try { return new URL(application.launchUrl).origin === window.location.origin } catch { return false }
      })
      if (current) ids = [current.applicationId, ...ids.filter((id) => id !== current.applicationId)].slice(0, 8)
    }
    setRecentIds(ids)
    writeRecentIds(ids)
  }, [applications])

  useEffect(() => {
    if (!open) return undefined
    updatePopoverPosition()
    const pointer = (event) => {
      const target = event.target
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) updateOpen(false)
    }
    const keyboard = (event) => { if (event.key === 'Escape') updateOpen(false) }
    document.addEventListener('pointerdown', pointer)
    document.addEventListener('keydown', keyboard)
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)
    return () => {
      document.removeEventListener('pointerdown', pointer)
      document.removeEventListener('keydown', keyboard)
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [open])

  function navigate(target) {
    if (target?.applicationId) rememberRecent(target)
    updateOpen(false)
    onNavigate?.(target)
  }

  const popover = open ? createElement('div', { ref: popoverRef, className: 'outbornAppShellPopover', role: 'dialog', 'aria-label': popoverLabel, style: popoverStyle },
    organizationName || accountHref ? createElement('header', { className: 'outbornAppShellHeader' }, createElement('span', null, createElement('strong', null, triggerLabel), organizationName ? createElement('small', null, organizationName) : null), accountHref ? createElement('a', { href: accountHref, onClick: () => updateOpen(false) }, 'Account') : null) : null,
    createElement(RecentApplications, { applications: recentApplications, onNavigate: navigate }),
    createElement('section', { className: 'outbornAppShellSection outbornAppShellSectionPrimary', 'aria-label': 'Available applications' }, createElement(OutbornApplicationGrid, { applications: accessible, onNavigate: navigate })),
    unavailable.length ? createElement('section', { className: 'outbornAppShellSection outbornAppShellUnavailableSection', 'aria-label': 'Unavailable applications' }, createElement('div', { className: 'outbornAppShellHeading outbornAppShellUnavailableHeading' }, 'Unavailable apps'), createElement(OutbornApplicationGrid, { applications: unavailable, onNavigate: navigate })) : null,
    administration.length ? createElement('section', { className: 'outbornAppShellSection' }, createElement('div', { className: 'outbornAppShellHeading' }, 'Administration'), createElement(AdministrationGrid, { items: administration, onNavigate: navigate })) : null) : null

  return createElement('div', { className: `outbornAppShell ${className}`.trim(), ref: rootRef },
    createElement('button', { ref: triggerRef, className: 'outbornAppShellTrigger', type: 'button', 'aria-haspopup': 'dialog', 'aria-expanded': open, onClick: () => updateOpen(!open) },
      createElement('span', { className: 'outbornAppShellTriggerIcon' }, createElement(ApplicationGridIcon, { size: 18 })),
      createElement('span', { className: 'outbornAppShellTriggerCopy' }, createElement('strong', null, triggerLabel), triggerDescription ? createElement('small', null, triggerDescription) : null),
      createElement('span', { className: 'outbornAppShellChevron', 'aria-hidden': 'true' }, '›')),
    popover && typeof document !== 'undefined' ? createPortal(popover, document.body) : null)
}
