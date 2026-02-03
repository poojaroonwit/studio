
export const DEFAULT_APP_NAME = "FitScan";

// Backend keys
export const APP_THEME_KEY = 'appThemePreference';
export const APP_LOGO_DATA_URL_KEY = 'appLogoDataUrl';
export const APP_FAVICON_DATA_URL_KEY = 'appFaviconDataUrl';
export const APP_NAME_KEY = 'appName';
export const APP_CONFIG_APP_NAME_KEY = 'appConfigAppName';
export const GENERATIVE_AI_CANVAS_MODE_KEY = 'generativeAICanvasMode';

// Login page design keys/types/utilities
export const LOGIN_BACKGROUND_TYPE_KEY = 'loginBackgroundType';
export const LOGIN_BACKGROUND_IMAGE_KEY = 'loginPageBackgroundImageUrl';
export const LOGIN_BACKGROUND_GRADIENT_START_KEY = 'loginBackgroundGradientStart';
export const LOGIN_BACKGROUND_GRADIENT_END_KEY = 'loginBackgroundGradientEnd';
export const LOGIN_BACKGROUND_COLOR_KEY = 'loginBackgroundColor';
export const LOGIN_BACKGROUND_GRADIENT_KEY = 'loginBackgroundGradient';

// Mobile login background keys
export const LOGIN_BACKGROUND_TYPE_MOBILE_KEY = 'loginBackgroundTypeMobile';
export const LOGIN_BACKGROUND_IMAGE_MOBILE_KEY = 'loginPageBackgroundImageUrlMobile';
export const LOGIN_BACKGROUND_GRADIENT_START_MOBILE_KEY = 'loginBackgroundGradientStartMobile';
export const LOGIN_BACKGROUND_GRADIENT_END_MOBILE_KEY = 'loginBackgroundGradientEndMobile';
export const LOGIN_BACKGROUND_COLOR_MOBILE_KEY = 'loginBackgroundColorMobile';
export const LOGIN_BACKGROUND_GRADIENT_MOBILE_KEY = 'loginBackgroundGradientMobile';

export const LOGIN_PAGE_LAYOUT_TYPE_KEY = 'loginPageLayoutType';
export const LOGIN_PAGE_LOGO_SIZE_KEY = 'loginPageLogoSize';

// Evaluate page header background keys
export const EVALUATE_HEADER_BACKGROUND_TYPE_KEY = 'evaluateHeaderBackgroundType';
export const EVALUATE_HEADER_BACKGROUND_IMAGE_KEY = 'evaluateHeaderBackgroundImageUrl';
export const EVALUATE_HEADER_BACKGROUND_GRADIENT_START_KEY = 'evaluateHeaderBackgroundGradientStart';
export const EVALUATE_HEADER_BACKGROUND_GRADIENT_END_KEY = 'evaluateHeaderBackgroundGradientEnd';
export const EVALUATE_HEADER_BACKGROUND_COLOR_KEY = 'evaluateHeaderBackgroundColor';
export const EVALUATE_HEADER_TEXT_COLOR_KEY = 'evaluateHeaderTextColor';
export const EVALUATE_PLATFORM_LOGO_DATA_URL_KEY = 'evaluatePlatformLogoDataUrl';
export const EVALUATE_REPORT_LOGO_DATA_URL_KEY = 'evaluateReportLogoDataUrl';
export const ORGANIZATION_LOGO_DATA_URL_KEY = 'organizationLogoDataUrl';

// Interviewer selection colors
export const INTERVIEWER_SELECTED_BG_COLOR_KEY = 'interviewerSelectedBackgroundColor';
export const INTERVIEWER_SELECTED_TEXT_COLOR_KEY = 'interviewerSelectedTextColor';
export const INTERVIEWER_SELECTED_BORDER_COLOR_KEY = 'interviewerSelectedBorderColor';
export const INTERVIEWER_SELECTED_BORDER_WIDTH_KEY = 'interviewerSelectedBorderWidth';
export const INTERVIEWER_NON_SELECTED_BG_COLOR_KEY = 'interviewerNonSelectedBackgroundColor';
export const INTERVIEWER_NON_SELECTED_TEXT_COLOR_KEY = 'interviewerNonSelectedTextColor';
export const INTERVIEWER_NON_SELECTED_BORDER_COLOR_KEY = 'interviewerNonSelectedBorderColor';
export const INTERVIEWER_NON_SELECTED_BORDER_WIDTH_KEY = 'interviewerNonSelectedBorderWidth';
export const INTERVIEWER_NAME_COLOR_KEY = 'interviewerNameColor';

