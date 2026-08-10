
"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react"; // Or a specific Azure/Microsoft icon if you add one

// Microsoft logo SVG component
const MicrosoftLogo = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
    <path d="M9.5 2H2V9.5H9.5V2Z" fill="#F25022"/>
    <path d="M18 2H10.5V9.5H18V2Z" fill="#7FBA00"/>
    <path d="M9.5 10.5H2V18H9.5V10.5Z" fill="#00A4EF"/>
    <path d="M18 10.5H10.5V18H18V10.5Z" fill="#FFB900"/>
  </svg>
);


export function AzureAdSignInButton() {
  const handleSignIn = async () => {
    try {

      const result = await signIn("azure-ad", { 
        callbackUrl: "/",
        redirect: false // Don't redirect immediately to catch errors
      });


      
      if (result?.error) {
        console.error('[AZURE AD BUTTON] Sign-in error:', result.error);
        // Show error to user
        alert(`Sign-in failed: ${result.error}`);
      } else if (result?.ok) {

        // Use window.location.href for more reliable redirect
        window.location.href = result.url || "/";
      } else {

        // The sign-in process is still ongoing, let NextAuth handle the redirect
      }
    } catch (error) {
      console.error('[AZURE AD BUTTON] Unexpected error during sign-in:', error);
      alert('An unexpected error occurred during sign-in. Please try again.');
    }
  };

  return (
    <Button
      onClick={handleSignIn}
      variant="secondary"
      className="w-full h-10 text-sm rounded-xl font-medium shadow-sm border border-border/20 transition-all hover:bg-secondary/80 active:scale-[0.98]"
    >
      <MicrosoftLogo />
      Sign in with Microsoft
    </Button>
  );
}

