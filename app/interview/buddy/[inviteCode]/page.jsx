'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
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
  const { user } = useAuth();
  
  const inviteCode = params.inviteCode;
  
  const [isLoading, setIsLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const joinSessionViaInvite = async () => {
      if (!user?.uid) {
        toast.error('Please log in first');
        router.push('/auth/login');
        return;
      }

      if (!inviteCode) {
        setError('Invalid invite code');
        return;
      }

      try {
        console.log(`🔗 [BuddyInvite] Joining session with invite code: ${inviteCode}`);
        
        // Call API to join session via invite code
        const response = await fetch('/api/interview-buddy/join-by-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            inviteCode: inviteCode,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to join session');
        }

        const data = await response.json();
        console.log(`✅ [BuddyInvite] Session data received:`, data);
        
        setSessionData({
          sessionId: data.sessionId,
          sessionCode: data.sessionCode,
          isCreator: data.isCreator,
        });
        
        setIsOwner(data.isCreator);
      } catch (err) {
        console.error('Error joining session:', err);
        setError(err.message || 'Failed to join session');
        toast.error(err.message || 'Failed to join session');
      } finally {
        setIsLoading(false);
      }
    };

    joinSessionViaInvite();
  }, [user, inviteCode, router]);

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
  if (sessionData) {
    return (
      <HumanBuddySession
        sessionId={sessionData.sessionId}
        sessionCode={sessionData.sessionCode}
        userId={user.uid}
        username={user.displayName || `User_${user.uid?.slice(0, 8)}`}
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
