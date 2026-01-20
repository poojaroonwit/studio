
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Briefcase, User, Mail, Phone, ExternalLink, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface HiringDetailTabProps {
    userId: string;
}

interface HiringDetails {
    headcount: {
        id: string;
        type: string;
        status: string;
        employeeId: string;
        position: {
            id: string;
            title: string;
            department: string;
        };
    } | null;
    candidate: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        positionId: string | null;
        recruitmentStage: {
            name: string;
            color_badge: string | null;
        } | null;
        position: {
            title: string;
            department: string;
        } | null;
        applicationDate: string;
    } | null;
    matchCriteria: {
        matchedByEmployeeId: boolean;
        matchedByEmail: boolean;
        matchedByPhone: boolean;
    };
}

export function HiringDetailTab({ userId }: HiringDetailTabProps) {
    const [data, setData] = useState<HiringDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/users/${userId}/hiring-details`);
                if (!response.ok) {
                    throw new Error('Failed to fetch hiring details');
                }
                const result = await response.json();
                setData(result);
            } catch (err) {
                console.error(err);
                setError('Failed to load hiring information');
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchData();
        }
    }, [userId]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-64 flex-col items-center justify-center text-center p-4">
                <XCircle className="h-10 w-10 text-red-500 mb-2" />
                <p className="text-muted-foreground">{error}</p>
            </div>
        );
    }

    const hasData = data?.headcount || data?.candidate;

    if (!hasData) {
        return (
            <div className="flex flex-col items-center justify-center h-64 p-6 text-center border-2 border-dashed rounded-lg bg-muted/20">
                <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <h3 className="text-lg font-medium">No Hiring Record Found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    We couldn't link this user to any active Candidate or Headcount records based on their Employee ID, Email, or Phone number.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Match Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                    <span className="font-semibold">Linked Records Found:</span>
                    <div className="flex flex-wrap gap-x-3 mt-1 text-xs opacity-90">
                        {data?.matchCriteria.matchedByEmployeeId && <span>• Matched by Employee ID</span>}
                        {data?.matchCriteria.matchedByEmail && <span>• Matched by Email</span>}
                        {data?.matchCriteria.matchedByPhone && <span>• Matched by Phone</span>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Headcount Section */}
                {data?.headcount && (
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-primary" />
                                    Headcount Assignment
                                </CardTitle>
                                <Badge variant="outline">{data.headcount.status}</Badge>
                            </div>
                            <CardDescription>
                                Linked via Employee ID: <span className="font-mono text-foreground">{data.headcount.employeeId}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-muted-foreground text-xs mb-1">Position</div>
                                    <div className="font-medium">{data.headcount.position.title}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-xs mb-1">Department</div>
                                    <div>{data.headcount.position.department}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-xs mb-1">Type</div>
                                    <div className="capitalize">{data.headcount.type}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Candidate Section */}
                {data?.candidate && (
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" />
                                    Candidate Profile
                                </CardTitle>
                                {data.candidate.recruitmentStage && (
                                    <Badge
                                        className="capitalize"
                                        style={{
                                            backgroundColor: data.candidate.recruitmentStage.color_badge || undefined
                                        }}
                                    >
                                        {data.candidate.recruitmentStage.name}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="font-semibold text-lg">{data.candidate.name}</h4>
                                    <div className="flex flex-col gap-1 mt-1 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-3 w-3" />
                                            {data.candidate.email}
                                        </div>
                                        {data.candidate.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3 w-3" />
                                                {data.candidate.phone}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-muted-foreground text-xs mb-1">Applied For</div>
                                    <div className="font-medium">
                                        {data.candidate.position ? data.candidate.position.title : 'General Application'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-xs mb-1">Application Date</div>
                                    <div>{format(new Date(data.candidate.applicationDate), 'MMM dd, yyyy')}</div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button asChild variant="default" className="w-full sm:w-auto">
                                    <Link
                                        href={data.candidate.positionId
                                            ? `/positions/${data.candidate.positionId}?candidateId=${data.candidate.id}`
                                            : `/candidates?candidateId=${data.candidate.id}` // Fallback if no position
                                        }
                                        target="_blank"
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        View Full Candidate Profile
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