export type ThemePreference = "light" | "dark" | "system";
export type LoginBackgroundType = 'image' | 'gradient' | 'solid';
export type EvaluateHeaderBackgroundType = 'image' | 'gradient' | 'solid';

// --- Sidebar color keys/types/utilities ---
export const DEFAULT_PRIMARY_GRADIENT_START = "179 67% 66%";
export const DEFAULT_PRIMARY_GRADIENT_END = "238 74% 61%";

// Add sidebar background type constants
export const SIDEBAR_BACKGROUND_TYPE_KEY = 'sidebarBackgroundType';
export const SIDEBAR_BACKGROUND_IMAGE_KEY = 'sidebarBackgroundImageUrl';
export const SIDEBAR_BACKGROUND_IMAGE_FIT_KEY = 'sidebarBackgroundImageFit';
export const SIDEBAR_BACKGROUND_IMAGE_POSITION_KEY = 'sidebarBackgroundImagePosition';

// Splash Screen constants
export const SPLASH_BACKGROUND_COLOR_KEY = 'splashBackgroundColor';
export const SPLASH_LOGO_DATA_URL_KEY = 'splashLogoDataUrl';
export const SPLASH_ANIMATION_TYPE_KEY = 'splashAnimationType';

export type SidebarBackgroundType = 'gradient' | 'solid' | 'image';
export type SidebarImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
export type SidebarImagePosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type SplashAnimationType = 'spinner' | 'pulse' | 'bar' | 'dots' | 'none';
export const DEFAULT_SPLASH_ANIMATION_TYPE: SplashAnimationType = 'spinner';
export const DEFAULT_SPLASH_BACKGROUND_COLOR = '#ffffff';

