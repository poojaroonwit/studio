"use client";
import { useState, useEffect, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Palette, ImageUp, Trash2, Loader2, XCircle, PenSquare, Sidebar, Paintbrush } from 'lucide-react';
import Image from 'next/image';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { applySidebarActiveStyle, setThemeAndColors } from '@/lib/themeUtils';

const APP_THEME_KEY = 'appThemePreference';
const APP_LOGO_DATA_URL_KEY = 'appLogoDataUrl';
const APP_CONFIG_APP_NAME_KEY = 'appConfigAppName'; // Key for app name
const SIDEBAR_ACTIVE_STYLE_KEY = 'sidebarActiveStylePreference'; // Key for sidebar active style
const LOGIN_BG_DATA_URL_KEY = 'loginBackgroundDataUrl'; // Key for login background
const DEFAULT_APP_NAME = "CandiTrack"; // Default app name

type ThemePreference = "light" | "dark" | "system";

type SidebarActiveStyle = "gradient" | "solid" | "outline" | "subtle";

export default function MyPreferencesSettingsPage() {
  const { show, success, error } = useToast();
  const [isClient, setIsClient] = useState(false);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Preferences state
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [appName, setAppName] = useState<string>(DEFAULT_APP_NAME);
  const [sidebarActiveStyle, setSidebarActiveStyle] = useState<SidebarActiveStyle>('gradient');

  // Sidebar Colors state
  const [sidebarColors, setSidebarColors] = useState({
    // Light theme
    sidebarBgStartL: '0 0% 100%', // White
    sidebarBgEndL: '0 0% 100%', // White
    sidebarTextL: '222.2 84% 4.9%', // Dark text
    sidebarActiveBgStartL: '179 67% 66%', // Primary start
    sidebarActiveBgEndL: '238 74% 61%', // Primary end
    sidebarActiveTextL: '0 0% 100%', // White text
    sidebarHoverBgL: '210 40% 98%', // Light hover
    sidebarHoverTextL: '222.2 84% 4.9%', // Dark text
    sidebarBorderL: '214.3 31.8% 91.4%', // Light border
    // Dark theme
    sidebarBgStartD: '222.2 84% 4.9%', // Dark background
    sidebarBgEndD: '222.2 84% 4.9%', // Dark background
    sidebarTextD: '210 40% 98%', // Light text
    sidebarActiveBgStartD: '179 67% 66%', // Primary start
    sidebarActiveBgEndD: '238 74% 61%', // Primary end
    sidebarActiveTextD: '0 0% 100%', // White text
    sidebarHoverBgD: '217.2 32.6% 17.5%', // Dark hover
    sidebarHoverTextD: '210 40% 98%', // Light text
    sidebarBorderD: '217.2 32.6% 17.5%', // Dark border
  });

  // App Logo state
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [savedLogoDataUrl, setSavedLogoDataUrl] = useState<string | null>(null);

  // ... rest of the component logic and JSX ...
  return (
    <div className="space-y-8">
      <div className="w-full max-w-xl mx-auto shadow-lg rounded-xl border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Palette className="mr-2 h-6 w-6 text-primary" /> My Preferences
        </div>
        <div className="space-y-6">
          {/* ...rest of the JSX... */}
        </div>
      </div>
    </div>
  );
} 