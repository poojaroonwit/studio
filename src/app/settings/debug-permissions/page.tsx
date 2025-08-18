"use client";

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DebugPermissionsPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session?.user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Debug User Permissions</h1>
        <p className="text-muted-foreground">Check what permissions the current user has</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Basic user details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div><strong>Name:</strong> {session.user.name}</div>
          <div><strong>Email:</strong> {session.user.email}</div>
          <div><strong>Role:</strong> <Badge>{session.user.role}</Badge></div>
          <div><strong>User ID:</strong> {session.user.id}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module Permissions</CardTitle>
          <CardDescription>Permissions assigned to this user</CardDescription>
        </CardHeader>
        <CardContent>
          {session.user.role === 'Admin' ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Admin Role - All Permissions</Badge>
            </div>
          ) : (
            <p className="text-muted-foreground">No module permissions assigned (role-based only)</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permission Checks</CardTitle>
          <CardDescription>Results of specific permission checks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <strong>Is Admin:</strong>
            <Badge variant={session.user.role === 'Admin' ? 'default' : 'secondary'}>
              {session.user.role === 'Admin' ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <strong>Has USER_GROUPS_MANAGE:</strong>
            <Badge variant={session.user.role === 'Admin' ? 'default' : 'secondary'}>
              {session.user.role === 'Admin' ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <strong>Can access user groups:</strong>
            <Badge variant={session.user.role === 'Admin' ? 'default' : 'secondary'}>
              {session.user.role === 'Admin' ? 'Yes' : 'No'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Groups</CardTitle>
          <CardDescription>Groups this user belongs to</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const userAny = session.user as any;
            const teams = userAny?.teams as Array<{ id: string; name: string }>|undefined;
            return teams && teams.length > 0 ? (
            <div className="space-y-2">
              {teams.map((team) => (
                <Badge key={team.id} variant="outline">
                  {team.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No groups assigned</p>
          );})()}
        </CardContent>
      </Card>
    </div>
  );
}