export const DEFAULT_SIDEBAR_COLORS_BASE = {
    // Background colors
    sidebarBgStartL: "220 25% 97%", sidebarBgEndL: "220 20% 94%", sidebarTextL: "220 25% 30%",
    sidebarActiveBgStartL: DEFAULT_PRIMARY_GRADIENT_START, sidebarActiveBgEndL: DEFAULT_PRIMARY_GRADIENT_END, sidebarActiveTextL: "0 0% 100%",
    sidebarHoverBgL: "220 10% 92%", sidebarHoverTextL: "220 25% 25%", sidebarBorderL: "220 15% 85%",
    sidebarBgStartD: "220 15% 12%", sidebarBgEndD: "220 15% 9%", sidebarTextD: "210 30% 85%",
    sidebarActiveBgStartD: DEFAULT_PRIMARY_GRADIENT_START, sidebarActiveBgEndD: DEFAULT_PRIMARY_GRADIENT_END, sidebarActiveTextD: "0 0% 100%",
    sidebarHoverBgD: "220 15% 20%", sidebarHoverTextD: "210 30% 90%", sidebarBorderD: "220 15% 18%",

    // Button text colors - separate from sidebar active text
    buttonTextColorL: "0 0% 100%", /* White text on buttons by default */
    buttonTextColorD: "0 0% 100%", /* White text on buttons by default */

    // Font settings
    sidebarFontFamilyL: "inherit", sidebarFontSizeL: "0.875rem", sidebarFontWeightL: "400",
    sidebarLineHeightL: "1.25rem", sidebarLetterSpacingL: "0", sidebarTextTransformL: "none",
    sidebarFontFamilyD: "inherit", sidebarFontSizeD: "0.875rem", sidebarFontWeightD: "400",
    sidebarLineHeightD: "1.25rem", sidebarLetterSpacingD: "0", sidebarTextTransformD: "none",

    // Border and shadow settings
    sidebarBorderWidthL: "1px", sidebarBorderStyleL: "solid", sidebarBorderRadiusL: "0.5rem",
    sidebarShadowL: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    sidebarShadowHoverL: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    sidebarShadowActiveL: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    sidebarBorderWidthD: "1px", sidebarBorderStyleD: "solid", sidebarBorderRadiusD: "0.5rem",
    sidebarShadowD: "0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)",
    sidebarShadowHoverD: "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)",
    sidebarShadowActiveD: "0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)",

    // Spacing and layout
    sidebarPaddingXL: "0.75rem", sidebarPaddingYL: "0.5rem", sidebarMarginL: "0.25rem", sidebarGapL: "0.5rem",
    sidebarWidthL: "16rem", sidebarWidthCollapsedL: "3rem", sidebarTransitionDurationL: "0.2s", sidebarTransitionTimingL: "ease-in-out",
    sidebarItemSpacingL: "0.5rem", sidebarGroupSpacingL: "1rem",
    sidebarPaddingXD: "0.75rem", sidebarPaddingYD: "0.5rem", sidebarMarginD: "0.25rem", sidebarGapD: "0.5rem",
    sidebarWidthD: "16rem", sidebarWidthCollapsedD: "3rem", sidebarTransitionDurationD: "0.2s", sidebarTransitionTimingD: "ease-in-out",
    sidebarItemSpacingD: "0.5rem", sidebarGroupSpacingD: "1rem",

    // Menu item specific settings
    sidebarMenuItemBgL: "transparent", sidebarMenuItemBgHoverL: "220 10% 92%", sidebarMenuItemBgActiveL: "179 67% 66%",
    sidebarMenuItemColorL: "220 25% 30%", sidebarMenuItemColorHoverL: "220 25% 25%", sidebarMenuItemColorActiveL: "0 0% 100%",
    sidebarMenuItemBorderL: "transparent", sidebarMenuItemBorderHoverL: "transparent", sidebarMenuItemBorderActiveL: "transparent",
    sidebarMenuItemBorderRadiusL: "0.375rem", sidebarMenuItemPaddingXL: "0.75rem", sidebarMenuItemPaddingYL: "0.5rem",
    sidebarMenuItemMarginL: "0.125rem", sidebarMenuItemFontWeightL: "400", sidebarMenuItemFontWeightActiveL: "600",
    sidebarMenuItemFontSizeL: "0.875rem", sidebarMenuItemLineHeightL: "1.25rem", sidebarMenuItemTransitionL: "all 0.2s ease-in-out",
    sidebarMenuItemBgD: "transparent", sidebarMenuItemBgHoverD: "220 15% 20%", sidebarMenuItemBgActiveD: "179 67% 66%",
    sidebarMenuItemColorD: "210 30% 85%", sidebarMenuItemColorHoverD: "210 30% 90%", sidebarMenuItemColorActiveD: "0 0% 100%",
    sidebarMenuItemBorderD: "transparent", sidebarMenuItemBorderHoverD: "transparent", sidebarMenuItemBorderActiveD: "transparent",
    sidebarMenuItemBorderRadiusD: "0.375rem", sidebarMenuItemPaddingXD: "0.75rem", sidebarMenuItemPaddingYD: "0.5rem",
    sidebarMenuItemMarginD: "0.125rem", sidebarMenuItemFontWeightD: "400", sidebarMenuItemFontWeightActiveD: "600",
    sidebarMenuItemFontSizeD: "0.875rem", sidebarMenuItemLineHeightD: "1.25rem", sidebarMenuItemTransitionD: "all 0.2s ease-in-out",

    // Icon settings
    sidebarIconSizeL: "1.25rem", sidebarIconColorL: "220 25% 30%", sidebarIconColorHoverL: "220 25% 25%", sidebarIconColorActiveL: "0 0% 100%",
    sidebarIconMarginRightL: "0.75rem", sidebarIconTransitionL: "color 0.2s ease-in-out",
    sidebarIconSizeD: "1.25rem", sidebarIconColorD: "210 30% 85%", sidebarIconColorHoverD: "210 30% 90%", sidebarIconColorActiveD: "0 0% 100%",
    sidebarIconMarginRightD: "0.75rem", sidebarIconTransitionD: "color 0.2s ease-in-out",

    // Group label settings
    sidebarGroupLabelColorL: "220 25% 40%", sidebarGroupLabelFontSizeL: "0.75rem", sidebarGroupLabelFontWeightL: "600",
    sidebarGroupLabelTextTransformL: "uppercase", sidebarGroupLabelLetterSpacingL: "0.05em", sidebarGroupLabelPaddingL: "0.5rem 0.75rem",
    sidebarGroupLabelMarginL: "1rem 0 0.5rem 0",
    sidebarGroupLabelColorD: "210 30% 70%", sidebarGroupLabelFontSizeD: "0.75rem", sidebarGroupLabelFontWeightD: "600",
    sidebarGroupLabelTextTransformD: "uppercase", sidebarGroupLabelLetterSpacingD: "0.05em", sidebarGroupLabelPaddingD: "0.5rem 0.75rem",
    sidebarGroupLabelMarginD: "1rem 0 0.5rem 0",
};

