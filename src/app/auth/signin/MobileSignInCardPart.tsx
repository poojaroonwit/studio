import { AlertTriangle } from "lucide-react";

import { OutbornAccountSignInButton } from "@/components/auth/OutbornAccountSignInButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { sanitizeHtml } from "@/lib/utils";

export interface MobileSignInCardProps {
    errorMessage: string;
    loginPageContent: string;
    loginPageFooter: string;
    organizationName?: string;
}

export function MobileSignInCard({
    errorMessage,
    loginPageContent,
    loginPageFooter,
    organizationName,
}: MobileSignInCardProps) {
    return (
        <Card className="flex-1 border-0 shadow-[0_-12px_40px_rgba(0,0,0,0.15)] mt-[-40px] rounded-t-[44px] z-20 relative overflow-hidden bg-card">
            <CardContent className="h-full p-8 overflow-y-auto">
                <div className="w-full max-w-md mx-auto space-y-6">
                    <MobileSignInIntro loginPageContent={loginPageContent} />
                    <MobileSignInError errorMessage={errorMessage} />
                    <OutbornAccountSignInButton />
                    <MobileSignInFooter
                        loginPageFooter={loginPageFooter}
                        organizationName={organizationName}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function MobileSignInIntro({ loginPageContent }: { loginPageContent: string }) {
    return (
        <>
            <div className="space-y-1 mb-2">
                <h2 className="text-2xl font-black tracking-tight text-foreground uppercase leading-none">
                    Sign <span className="text-primary">In</span>
                </h2>
                <p className="text-xs text-muted-foreground font-medium">Continue securely with your Outborn Account.</p>
            </div>

            {loginPageContent && (
                <div className="mb-2 text-sm text-foreground/70" dangerouslySetInnerHTML={{ __html: sanitizeHtml(loginPageContent) }} />
            )}
        </>
    );
}

function MobileSignInError({ errorMessage }: { errorMessage: string }) {
    if (!errorMessage) {
        return null;
    }

    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
    );
}

function MobileSignInFooter({
    loginPageFooter,
    organizationName,
}: Pick<MobileSignInCardProps, 'loginPageFooter' | 'organizationName'>) {
    if (!loginPageFooter && !organizationName) {
        return null;
    }

    return (
        <div className="mt-8 text-center pt-8 space-y-1">
            {loginPageFooter && <p className="text-xs text-muted-foreground">{loginPageFooter}</p>}
            {organizationName && (
                <p className="text-[10px] text-muted-foreground/60">
                    &copy; {new Date().getFullYear()} {organizationName}. All rights reserved.
                </p>
            )}
        </div>
    );
}
