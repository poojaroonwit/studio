"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  MapPin, 
  Users, 
  RefreshCw, 
  Loader2, 
  AlertTriangle,
  Building2,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'react-hot-toast';

interface MeetingRoom {
  id: string;
  name: string;
  email: string;
  capacity?: number;
  building?: string;
  floor?: string;
}

export default function MeetingRoomsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRooms = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const response = await fetch('/api/azure/meeting-rooms');
      const data = await response.json();
      
      if (data.success) {
        setRooms(data.rooms || []);
      } else {
        toast.error(data.error || 'Failed to fetch meeting rooms');
      }
    } catch (error) {
      console.error('Error fetching meeting rooms:', error);
      toast.error('An error occurred while fetching meeting rooms');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRooms();
    }
  }, [status]);

  if (status === 'loading' || (isLoading && !isRefreshing)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 -ml-2" 
                onClick={() => router.push('/settings')}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Meeting Rooms</h1>
          </div>
          <p className="text-muted-foreground">
            View and manage meeting rooms integrated from Azure AD / Microsoft 365
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchRooms(true)}
          disabled={isRefreshing}
          className="w-full md:w-auto"
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh List
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        {rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-base truncate" title={room.name}>
                        {room.name}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        <Calendar className="h-3 w-3 mr-1" />
                        Available
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 text-xs truncate">
                    <MapPin className="h-3 w-3 shrink-0 uppercase" />
                    {room.building && room.floor ? `${room.building}, Floor ${room.floor}` : room.building || 'Generic Location'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{room.email}</span>
                    </div>
                    {room.capacity !== undefined && (
                        <div className="flex items-center text-sm text-muted-foreground gap-2">
                            <Users className="h-4 w-4 shrink-0" />
                            <span>Capacity: {room.capacity} people</span>
                        </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 rounded-xl border border-dashed">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Calendar className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Meeting Rooms Found</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Configure your Azure Integration in System Settings to fetch meeting rooms from Microsoft 365.
            </p>
            <Button onClick={() => router.push('/settings/system-settings?tab=azure')}>
              Go to Azure Integration
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