export const SIDEBAR_COLOR_KEYS = [
    // Background colors
    'sidebarBgStartL', 'sidebarBgEndL', 'sidebarTextL',
    'sidebarActiveBgStartL', 'sidebarActiveBgEndL', 'sidebarActiveTextL',
    'sidebarHoverBgL', 'sidebarHoverTextL', 'sidebarBorderL',
    'sidebarBgStartD', 'sidebarBgEndD', 'sidebarTextD',
    'sidebarActiveBgStartD', 'sidebarActiveBgEndD', 'sidebarActiveTextD',
    'sidebarHoverBgD', 'sidebarHoverTextD', 'sidebarBorderD',

    // Button text colors - separate from sidebar active text
    'buttonTextColorL', 'buttonTextColorD',

    // Font settings
    'sidebarFontFamilyL', 'sidebarFontSizeL', 'sidebarFontWeightL', 'sidebarLineHeightL', 'sidebarLetterSpacingL', 'sidebarTextTransformL',
    'sidebarFontFamilyD', 'sidebarFontSizeD', 'sidebarFontWeightD', 'sidebarLineHeightD', 'sidebarLetterSpacingD', 'sidebarTextTransformD',

    // Border and shadow settings
    'sidebarBorderWidthL', 'sidebarBorderStyleL', 'sidebarBorderRadiusL', 'sidebarShadowL', 'sidebarShadowHoverL', 'sidebarShadowActiveL',
    'sidebarBorderWidthD', 'sidebarBorderStyleD', 'sidebarBorderRadiusD', 'sidebarShadowD', 'sidebarShadowHoverD', 'sidebarShadowActiveD',

    // Spacing and layout
    'sidebarPaddingXL', 'sidebarPaddingYL', 'sidebarMarginL', 'sidebarGapL', 'sidebarWidthL', 'sidebarWidthCollapsedL', 'sidebarTransitionDurationL', 'sidebarTransitionTimingL',
    'sidebarItemSpacingL', 'sidebarGroupSpacingL', 'sidebarIconSizeL',
    'sidebarPaddingXD', 'sidebarPaddingYD', 'sidebarMarginD', 'sidebarGapD', 'sidebarWidthD', 'sidebarWidthCollapsedD', 'sidebarTransitionDurationD', 'sidebarTransitionTimingD',
    'sidebarItemSpacingD', 'sidebarGroupSpacingD', 'sidebarIconSizeD',

    // Menu item specific settings
    'sidebarMenuItemBgL', 'sidebarMenuItemBgHoverL', 'sidebarMenuItemBgActiveL', 'sidebarMenuItemColorL', 'sidebarMenuItemColorHoverL', 'sidebarMenuItemColorActiveL',
    'sidebarMenuItemBorderL', 'sidebarMenuItemBorderHoverL', 'sidebarMenuItemBorderActiveL', 'sidebarMenuItemBorderRadiusL', 'sidebarMenuItemPaddingXL', 'sidebarMenuItemPaddingYL',
    'sidebarMenuItemMarginL', 'sidebarMenuItemFontWeightL', 'sidebarMenuItemFontWeightActiveL', 'sidebarMenuItemFontSizeL', 'sidebarMenuItemLineHeightL', 'sidebarMenuItemTransitionL',
    'sidebarMenuItemBgD', 'sidebarMenuItemBgHoverD', 'sidebarMenuItemBgActiveD', 'sidebarMenuItemColorD', 'sidebarMenuItemColorHoverD', 'sidebarMenuItemColorActiveD',
    'sidebarMenuItemBorderD', 'sidebarMenuItemBorderHoverD', 'sidebarMenuItemBorderActiveD', 'sidebarMenuItemBorderRadiusD', 'sidebarMenuItemPaddingXD', 'sidebarMenuItemPaddingYD',
    'sidebarMenuItemMarginD', 'sidebarMenuItemFontWeightD', 'sidebarMenuItemFontWeightActiveD', 'sidebarMenuItemFontSizeD', 'sidebarMenuItemLineHeightD', 'sidebarMenuItemTransitionD',

    // Icon settings
    'sidebarIconColorL', 'sidebarIconColorHoverL', 'sidebarIconColorActiveL', 'sidebarIconMarginRightL', 'sidebarIconTransitionL',
    'sidebarIconColorD', 'sidebarIconColorHoverD', 'sidebarIconColorActiveD', 'sidebarIconMarginRightD', 'sidebarIconTransitionD',

    // Group label settings
    'sidebarGroupLabelColorL', 'sidebarGroupLabelFontSizeL', 'sidebarGroupLabelFontWeightL', 'sidebarGroupLabelTextTransformL', 'sidebarGroupLabelLetterSpacingL', 'sidebarGroupLabelPaddingL', 'sidebarGroupLabelMarginL',
    'sidebarGroupLabelColorD', 'sidebarGroupLabelFontSizeD', 'sidebarGroupLabelFontWeightD', 'sidebarGroupLabelTextTransformD', 'sidebarGroupLabelLetterSpacingD', 'sidebarGroupLabelPaddingD', 'sidebarGroupLabelMarginD',
];

