import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RecruiterAvatarCompact } from '@/components/ui/recruiter-avatar';
import { Users, User, Loader2, X } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

interface RecruiterAssignmentDropdownProps {
  candidateId: string;
  recruiterId: string | null;
  recruiters: Pick<UserProfile, 'id' | 'name' | 'avatarUrl' | 'personalColor'>[];
  isAssigningRecruiter: boolean;
  onAssignRecruiter: (recruiterId: string | null) => void;
  className?: string;
}

const RecruiterAssignmentDropdown: React.FC<RecruiterAssignmentDropdownProps> = ({
  candidateId,
  recruiterId,
  recruiters,
  isAssigningRecruiter,
  onAssignRecruiter,
  className = '',
}) => {
  const [recruiterSearchTerm, setRecruiterSearchTerm] = useState('');
  const [filteredRecruiter, setFilteredRecruiter] = useState(recruiters);

  useEffect(() => {
    try {
      // Defensive check to prevent filter errors
      if (!Array.isArray(recruiters)) {
        console.warn('RecruiterAssignmentDropdown: recruiters is not an array:', recruiters);
        setFilteredRecruiter([]);
        return;
      }
      
      if (recruiterSearchTerm.trim() === '') {
        setFilteredRecruiter(recruiters);
      } else {
        setFilteredRecruiter(
          recruiters.filter(r => {
            try {
              return r && r.name && r.name.toLowerCase().includes(recruiterSearchTerm.toLowerCase());
            } catch (error) {
              console.warn('RecruiterAssignmentDropdown: Error filtering recruiter:', error, r);
              return false;
            }
          })
        );
      }
    } catch (error) {
      console.error('RecruiterAssignmentDropdown: Error filtering recruiters:', error);
      setFilteredRecruiter([]);
    }
  }, [recruiterSearchTerm, recruiters]);

  return (
    <Popover onOpenChange={open => { if (!open) setRecruiterSearchTerm(''); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="default"
          disabled={isAssigningRecruiter || !candidateId}
          className={`w-48 h-18 flex flex-col items-start justify-center p-3 ${className}`}
        >
          <div className="flex items-center mb-1">
            <Users className="h-4 w-4 mr-2" />
            <span className="font-bold text-sm">Recruiter</span>
          </div>
          <span className="text-xs text-muted-foreground text-left leading-tight">
            {recruiterId && recruiters.length > 0
              ? recruiters.find(r => r.id === recruiterId)?.name || 'Unknown'
              : 'Unassigned'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="py-1">
          {recruiters.length > 0 ? (
            <>
              <div className="px-3 py-2">
                <Input
                  placeholder="Search recruiters..."
                  className="h-8 text-xs"
                  value={recruiterSearchTerm}
                  onChange={e => setRecruiterSearchTerm(e.target.value)}
                />
              </div>
              {filteredRecruiter.length > 0 ? (
                filteredRecruiter.map(recruiter => (
                  <button
                    key={recruiter.id}
                    onClick={() => onAssignRecruiter(recruiter.id)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center"
                    disabled={isAssigningRecruiter}
                  >
                    <RecruiterAvatarCompact
                      user={{
                        id: recruiter.id,
                        name: recruiter.name,
                        avatarUrl: recruiter.avatarUrl,
                        personalColor: recruiter.personalColor
                      }}
                      size="xs"
                      className="mr-2"
                    />
                    {recruiter.name}
                    {recruiterId === recruiter.id && (
                      <Badge variant="secondary" className="ml-auto text-xs">Current</Badge>
                    )}
                  </button>
                ))
              ) : recruiterSearchTerm.trim() !== '' ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  No recruiters found matching "{recruiterSearchTerm}"
                </div>
              ) : null}
              {recruiterId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAssignRecruiter(null)}
                  disabled={isAssigningRecruiter}
                  className="w-full mt-2"
                >
                  {isAssigningRecruiter ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <span className="ml-2">Unassign</span>
                </Button>
              )}
            </>
          ) : (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              No recruiters available
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default RecruiterAssignmentDropdown; 