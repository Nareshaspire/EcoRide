import { User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { CheckCircle2, Leaf, ShieldAlert, Star } from 'lucide-react';
import { useState } from 'react';
import Leaderboard from '../components/Leaderboard';
import RecurringTrips from '../components/RecurringTrips';
import SOSManager from '../components/SOSManager';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

const Profile = ({ user, profile }: { user: User, profile: UserProfile | null }) => {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(profile?.role || 'rider');

  const handleVerify = async () => {
    if (!profile) return;
    await updateDoc(doc(db, 'users', user.uid), { isVerified: true });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
            <div className="relative inline-block mb-4">
              <img 
                src={profile?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.uid} 
                alt="Profile" 
                className="w-32 h-32 rounded-full border-4 border-emerald-50 mx-auto"
              />
              {profile?.isVerified && (
                <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{profile?.displayName}</h3>
            <p className="text-gray-500 mb-6">{profile?.email}</p>
            
            {!profile?.isVerified && (
              <button 
                onClick={handleVerify}
                className="w-full bg-emerald-100 text-emerald-700 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-200 transition-all"
              >
                Verify Account
              </button>
            )}
          </div>

          <div className="bg-emerald-600 p-8 rounded-3xl shadow-lg text-white">
            <div className="flex items-center gap-3 mb-4">
              <Leaf className="w-6 h-6" />
              <h4 className="font-bold text-lg">Eco Impact</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-4xl font-black">{profile?.carbonSaved.toFixed(1)}</p>
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">kg CO₂ saved</p>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-black">{profile?.points}</p>
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-wider">Eco Points</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-emerald-500/30">
              <div className="flex justify-between text-sm">
                <span>Total Rides</span>
                <span className="font-bold">{profile?.totalRides}</span>
              </div>
            </div>
          </div>

          <Leaderboard />
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Achievements</h3>
            <div className="flex flex-wrap gap-3">
              {profile?.badges && profile.badges.length > 0 ? profile.badges.map(badge => (
                <div key={badge} className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl border border-amber-100">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-bold">{badge}</span>
                </div>
              )) : (
                <p className="text-gray-400 text-sm italic">No badges earned yet. Keep carpooling!</p>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <RecurringTrips user={user} />
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900">Account Settings</h3>
              <button 
                onClick={() => setEditing(!editing)}
                className="text-emerald-600 font-bold text-sm hover:underline"
              >
                {editing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Preferred Role</label>
                {editing ? (
                  <select 
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  >
                    <option value="rider">Rider</option>
                    <option value="driver">Driver</option>
                    <option value="both">Both</option>
                  </select>
                ) : (
                  <p className="text-lg font-bold text-gray-900 capitalize">{profile?.role}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Trust Score</label>
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={cn("w-5 h-5", i < (profile?.rating || 0) ? "fill-current" : "text-gray-200")} />
                    ))}
                  </div>
                  <span className="font-bold text-gray-900">{profile?.rating.toFixed(1)} / 5.0</span>
                </div>
              </div>

              {editing && (
                <button 
                  onClick={async () => {
                    await updateDoc(doc(db, 'users', user.uid), { role });
                    setEditing(false);
                  }}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all"
                >
                  Save Changes
                </button>
              )}
            </div>
          </div>

          <div className="bg-red-50 p-8 rounded-3xl border border-red-100">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 rounded-2xl text-red-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-bold text-red-900 mb-1">Emergency SOS</h4>
                <p className="text-red-700 text-sm mb-4">In case of any emergency during your ride, use the SOS feature to alert authorities and our safety team.</p>
                <SOSManager user={user} profile={profile} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
