"use client";
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { CheckCircle, AlertTriangle, Info, Loader2, XCircle, X, Bell } from 'lucide-react';
import React from 'react';

export default function ToastClient() {
  return (
    <Toaster
      position="top-right"
      gutter={16}
      toastOptions={{
        duration: 4000,
        style: {
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '8px',
          padding: '12px 16px',
          minWidth: '300px',
          maxWidth: '400px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        },
      }}
    >
      {(t) => {
        // Determine group (ackgroup) and type
        const ackgroup = t.type;
        // Map group/type to color and icon
        const groupMap = {
          success: {
            color: 'hsl(142 76% 36%)',
            bg: 'hsl(142 76% 90%)', // light green
            icon: <CheckCircle className="h-5 w-5 text-green-600" />,
          },
          error: {
            color: 'hsl(var(--destructive))',
            bg: 'hsl(0 84% 95%)', // light red
            icon: <XCircle className="h-5 w-5 text-red-600" />,
          },
          warning: {
            color: 'hsl(45 100% 51%)',
            bg: 'hsl(45 100% 92%)', // light yellow
            icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          },
          info: {
            color: 'hsl(210 100% 56%)',
            bg: 'hsl(210 100% 96%)', // light blue
            icon: <Info className="h-5 w-5 text-blue-600" />,
          },
          loading: {
            color: 'hsl(var(--primary))',
            bg: 'hsl(222 89% 96%)', // light primary
            icon: <Loader2 className="h-5 w-5 animate-spin text-primary" />,
          },
          notification: {
            color: 'hsl(262 83% 58%)',
            bg: 'hsl(262 83% 95%)', // light purple
            icon: <Bell className="h-5 w-5 text-purple-600" />,
          },
          custom: {
            color: 'hsl(var(--border))',
            bg: 'hsl(var(--background))',
            icon: <Info className="h-5 w-5 text-muted-foreground" />,
          },
          blank: {
            color: 'hsl(var(--border))',
            bg: 'hsl(var(--background))',
            icon: <Info className="h-5 w-5 text-muted-foreground" />,
          },
          default: {
            color: 'hsl(var(--border))',
            bg: 'hsl(var(--background))',
            icon: <Info className="h-5 w-5 text-muted-foreground" />,
          },
        };
        const group = groupMap[ackgroup] || groupMap[t.type] || groupMap.default;
        return (
          <ToastBar
            toast={t}
            style={{
              ...t.style,
              background: group.bg,
              color: 'hsl(var(--foreground))',
              border: `2px solid ${group.color}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderLeft: `8px solid ${group.color}`,
              alignItems: 'center',
              display: 'flex',
              gap: '12px',
            }}
          >
            {({ message }) => (
              <>
                {group.icon}
                <div className="flex-1 whitespace-pre-line">{message}</div>
                {t.type !== 'loading' && (
                  <button
                    className="ml-2 p-1 rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    onClick={() => toast.dismiss(t.id)}
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </>
            )}
          </ToastBar>
        );
      }}
    </Toaster>
  );
} 