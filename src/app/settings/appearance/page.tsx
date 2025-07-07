"use client";
import React, { useEffect, useState, type ChangeEvent } from "react";
import { Loader2, Save, X, Palette, ImageUp, Trash2, XCircle, PenSquare, Sun, Moon, RotateCcw, Sidebar as SidebarIcon, LogIn } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { setThemeAndColors } from "@/lib/themeUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

const DEFAULT_APP_NAME = "CandiTrack";
const DEFAULT_THEME: ThemePreference = "system";

// Backend keys
const APP_THEME_KEY = 'themePreference';
const APP_LOGO_DATA_URL_KEY = 'appLogoDataUrl';
const APP_NAME_KEY = 'appName';
const APP_CONFIG_APP_NAME_KEY = 'appConfigAppName';

// Login page design keys/types/utilities
const LOGIN_BACKGROUND_TYPE_KEY = 'loginBackgroundType';
const LOGIN_BACKGROUND_IMAGE_KEY = 'loginBackgroundImage';
const LOGIN_BACKGROUND_GRADIENT_START_KEY = 'loginBackgroundGradientStart';
const LOGIN_BACKGROUND_GRADIENT_END_KEY = 'loginBackgroundGradientEnd';
const LOGIN_BACKGROUND_COLOR_KEY = 'loginBackgroundColor';

type ThemePreference = "light" | "dark" | "system";

export default function AppearanceSettingsPage() {
  // ... rest of the component logic and JSX ...
  return (
    <div className="space-y-8">
      <div className="w-full max-w-xl mx-auto shadow-lg rounded-xl border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Palette className="mr-2 h-6 w-6 text-primary" /> Appearance
        </div>
        <div className="space-y-6">
          {/* ...rest of the JSX... */}
        </div>
      </div>
    </div>
  );
} 