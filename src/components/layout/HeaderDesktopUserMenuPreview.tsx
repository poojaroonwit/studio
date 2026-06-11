"use client";

import {
  ArrowPathIcon as RefreshCw,
  CubeIcon as Package2,
  EyeIcon as Eye,
} from "@heroicons/react/24/outline";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HeaderUserMenuSharedProps } from "./HeaderTypes";

type HeaderDesktopMenuProps = HeaderUserMenuSharedProps;

export function HeaderDesktopPreviewTools({
  isAdminPreviewEnabled,
  previewUsers,
  isSearchingUsers,
  onUserSearch,
  onStartImpersonation,
}: Pick<
  HeaderDesktopMenuProps,
  "isAdminPreviewEnabled" | "previewUsers" | "isSearchingUsers" | "onUserSearch" | "onStartImpersonation"
>) {
  if (!isAdminPreviewEnabled) {
    return null;
  }

  return (
    <>
      <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800/60" />
      <div className="p-3 space-y-1">
        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest px-3 mb-2">Preview Tools</p>
        <PreviewRoleSubmenu onStartImpersonation={onStartImpersonation} />
        <PreviewUserSubmenu
          previewUsers={previewUsers}
          isSearchingUsers={isSearchingUsers}
          onUserSearch={onUserSearch}
          onStartImpersonation={onStartImpersonation}
        />
      </div>
    </>
  );
}

function PreviewRoleSubmenu({
  onStartImpersonation,
}: Pick<HeaderDesktopMenuProps, "onStartImpersonation">) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition-colors">
        <Eye className="mr-3 h-4 w-4 text-amber-500" />
        <span>Preview as Role</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="p-1 min-w-[180px] rounded-xl border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl">
        <DropdownMenuItem onClick={() => onStartImpersonation(null, "Recruiter")} className="px-3 py-2 rounded-lg cursor-pointer text-xs font-medium">
          Recruiter View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStartImpersonation(null, "Hiring Manager")} className="px-3 py-2 rounded-lg cursor-pointer text-xs font-medium">
          Hiring Manager View
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function PreviewUserSubmenu({
  previewUsers,
  isSearchingUsers,
  onUserSearch,
  onStartImpersonation,
}: Pick<HeaderDesktopMenuProps, "previewUsers" | "isSearchingUsers" | "onUserSearch" | "onStartImpersonation">) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex items-center px-4 py-3 rounded-xl cursor-pointer text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition-colors">
        <Package2 className="mr-3 h-4 w-4 text-amber-500" />
        <span>Preview as User</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="p-0 min-w-[240px] max-h-[300px] overflow-hidden rounded-xl border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl flex flex-col">
        <div className="p-2 border-b border-border/50">
          <input
            type="text"
            placeholder="Search users..."
            className="w-full px-3 py-1.5 text-xs rounded-md bg-muted/50 border-none focus:ring-1 focus:ring-amber-500 outline-none"
            autoFocus
            onChange={(event) => onUserSearch(event.target.value)}
          />
        </div>
        <ScrollArea className="flex-1 max-h-[220px]">
          <div className="p-1">
            {isSearchingUsers ? (
              <div className="py-8 text-center">
                <RefreshCw className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : previewUsers.length > 0 ? (
              previewUsers.map((previewUser) => (
                <DropdownMenuItem
                  key={previewUser.id}
                  onClick={() => onStartImpersonation(previewUser.id, null)}
                  className="flex flex-col items-start px-3 py-2 rounded-lg cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                >
                  <span className="text-xs font-semibold">{previewUser.name}</span>
                  <span className="text-[10px] text-muted-foreground">{previewUser.email} - {previewUser.role}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <p className="p-4 text-[10px] text-muted-foreground italic text-center">
                Type at least 2 characters to search active users
              </p>
            )}
          </div>
        </ScrollArea>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
