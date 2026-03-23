'use client';

import { useEffect, useState } from 'react';
import { getUserStats } from '@/lib/dsa-auth';
import { auth, db } from '@/firebase/client';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trophy, TrendingUp, Flame, Target, Award, Calendar } from 'lucide-react';

function DSAStatsDashboard({ userId }) {
  const [userStats, setUserStats] = useState(null);
  const [globalRank, setGlobalRank] = useState(null);
  const [recentRooms, setRecentRooms] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all'); // all, week, month

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        // Get user stats
        const stats = await getUserStats(userId);
        setUserStats(stats);

        // Get global ranking
        const usersRef = collection(db, 'user_stats');
        const allStatsQuery = query(
          usersRef,
          orderBy('total_wins', 'desc'),
          limit(1000)
        );
        const snapshot = await getDocs(allStatsQuery);

        let rank = 1;
        snapshot.forEach((doc, index) => {
          if (doc.id === userId) {
            rank = index + 1;
          }
        });
        setGlobalRank(rank);

        // Get recent rooms
        const roomsRef = collection(db, 'rooms');
        const recentQuery = query(
          roomsRef,
          where('participants', 'array-contains', userId),
          orderBy('created_at', 'desc'),
          limit(5)
        );
        const roomsSnapshot = await getDocs(recentQuery);
        setRecentRooms(roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Get achievements
        const achievementsRef = collection(db, 'achievements');
        const achieveQuery = query(achievementsRef, where('userId', '==', userId));
        const achieveSnapshot = await getDocs(achieveQuery);
        setAchievements(achieveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return <div className="text-slate-400 text-center py-12">Loading statistics...</div>;
  }

  if (!userStats) {
    return <div className="text-slate-400 text-center py-12">No statistics available</div>;
  }

  // Calculate win rate
  const winRate = userStats.total_rooms > 0 
    ? Math.round((userStats.total_wins / userStats.total_rooms) * 100)
    : 0;

  // Prepare chart data for solve progress
  const solveData = [
    { category: 'Solved', count: userStats.total_solved },
    { category: 'Attempted', count: userStats.total_rooms - userStats.total_solved },
  ];

  const COLORS = ['#10b981', '#8b5cf6'];

  // Difficulty breakdown (mock data)
  const difficultyData = [
    { name: 'Easy', value: Math.max(0, Math.round(userStats.total_solved * 0.4)) },
    { name: 'Medium', value: Math.max(0, Math.round(userStats.total_solved * 0.4)) },
    { name: 'Hard', value: Math.max(0, Math.round(userStats.total_solved * 0.2)) },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-700 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Statistics & Rankings</h1>
        <p className="text-slate-400">Track your progress and achievements</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Global Rank */}
        <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Global Rank</p>
              <p className="text-3xl font-bold text-yellow-400">#{globalRank || '—'}</p>
            </div>
            <Trophy className="text-yellow-500" size={32} />
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Win Rate</p>
              <p className="text-3xl font-bold text-emerald-400">{winRate}%</p>
              <p className="text-xs text-slate-500 mt-1">{userStats.total_wins}/{userStats.total_rooms}</p>
            </div>
            <TrendingUp className="text-emerald-500" size={32} />
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Current Streak</p>
              <p className="text-3xl font-bold text-red-400">{userStats.current_streak}</p>
              <p className="text-xs text-slate-500 mt-1">Best: {userStats.best_streak}</p>
            </div>
            <Flame className="text-red-500" size={32} />
          </div>
        </div>

        {/* First Bloods */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">First Bloods</p>
              <p className="text-3xl font-bold text-indigo-400">{userStats.first_bloods}</p>
              <p className="text-xs text-slate-500 mt-1">Lightning fast!</p>
            </div>
            <Award className="text-indigo-500" size={32} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solve Progress */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target size={20} />
            Problems Solved
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={solveData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, count }) => `${name}: ${count}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {solveData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Difficulty Breakdown */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Difficulty Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={difficultyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Rooms */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Recent Competitions
        </h3>
        {recentRooms.length === 0 ? (
          <p className="text-slate-400 py-8 text-center">No recent competitions</p>
        ) : (
          <div className="space-y-2">
            {recentRooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition"
              >
                <div>
                  <p className="font-semibold text-white text-sm">Room {room.id?.slice(0, 8)}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(room.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded text-xs font-mono">
                  {room.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Award size={20} />
          Achievements ({achievements.length})
        </h3>
        {achievements.length === 0 ? (
          <p className="text-slate-400 py-8 text-center">Keep competing to unlock achievements!</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="flex flex-col items-center justify-center p-4 bg-slate-800 rounded-lg border border-slate-700"
              >
                <span className="text-3xl mb-2">🏆</span>
                <p className="text-sm font-semibold text-white text-center">{achievement.badge_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DSAStatsDashboard;
