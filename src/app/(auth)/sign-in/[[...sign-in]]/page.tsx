"use client";
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  // We are grabbing the key to see if it exists
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <div >
      
      
      <SignIn />
    </div>
  );
}