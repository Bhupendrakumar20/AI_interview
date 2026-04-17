'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DSARoomPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Interview Buddy where DSA mode is now consolidated
    router.replace('/interview/buddy');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">⏳</div>
        <h1 className="text-2xl font-bold text-white mb-2">Redirecting...</h1>
        <p className="text-slate-400">Taking you to Interview Buddy with DSA mode...</p>
      </div>
    </div>
  );
}

            <div className="mt-8 space-y-3 text-sm text-slate-400">
              <p>✅ Create rooms and invite friends</p>
              <p>✅ Vote on game settings (question mode, time limit)</p>
              <p>✅ Real-time code execution with Judge0</p>
              <p>✅ Live leaderboard with first blood bonuses</p>
              <p>✅ Post-match code review dashboard</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
