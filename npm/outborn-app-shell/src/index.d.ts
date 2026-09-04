import type { ReactNode } from 'react'

export declare const OUTBORN_APP_SHELL_PACKAGE_NAME: '@outborn/app-shell'
export declare const OUTBORN_APP_SHELL_VERSION: '0.1.5'
export declare const OUTBORN_APP_SHELL_ID: '@outborn/app-shell@0.1.5'

export interface OutbornApplication {
  applicationId: string
  name: string
  description?: string | null
  iconUrl?: string | null
  launchUrl?: string | null
  accessible?: boolean
}

export interface OutbornAdministrationItem {
  id: string
  name: string
  href: string
  accessible?: boolean
  description?: string
  iconUrl?: string | null
}

export interface ResolveCurrentApplicationOptions {
  applicationId?: string
  applicationName?: string
  origin?: string
}

export interface OutbornApplicationBrandProps extends ResolveCurrentApplicationOptions {
  applications?: OutbornApplication[]
  href?: string
  className?: string
  showName?: boolean
  size?: number
}

export interface OutbornApplicationFaviconProps extends ResolveCurrentApplicationOptions {
  applications?: OutbornApplication[]
}

export interface ApplicationGridIconProps { size?: number; className?: string }
export interface OutbornApplicationGridProps { applications?: OutbornApplication[]; onNavigate?: (application: OutbornApplication) => void }
export interface OutbornApplicationLauncherProps {
  applications?: OutbornApplication[]
  administration?: OutbornAdministrationItem[]
  organizationName?: string
  accountHref?: string
  triggerLabel?: string
  triggerDescription?: string
  popoverLabel?: string
  className?: string
  onOpenChange?: (open: boolean) => void
  onNavigate?: (target: OutbornApplication | OutbornAdministrationItem) => void
}

export declare function resolveCurrentApplication(applications?: OutbornApplication[], options?: ResolveCurrentApplicationOptions): OutbornApplication | null
export declare function syncOutbornApplicationFavicon(application?: OutbornApplication | null): boolean
export declare function ApplicationGridIcon(props?: ApplicationGridIconProps): ReactNode
export declare function OutbornApplicationBrand(props?: OutbornApplicationBrandProps): ReactNode
export declare function OutbornApplicationFavicon(props?: OutbornApplicationFaviconProps): ReactNode
export declare function OutbornApplicationGrid(props?: OutbornApplicationGridProps): ReactNode
export declare function OutbornApplicationLauncher(props?: OutbornApplicationLauncherProps): ReactNode
