"use server"

import { signIn } from "@/auth";
import { AuthError, CredentialsSignin } from "next-auth";

/**
 * Server Action to handle credentials sign-in.
 * This allows us to catch specific error codes (like 2FA required)
 * and pass them back to the client without them being wrapped in CallbackRouteError
 * by the Next-Auth API handler.
 */
export async function signInWithCredentials(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const twoFactorCode = formData.get('twoFactorCode') as string;
    const redirectTo = formData.get('redirectTo') as string || '/';

    try {
        // We call signIn from the server-side auth configuration
        // This will handle the credentials check and session creation
        await signIn("credentials", {
            email,
            password,
            twoFactorCode,
            redirectTo,
            // NOTE: redirect: true is default for server-side signIn
        });

        // If successful, execution will stop here and a redirect will be thrown
    } catch (error) {
        // IMPORTANT: If it's a redirect error (success), we MUST re-throw it!
        if ((error as any).digest?.startsWith('NEXT_REDIRECT')) {
            throw error;
        }

        console.log('[AUTH ACTION] Sign in error:', error);

        // helper to check string for 2FA pattern
        const isTwoFactorError = (str: string | undefined | null) => {
            return str && typeof str === 'string' && str.includes('TWO_FACTOR_REQUIRED');
        };

        // Check if error is instance of AuthError
        if (error instanceof AuthError) {
            const cause = (error as any).cause;
            const message = error.message; // AuthError message usually contains the code or message

            // Check code property (from our custom error)
            const code = (error as any).code;

            // Check all possible locations for the 2FA signal
            if (isTwoFactorError(code) || isTwoFactorError(message) || isTwoFactorError(cause?.err?.message) || isTwoFactorError(cause?.message)) {

                // Try to find the specific string to extract method
                const stringsToCheck = [code, message, cause?.message, cause?.err?.message].filter(s => typeof s === 'string');

                for (const str of stringsToCheck) {
                    const match = str.match(/TWO_FACTOR_REQUIRED:(totp|email)/);
                    if (match) {
                        return { error: match[0] };
                    }
                }
                // Fallback if we detected the signal but couldn't parse the method
                return { error: "TWO_FACTOR_REQUIRED:totp" };
            }

            // Handle other specific errors
            if (error instanceof CredentialsSignin) {
                return { error: error.code || "CredentialsSignin" };
            }

            return { error: error.type || "CredentialsSignin" };
        }

        // Generic error handling
        const errString = String(error);
        if (isTwoFactorError(errString)) {
            const match = errString.match(/TWO_FACTOR_REQUIRED:(totp|email)/);
            return { error: match ? match[0] : "TWO_FACTOR_REQUIRED:totp" };
        }

        // For any other unexpected errors, log and return generic message
        console.error("[AUTH ACTION] Unexpected error:", error);
        return { error: "An unexpected error occurred. Please try again." };
    }
}
