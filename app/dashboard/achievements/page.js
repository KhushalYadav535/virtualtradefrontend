"use client";

import { useEffect, useState } from 'react';
import { Award, Lock, Star, TrendingUp, PieChart, Activity, Loader2 } from 'lucide-react';
import { achievements as achievementsApi } from '../../../lib/api';

const iconMap = {
  rocket: <Activity className="w-8 h-8" />,
  'trending-up': <TrendingUp className="w-8 h-8" />,
  layers: <Award className="w-8 h-8" />,
  'pie-chart': <PieChart className="w-8 h-8" />,
  diamond: <Star className="w-8 h-8" />
};

export default function GamificationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    achievementsApi.get()
      .then((res) => {
         const d = res.data;
         d.dailyChallenges = d.dailyChallenges || [
            { id: 'd1', title: 'First Trade of the Day', reward: 50, progress: 1, target: 1, completed: true },
            { id: 'd2', title: 'Trade 5 Lots in Options', reward: 100, progress: 2, target: 5, completed: false }
         ];
         d.weeklyChallenges = d.weeklyChallenges || [
            { id: 'w1', title: 'Maintain 5-Day Streak', reward: 500, progress: 3, target: 5, completed: false },
            { id: 'w2', title: 'Earn ₹10,000 Virtual Profit', reward: 1000, progress: 4500, target: 10000, completed: false }
         ];
         setData(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-groww-primary" />
      </div>
    );
  }

  const { achievements = [], stats = {}, dailyChallenges = [], weeklyChallenges = [] } = data || {};

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">Trader Achievements</h1>

      {/* Hero Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-indigo-100 font-medium">Current Level</p>
            <h2 className="text-5xl font-extrabold">{stats.level || 1}</h2>
          </div>
          <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm">
            <p className="text-indigo-100 text-sm">Total Points</p>
            <p className="text-2xl font-bold">{stats.totalPoints || 0}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-indigo-100">
            <span>Progress to Level {(stats.level || 1) + 1}</span>
            <span>{stats.totalPoints || 0} / {stats.nextLevelPoints || 100} XP</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-white h-full rounded-full transition-all duration-1000" 
              style={{ width: `${stats.progressToNextLevel || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Challenges & Referrals */}
      <div className="grid md:grid-cols-2 gap-6">
         <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Daily Challenges</h2>
            <div className="space-y-3">
               {dailyChallenges.map(c => (
                  <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
                     <div className="flex-1 mr-4">
                        <p className="font-semibold text-gray-800 text-sm mb-2">{c.title}</p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                           <div className={`h-full rounded-full ${c.completed ? 'bg-green-500' : 'bg-groww-primary'}`} style={{ width: `${Math.min(100, (c.progress/c.target)*100)}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{c.progress} / {c.target}</p>
                     </div>
                     <span className="bg-green-50 text-green-700 font-bold text-xs px-2 py-1 rounded-md">+{c.reward} PTS</span>
                  </div>
               ))}
            </div>
            
            <h2 className="text-lg font-bold text-gray-800 mt-6 mb-4">Weekly Challenges</h2>
            <div className="space-y-3">
               {weeklyChallenges.map(c => (
                  <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between">
                     <div className="flex-1 mr-4">
                        <p className="font-semibold text-gray-800 text-sm mb-2">{c.title}</p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                           <div className={`h-full rounded-full ${c.completed ? 'bg-green-500' : 'bg-groww-primary'}`} style={{ width: `${Math.min(100, (c.progress/c.target)*100)}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{c.progress} / {c.target}</p>
                     </div>
                     <span className="bg-green-50 text-green-700 font-bold text-xs px-2 py-1 rounded-md">+{c.reward} PTS</span>
                  </div>
               ))}
            </div>
         </div>
         <div>
            <div className="bg-groww-primary-light border border-groww-primary-muted rounded-2xl p-6 shadow-sm">
               <div className="w-12 h-12 bg-groww-primary text-white rounded-full flex items-center justify-center mb-4">
                  <Star className="w-6 h-6" />
               </div>
               <h2 className="text-xl font-bold text-groww-ink mb-2">Refer a Friend</h2>
               <p className="text-gray-600 mb-6">Invite friends to paper trade on VirtualTrade and earn <span className="font-bold text-groww-primary">500 bonus points</span> for each successful referral!</p>
               <button className="w-full bg-groww-primary text-white font-bold py-3 rounded-xl hover:bg-groww-primary-dark transition">
                  Invite Now
               </button>
            </div>
         </div>
      </div>

      {/* Badges Grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4">Badges & Rewards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((item) => {
            const isUnlocked = item.is_unlocked;
            const hasProgress = item.progress !== undefined && item.max_progress !== undefined;
            return (
              <div 
                key={item.id} 
                className={`relative bg-white rounded-xl p-6 border-2 transition-all ${
                  isUnlocked ? 'border-indigo-100 hover:shadow-md' : 'border-gray-100 opacity-75'
                }`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  isUnlocked ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'
                }`}>
                  {iconMap[item.icon] || <Award className="w-8 h-8" />}
                </div>
                
                <h3 className={`font-bold mb-1 ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{item.description}</p>
                
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${
                  isUnlocked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  +{item.points} PTS
                </div>

                {hasProgress && !isUnlocked && (
                   <div className="mb-2">
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-1">
                         <div className="bg-groww-primary h-full rounded-full" style={{ width: `${Math.min(100, (item.progress/item.max_progress)*100)}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-400 text-center">{item.progress} / {item.max_progress}</p>
                   </div>
                )}

                {isUnlocked && item.unlocked_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    Unlocked {new Date(item.unlocked_at).toLocaleDateString('en-IN')}
                  </p>
                )}

                {!isUnlocked && !hasProgress && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl">
                    <Lock className="w-6 h-6 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-500">Locked</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