export interface SidebarColors {
    // Background colors
    sidebarBgStartL: string; sidebarBgEndL: string; sidebarTextL: string;
    sidebarActiveBgStartL: string; sidebarActiveBgEndL: string; sidebarActiveTextL: string;
    sidebarHoverBgL: string; sidebarHoverTextL: string; sidebarBorderL: string;
    sidebarBgStartD: string; sidebarBgEndD: string; sidebarTextD: string;
    sidebarActiveBgStartD: string; sidebarActiveBgEndD: string;
    sidebarActiveTextD: string;
    sidebarHoverBgD: string; sidebarHoverTextD: string; sidebarBorderD: string;

    // Button text colors - separate from sidebar active text
    buttonTextColorL: string;
    buttonTextColorD: string;

    // Font settings
    sidebarFontFamilyL: string; sidebarFontSizeL: string; sidebarFontWeightL: string;
    sidebarLineHeightL: string; sidebarLetterSpacingL: string; sidebarTextTransformL: string;
    sidebarFontFamilyD: string; sidebarFontSizeD: string; sidebarFontWeightD: string;
    sidebarLineHeightD: string; sidebarLetterSpacingD: string; sidebarTextTransformD: string;

    // Border and shadow settings
    sidebarBorderWidthL: string; sidebarBorderStyleL: string; sidebarBorderRadiusL: string;
    sidebarShadowL: string; sidebarShadowHoverL: string; sidebarShadowActiveL: string;
    sidebarBorderWidthD: string; sidebarBorderStyleD: string; sidebarBorderRadiusD: string;
    sidebarShadowD: string; sidebarShadowHoverD: string; sidebarShadowActiveD: string;

    // Spacing and layout
    sidebarPaddingXL: string; sidebarPaddingYL: string; sidebarMarginL: string; sidebarGapL: string;
    sidebarWidthL: string; sidebarWidthCollapsedL: string; sidebarTransitionDurationL: string; sidebarTransitionTimingL: string;
    sidebarPaddingXD: string; sidebarPaddingYD: string; sidebarMarginD: string; sidebarGapD: string;
    sidebarWidthD: string; sidebarWidthCollapsedD: string; sidebarTransitionDurationD: string; sidebarTransitionTimingD: string;

    // Menu item specific settings
    sidebarMenuItemBgL: string; sidebarMenuItemBgHoverL: string; sidebarMenuItemBgActiveL: string;
    sidebarMenuItemColorL: string; sidebarMenuItemColorHoverL: string; sidebarMenuItemColorActiveL: string;
    sidebarMenuItemBorderL: string; sidebarMenuItemBorderHoverL: string; sidebarMenuItemBorderActiveL: string;
    sidebarMenuItemBorderRadiusL: string; sidebarMenuItemPaddingXL: string; sidebarMenuItemPaddingYL: string;
    sidebarMenuItemMarginL: string; sidebarMenuItemFontWeightL: string; sidebarMenuItemFontWeightActiveL: string;
    sidebarMenuItemFontSizeL: string; sidebarMenuItemLineHeightL: string; sidebarMenuItemTransitionL: string;
    sidebarMenuItemBgD: string; sidebarMenuItemBgHoverD: string; sidebarMenuItemBgActiveD: string;
    sidebarMenuItemColorD: string; sidebarMenuItemColorHoverD: string; sidebarMenuItemColorActiveD: string;
    sidebarMenuItemBorderD: string; sidebarMenuItemBorderHoverD: string; sidebarMenuItemBorderActiveD: string;
    sidebarMenuItemBorderRadiusD: string; sidebarMenuItemPaddingXD: string; sidebarMenuItemPaddingYD: string;
    sidebarMenuItemMarginD: string; sidebarMenuItemFontWeightD: string; sidebarMenuItemFontWeightActiveD: string;
    sidebarMenuItemFontSizeD: string; sidebarMenuItemLineHeightD: string; sidebarMenuItemTransitionD: string;

