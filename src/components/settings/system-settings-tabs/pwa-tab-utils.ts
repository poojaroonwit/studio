export interface PwaTextFieldDefinition {
  id: string;
  stateKey: 'pwaName' | 'pwaShortName' | 'pwaDescription' | 'pwaAppleMobileWebAppTitle';
  setterKey: 'setPwaName' | 'setPwaShortName' | 'setPwaDescription' | 'setPwaAppleMobileWebAppTitle';
  label: string;
  placeholder: string;
  description: string;
  maxLength?: number;
  className?: string;
}

export interface PwaColorFieldDefinition {
  id: string;
  stateKey: 'pwaThemeColor' | 'pwaBackgroundColor';
  setterKey: 'setPwaThemeColor' | 'setPwaBackgroundColor';
  label: string;
  placeholder: string;
  description: string;
}

export const PWA_STATUS_BAR_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'black', label: 'Black' },
  { value: 'black-translucent', label: 'Black Translucent' }
];

export const PWA_TEXT_FIELDS = [
  {
    id: 'pwa-name',
    stateKey: 'pwaName',
    setterKey: 'setPwaName',
    label: 'PWA Name',
    placeholder: 'FitScan - AI-Powered Recruitment Platform',
    description: 'Full name displayed when installing the app'
  },
  {
    id: 'pwa-short-name',
    stateKey: 'pwaShortName',
    setterKey: 'setPwaShortName',
    label: 'PWA Short Name',
    placeholder: 'FitScan',
    description: 'Short name for home screen (max 12 characters)',
    maxLength: 12
  },
  {
    id: 'pwa-description',
    stateKey: 'pwaDescription',
    setterKey: 'setPwaDescription',
    label: 'PWA Description',
    placeholder: 'Advanced AI-powered recruitment and Applicant management platform',
    description: 'Description of your PWA',
    className: 'md:col-span-2'
  },
  {
    id: 'pwa-apple-title',
    stateKey: 'pwaAppleMobileWebAppTitle',
    setterKey: 'setPwaAppleMobileWebAppTitle',
    label: 'Apple Mobile Web App Title',
    placeholder: 'FitScan',
    description: 'Title for iOS home screen'
  }
] as const satisfies readonly PwaTextFieldDefinition[];

export const PWA_COLOR_FIELDS = [
  {
    id: 'pwa-theme-color',
    stateKey: 'pwaThemeColor',
    setterKey: 'setPwaThemeColor',
    label: 'Theme Color',
    placeholder: '#000000',
    description: 'Color for browser UI elements'
  },
  {
    id: 'pwa-background-color',
    stateKey: 'pwaBackgroundColor',
    setterKey: 'setPwaBackgroundColor',
    label: 'Background Color',
    placeholder: '#171a26',
    description: 'Splash screen background color'
  }
] as const satisfies readonly PwaColorFieldDefinition[];
