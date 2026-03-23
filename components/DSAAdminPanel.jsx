'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase/client';
import { collection, query, orderBy, getDocs, updateDoc, deleteDoc, doc, addDoc } from 'firebase/firestore';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Trash2, Edit, Plus, Settings, Users, BookOpen, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react';

function DSAAdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [questions, setQuestions] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch all questions
      const questionsRef = collection(db, 'dsa_questions');
      const questionsSnap = await getDocs(query(questionsRef, orderBy('created_at', 'desc')));
      setQuestions(questionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch all rooms
      const roomsRef = collection(db, 'rooms');
      const roomsSnap = await getDocs(query(roomsRef, orderBy('created_at', 'desc')));
      setRooms(roomsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch all users
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Calculate stats
      const totalRooms = roomsSnap.size;
      const activeRooms = roomsSnap.docs.filter(d => d.data().status === 'active').length;
      const totalQuestions = questionsSnap.size;
      const totalUsers = usersSnap.size;

      setStats({ totalRooms, activeRooms, totalQuestions, totalUsers });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setLoading(false);
    }
  };

  // Delete question
  const deleteQuestion = async (questionId) => {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'dsa_questions', questionId));
      setQuestions(questions.filter(q => q.id !== questionId));
      alert('Question deleted successfully');
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question');
    }
  };

  // Deactivate room
  const deactivateRoom = async (roomId) => {
    try {
      await updateDoc(doc(db, 'rooms', roomId), { status: 'closed' });
      await fetchAdminData();
      alert('Room deactivated');
    } catch (error) {
      console.error('Error deactivating room:', error);
    }
  };

  // Add new question
  const addNewQuestion = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      await addDoc(collection(db, 'dsa_questions'), {
        title: formData.get('title'),
        description: formData.get('description'),
        difficulty: formData.get('difficulty'),
        category: formData.get('category'),
        examples: [],
        test_cases: [],
        hidden_test_cases: [],
        time_limit_mins: parseInt(formData.get('time_limit')),
        created_at: new Date(),
        is_active: true,
      });
      setShowAddQuestion(false);
      await fetchAdminData();
      alert('Question added successfully');
    } catch (error) {
      console.error('Error adding question:', error);
      alert('Failed to add question');
    }
  };

  if (loading) {
    return <div className="text-slate-400 text-center py-12">Loading admin panel...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="text-indigo-500" />
            DSA Room Admin Panel
          </h1>
          <p className="text-slate-400 mt-1">Manage questions, rooms, and users</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm">Total Rooms</p>
            <p className="text-3xl font-bold text-white mt-2">{stats.totalRooms}</p>
            <p className="text-xs text-emerald-400 mt-1">{stats.activeRooms} active</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm">Total Questions</p>
            <p className="text-3xl font-bold text-white mt-2">{stats.totalQuestions}</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm">Total Users</p>
            <p className="text-3xl font-bold text-white mt-2">{stats.totalUsers}</p>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm">Avg Room Size</p>
            <p className="text-3xl font-bold text-white mt-2">
              {stats.totalRooms > 0 ? (stats.totalUsers / stats.totalRooms).toFixed(1) : '0'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-700">
          {['overview', 'questions', 'rooms', 'users'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-semibold transition border-b-2 ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300 flex items-center gap-2">
                    <CheckCircle className="text-emerald-500" size={20} />
                    Socket Server
                  </span>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded text-sm">Running</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300 flex items-center gap-2">
                    <CheckCircle className="text-emerald-500" size={20} />
                    Database
                  </span>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded text-sm">Connected</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-300 flex items-center gap-2">
                    <Clock className="text-slate-400" size={20} />
                    Last Backup
                  </span>
                  <span className="text-slate-400 text-sm">2 hours ago</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/30 transition text-indigo-400 font-semibold flex items-center justify-center gap-2">
                  <Plus size={18} />
                  Add Question
                </button>
                <button className="p-3 bg-red-600/20 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition text-red-400 font-semibold flex items-center justify-center gap-2">
                  <AlertTriangle size={18} />
                  Manage Flagged
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QUESTIONS TAB */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">All Questions</h3>
              <button
                onClick={() => setShowAddQuestion(!showAddQuestion)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition"
              >
                <Plus size={18} />
                Add Question
              </button>
            </div>

            {showAddQuestion && (
              <form onSubmit={addNewQuestion} className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
                <input
                  type="text"
                  name="title"
                  placeholder="Question Title"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-500"
                />
                <textarea
                  name="description"
                  placeholder="Description"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-500 h-24"
                />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    name="difficulty"
                    className="bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white"
                    required
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <input
                    type="text"
                    name="category"
                    placeholder="Category"
                    className="bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-500"
                  />
                </div>
                <input
                  type="number"
                  name="time_limit"
                  placeholder="Time Limit (minutes)"
                  defaultValue="30"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-4 py-2 text-white"
                />
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition">
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddQuestion(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between p-4 bg-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 transition"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-white">{question.title}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded">
                        {question.difficulty}
                      </span>
                      <span className="text-xs px-2 py-1 bg-slate-800 text-slate-400 rounded">
                        {question.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-slate-800 rounded transition">
                      <Edit size={18} className="text-slate-400" />
                    </button>
                    <button
                      onClick={() => deleteQuestion(question.id)}
                      className="p-2 hover:bg-red-900 rounded transition"
                    >
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROOMS TAB */}
        {activeTab === 'rooms' && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white mb-4">Active Rooms</h3>
            {rooms.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No rooms</p>
            ) : (
              rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 bg-slate-900 border border-slate-700 rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-white">{room.id?.slice(0, 8)}</p>
                    <p className="text-sm text-slate-400">{room.status}</p>
                  </div>
                  <button
                    onClick={() => deactivateRoom(room.id)}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition"
                  >
                    Close
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white mb-4">Registered Users</h3>
            {users.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No users</p>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-slate-900 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-semibold text-white">{user.username}</p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-semibold ${
                    user.skillLevel === 'advanced'
                      ? 'bg-purple-500/20 text-purple-400'
                      : user.skillLevel === 'intermediate'
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {user.skillLevel}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DSAAdminPanel;
