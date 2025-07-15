
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
  return (
    <Button
      onClick={() => signIn("azure-ad", { callbackUrl: "/" })} // Redirect to dashboard after sign-in
      variant="secondary"
      className="w-full"
      size="lg"
    >
      <MicrosoftLogo />
      Sign in with Microsoft
    </Button>
  );
}

