'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import HumanBuddySession from '@/components/HumanBuddySession';
import { Loader2 } from 'lucide-react';

/**
 * Direct Invite Link Page for Human Buddy Mode
 * Users access via: /interview/buddy/[inviteCode]
 * Automatically joins session without needing to enter code
 */
export default function BuddyInvitePage() {
  const params = useParams();
  const router = useRouter();
  
  const inviteCode = params.inviteCode;
  
  const [isLoading, setIsLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const joinSessionViaInvite = async () => {
      try {
        // First check if user is authenticated
        const userResponse = await fetch('/api/auth/current-user');
        
        if (!userResponse.ok) {
          // User not logged in, redirect to login
          toast.error('Please log in first');
          router.push('/auth/login');
          return;
        }

        const userData = await userResponse.json();
        
        if (!userData?.id) {
          toast.error('Authentication failed');
          router.push('/auth/login');
          return;
        }

        setUserId(userData.id);
        setUsername(userData.displayName || `User_${userData.id?.slice(0, 8)}`);

        if (!inviteCode) {
          setError('Invalid invite code');
          setIsLoading(false);
          return;
        }

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`🔗 [BuddyInvite] Joining via invite link`);
        console.log(`${'═'.repeat(60)}`);
        console.log(`📍 UserId: ${userData.id}`);
        console.log(`🔑 InviteCode: ${inviteCode}`);
        
        // Call API to join session via invite code
        const response = await fetch('/api/interview-buddy/join-by-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userData.id,
            inviteCode: inviteCode,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`❌ Join failed:`, error);
          throw new Error(error.error || 'Failed to join session');
        }

        const data = await response.json();
        console.log(`✅ Successfully joined session:`, {
          sessionId: data.sessionId,
          sessionCode: data.sessionCode,
          isCreator: data.isCreator,
        });
        
        setSessionData({
          sessionId: data.sessionId,
          sessionCode: data.sessionCode,
          isCreator: data.isCreator,
        });
        
        setIsOwner(data.isCreator);
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Error joining session:', err);
        setError(err.message || 'Failed to join session');
        toast.error(err.message || 'Failed to join session');
        setIsLoading(false);
      }
    };

    joinSessionViaInvite();
  }, [inviteCode, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white text-lg">Joining buddy session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Session component
  if (sessionData && userId && username) {
    return (
      <HumanBuddySession
        sessionId={sessionData.sessionId}
        sessionCode={sessionData.sessionCode}
        userId={userId}
        username={username}
        isOwner={isOwner}
        onSessionEnd={() => {
          router.push('/');
        }}
        onClose={() => {
          router.push('/');
        }}
      />
    );
  }

  return null;
}
