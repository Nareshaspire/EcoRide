import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Car } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import EcoAssistant from './components/EcoAssistant';
import Navbar from './components/Navbar';
import { auth, db } from './firebase';
import Landing from './pages/Landing';
import MyRides from './pages/MyRides';
import PostRide from './pages/PostRide';
import Profile from './pages/Profile';
import RideDetails from './pages/RideDetails';
import RideSearch from './pages/RideSearch';
import { UserProfile } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }

      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (!userDoc.exists()) {
          const newProfile: UserProfile = {
            uid: u.uid,
            displayName: u.displayName || 'Anonymous',
            email: u.email || '',
            photoURL: u.photoURL || '',
            role: 'rider',
            isVerified: false,
            rating: 5.0,
            totalRides: 0,
            carbonSaved: 0,
            points: 0,
            badges: [],
            sosContacts: [],
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', u.uid), newProfile);
        }
        unsubProfile = onSnapshot(doc(db, 'users', u.uid), (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-emerald-600"
        >
          <Car className="w-16 h-16" />
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
        <Navbar user={user} profile={profile} />
        
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/rides" element={user ? <RideSearch user={user} /> : <Navigate to="/" />} />
            <Route path="/ride/:rideId" element={user ? <RideDetails user={user} profile={profile} /> : <Navigate to="/" />} />
            <Route path="/post-ride" element={user ? <PostRide user={user} profile={profile} /> : <Navigate to="/" />} />
            <Route path="/my-rides" element={user ? <MyRides user={user} /> : <Navigate to="/" />} />
            <Route path="/profile" element={user ? <Profile user={user} profile={profile} /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <footer className="bg-white border-t border-gray-100 py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xl">
                <Car className="w-6 h-6" />
                <span>EcoRide</span>
              </div>
              <div className="flex gap-8 text-sm font-medium text-gray-500">
                <a href="#" className="hover:text-emerald-600 transition-colors">Safety Center</a>
                <a href="#" className="hover:text-emerald-600 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-emerald-600 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-emerald-600 transition-colors">Contact Us</a>
              </div>
              <p className="text-sm text-gray-400">© 2026 EcoRide. All rights reserved.</p>
            </div>
          </div>
        </footer>

        <EcoAssistant />
      </div>
    </Router>
  );
}
