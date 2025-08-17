"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotificationManager } from '@/hooks/use-notification-manager';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, User, Briefcase, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export function NotificationDemo() {
  const { 
    notifyCandidateUpdate, 
    notifyPositionUpdate, 
    notifyUserAction, 
    notifySystemEvent, 
    notifyTaskUpdate,
    notifyCustom 
  } = useNotificationManager();
  
  const { unreadCount, notifications } = useNotifications();

  const handleCandidateNotification = () => {
    notifyCandidateUpdate(
      'candidate-123',
      'John Doe',
      'updated',
      { stage: 'Interview', recruiter: 'Jane Smith' }
    );
  };

  const handlePositionNotification = () => {
    notifyPositionUpdate(
      'position-456',
      'Senior Software Engineer',
      'created',
      { department: 'Engineering', location: 'Remote' }
    );
  };

  const handleUserNotification = () => {
    notifyUserAction(
      'user-789',
      'Alice Johnson',
      'logged_in',
      { ip: '192.168.1.100', userAgent: 'Chrome/120.0' }
    );
  };

  const handleSystemNotification = () => {
    notifySystemEvent(
      'System Maintenance',
      'Scheduled maintenance will begin in 30 minutes. Please save your work.',
      'warning',
      { maintenanceId: 'maint-001', duration: '2 hours' }
    );
  };

  const handleTaskNotification = () => {
    notifyTaskUpdate(
      'task-101',
      'Review candidate applications',
      'assigned',
      { dueDate: '2024-01-15', priority: 'high' }
    );
  };

  const handleCustomNotification = () => {
    notifyCustom(
      'custom_event',
      'Custom Event',
      'This is a custom notification with specific data',
      { customField: 'customValue', timestamp: new Date().toISOString() }
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification System Demo</h2>
          <p className="text-muted-foreground">
            Test the real-time notification system across all pages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <span className="text-sm font-medium">
            {unreadCount} unread notifications
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Candidate Updates
            </CardTitle>
            <CardDescription>
              Test candidate-related notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCandidateNotification} className="w-full">
              Create Candidate Notification
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Position Updates
            </CardTitle>
            <CardDescription>
              Test position-related notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handlePositionNotification} className="w-full">
              Create Position Notification
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Actions
            </CardTitle>
            <CardDescription>
              Test user action notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleUserNotification} className="w-full">
              Create User Notification
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              System Events
            </CardTitle>
            <CardDescription>
              Test system event notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSystemNotification} className="w-full">
              Create System Notification
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Task Updates
            </CardTitle>
            <CardDescription>
              Test task-related notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleTaskNotification} className="w-full">
              Create Task Notification
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Custom Events
            </CardTitle>
            <CardDescription>
              Test custom notification events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCustomNotification} className="w-full">
              Create Custom Notification
            </Button>
          </CardContent>
        </Card>
      </div>

      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>
              Latest notifications from the global context
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                                     className={`p-3 rounded-lg border ${
                     notification.isRead 
                       ? 'bg-card opacity-60 border-border' 
                       : 'bg-card border-border'
                   }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                                         {!notification.isRead && (
                       <div className="w-2 h-2 bg-primary rounded-full ml-2 mt-1" />
                     )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
