import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import {
  LOGIN_BACKGROUND_TYPE_OPTIONS,
  LOGIN_LAYOUT_OPTIONS,
} from "./appearance-tab-utils";
import {
  type LoginBackgroundType,
  type LoginPageLayoutType,
} from "./constants";

interface LoginBackgroundTypeSelectProps {
  backgroundType: LoginBackgroundType;
  canEdit: boolean;
  id: string;
  isMobile: boolean;
  onChange: (value: LoginBackgroundType) => void;
}

export function LoginBackgroundTypeSelect({
  backgroundType,
  canEdit,
  id,
  isMobile,
  onChange,
}: LoginBackgroundTypeSelectProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={id}>Background Type{isMobile ? " (Mobile)" : ""}</Label>
        <Select
          value={backgroundType}
          onValueChange={(value) => onChange(value as LoginBackgroundType)}
          disabled={!canEdit}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Select background type" />
          </SelectTrigger>
          <SelectContent>
            {LOGIN_BACKGROUND_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface LoginLayoutTypeSelectProps {
  canEdit: boolean;
  isMobile: boolean;
  loginLayoutType?: LoginPageLayoutType;
  onChange?: (value: LoginPageLayoutType) => void;
}

export function LoginLayoutTypeSelect({
  canEdit,
  isMobile,
  loginLayoutType,
  onChange,
}: LoginLayoutTypeSelectProps) {
  if (isMobile || !loginLayoutType || !onChange) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="login-layout-type">Login Page Layout</Label>
        <Select
          value={loginLayoutType}
          onValueChange={(value) => onChange(value as LoginPageLayoutType)}
          disabled={!canEdit}
        >
          <SelectTrigger id="login-layout-type" className="w-full">
            <SelectValue placeholder="Select login layout" />
          </SelectTrigger>
          <SelectContent>
            {LOGIN_LAYOUT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose how the login panel is positioned on desktop screens
        </p>
      </div>
    </div>
  );
}
