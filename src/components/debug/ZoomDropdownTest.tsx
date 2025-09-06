"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useZoom } from '@/components/ui/zoom-control';
import { UserAvatarCompact } from '@/components/ui/user-avatar';

export function ZoomDropdownTest() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { zoom, setZoom } = useZoom();

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Zoom Dropdown Test</h2>
        <p className="text-muted-foreground">
          Current zoom level: {Math.round(zoom * 100)}%
        </p>
        
        <div className="flex gap-4">
          <Button onClick={() => setZoom(0.5)} variant="outline">50%</Button>
          <Button onClick={() => setZoom(0.7)} variant="outline">70%</Button>
          <Button onClick={() => setZoom(0.9)} variant="outline">90%</Button>
          <Button onClick={() => setZoom(1.0)} variant="outline">100%</Button>
          <Button onClick={() => setZoom(1.2)} variant="outline">120%</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Avatar Dropdown Test */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Avatar Dropdown Test</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="relative h-8 w-8 rounded-full cursor-pointer hover:bg-accent/20 transition-colors">
                <UserAvatarCompact 
                  user={{
                    id: '1',
                    name: 'Test User',
                    email: 'test@example.com',
                    avatarUrl: null
                  }} 
                  size="sm" 
                />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-50">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Help</DropdownMenuItem>
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Popover Test */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Popover Test</h3>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline">Open Popover</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">Popover Content</h4>
                <p className="text-sm text-muted-foreground">
                  This popover should be positioned correctly relative to the trigger button,
                  even when the page is zoomed out.
                </p>
                <Button onClick={() => setPopoverOpen(false)} size="sm">
                  Close
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Dropdown Menu Test */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dropdown Menu Test</h3>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open Dropdown</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Help</DropdownMenuItem>
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Select Test */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select Test</h3>
          <Select>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
              <SelectItem value="option4">Option 4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-2">Test Instructions:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Click the zoom buttons to change the page zoom level</li>
          <li>Open each dropdown/popover at different zoom levels</li>
          <li>Verify that the dropdowns appear close to their trigger buttons</li>
          <li>The dropdowns should not appear far from the click point when zoomed out</li>
        </ol>
      </div>
    </div>
  );
}
