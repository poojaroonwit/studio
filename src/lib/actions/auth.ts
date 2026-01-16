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
        if (error instanceof AuthError) {
            const cause = (error as any).cause;
            const message = cause?.message || error.message;

            console.log(`[AUTH ACTION] Caught AuthError: ${error.type}, Message: ${message}`);

            // Check for 2FA requirement
            if (message && message.includes('TWO_FACTOR_REQUIRED:')) {
                // Extract the full message (e.g., TWO_FACTOR_REQUIRED:totp)
                const match = message.match(/TWO_FACTOR_REQUIRED:(totp|email)/);
                return { error: match ? match[0] : message };
            }

            // Check for other specific error codes we might have set
            if (error instanceof CredentialsSignin && error.code) {
                return { error: error.code };
            }

            // Fallback to error message or type
            return { error: message || error.type || "CredentialsSignin" };
        }

        // IMPORTANT: If it's a redirect error (success), we MUST re-throw it!
        // Next.js uses this to perform the actual redirection.
        if ((error as any).digest?.startsWith('NEXT_REDIRECT')) {
            throw error;
        }

        // For any other unexpected errors, log and return generic message
        console.error("[AUTH ACTION] Unexpected error:", error);
        return { error: "An unexpected error occurred. Please try again." };
    }
}