    // Icon settings
    sidebarIconSizeL: string; sidebarIconColorL: string; sidebarIconColorHoverL: string; sidebarIconColorActiveL: string;
    sidebarIconMarginRightL: string; sidebarIconTransitionL: string;
    sidebarIconSizeD: string; sidebarIconColorD: string; sidebarIconColorHoverD: string; sidebarIconColorActiveD: string;
    sidebarIconMarginRightD: string; sidebarIconTransitionD: string;

    // Group label settings
    sidebarGroupLabelColorL: string; sidebarGroupLabelFontSizeL: string; sidebarGroupLabelFontWeightL: string; sidebarGroupLabelTextTransformL: string; sidebarGroupLabelLetterSpacingL: string; sidebarGroupLabelPaddingL: string; sidebarGroupLabelMarginL: string;
    sidebarGroupLabelColorD: string; sidebarGroupLabelFontSizeD: string; sidebarGroupLabelFontWeightD: string; sidebarGroupLabelTextTransformD: string; sidebarGroupLabelLetterSpacingD: string; sidebarGroupLabelPaddingD: string; sidebarGroupLabelMarginD: string;

    [key: string]: string;
}

export const DEFAULT_DRAWER_STYLE = 'classic';
export type DrawerStyle = 'classic' | 'modern';
export type LoginPageLayoutType = 'center' | '2column';

export function createInitialSidebarColors() {
    return { ...DEFAULT_SIDEBAR_COLORS_BASE };
}

// Login page design state
export const DEFAULT_LOGIN_BACKGROUND_TYPE: LoginBackgroundType = 'gradient';
export const DEFAULT_LOGIN_BACKGROUND_GRADIENT_START = '179 67% 66%';
export const DEFAULT_LOGIN_BACKGROUND_GRADIENT_END = '238 74% 61%';
export const DEFAULT_LOGIN_BACKGROUND_COLOR = '220 25% 97%';

// Mobile defaults (fallback to desktop if not set, but defined here for type safety)
export const DEFAULT_LOGIN_BACKGROUND_TYPE_MOBILE = DEFAULT_LOGIN_BACKGROUND_TYPE;

// Evaluate page header background defaults
export const DEFAULT_EVALUATE_HEADER_BACKGROUND_TYPE: EvaluateHeaderBackgroundType = 'gradient';
export const DEFAULT_EVALUATE_HEADER_BACKGROUND_GRADIENT_START = '179 67% 66%';
export const DEFAULT_EVALUATE_HEADER_BACKGROUND_GRADIENT_END = '238 74% 61%';
export const DEFAULT_EVALUATE_HEADER_BACKGROUND_COLOR = '220 25% 97%';
export const DEFAULT_EVALUATE_HEADER_TEXT_COLOR = '0 0% 0%'; // Black by default

// Interviewer selection defaults
export const DEFAULT_INTERVIEWER_SELECTED_BG_COLOR = '220 25% 97%';
export const DEFAULT_INTERVIEWER_SELECTED_TEXT_COLOR = '0 0% 0%';
export const DEFAULT_INTERVIEWER_SELECTED_BORDER_COLOR = '220 15% 50%';
export const DEFAULT_INTERVIEWER_SELECTED_BORDER_WIDTH = '2px';
export const DEFAULT_INTERVIEWER_NON_SELECTED_BG_COLOR = '220 25% 97%';
export const DEFAULT_INTERVIEWER_NON_SELECTED_TEXT_COLOR = '220 25% 50%';
export const DEFAULT_INTERVIEWER_NON_SELECTED_BORDER_COLOR = '220 15% 85%';
export const DEFAULT_INTERVIEWER_NON_SELECTED_BORDER_WIDTH = '1px';
export const DEFAULT_INTERVIEWER_NAME_COLOR = '220 25% 30%';

// Drawer style constants
export const DRAWER_STYLE_KEY = 'drawerStyle';
