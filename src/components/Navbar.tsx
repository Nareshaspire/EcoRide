import { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { Car, Leaf, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout, signInWithGoogle } from '../firebase';
import { UserProfile } from '../types';
import NotificationBell from './NotificationBell';

const Navbar = ({ user, profile }: { user: User | null, profile: UserProfile | null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-emerald-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-emerald-600 font-bold text-xl">
              <div className="bg-emerald-100 p-1.5 rounded-lg">
                <Car className="w-6 h-6" />
              </div>
              <span>EcoRide</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Link to="/rides" className="text-gray-600 hover:text-emerald-600 font-medium transition-colors">Find Rides</Link>
                <Link to="/post-ride" className="text-gray-600 hover:text-emerald-600 font-medium transition-colors">Offer Ride</Link>
                <Link to="/my-rides" className="text-gray-600 hover:text-emerald-600 font-medium transition-colors">My Rides</Link>
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                  <Link to="/profile" className="flex items-center gap-2 group">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">{profile?.displayName}</p>
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <Leaf className="w-3 h-3" /> {profile?.carbonSaved.toFixed(1)}kg saved
                      </p>
                    </div>
                    <img 
                      src={profile?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.uid} 
                      alt="Profile" 
                      className="w-9 h-9 rounded-full border-2 border-emerald-100 group-hover:border-emerald-300 transition-all"
                    />
                  </Link>
                  <NotificationBell user={user} />
                  <button 
                    onClick={async () => { await logout(); navigate('/'); }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="bg-emerald-600 text-white px-5 py-2 rounded-full font-semibold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Get Started
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-500 p-2">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-emerald-50 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {user ? (
                <>
                  <Link to="/rides" onClick={() => setIsOpen(false)} className="block px-3 py-3 rounded-lg text-gray-700 hover:bg-emerald-50 font-medium">Find Rides</Link>
                  <Link to="/post-ride" onClick={() => setIsOpen(false)} className="block px-3 py-3 rounded-lg text-gray-700 hover:bg-emerald-50 font-medium">Offer Ride</Link>
                  <Link to="/my-rides" onClick={() => setIsOpen(false)} className="block px-3 py-3 rounded-lg text-gray-700 hover:bg-emerald-50 font-medium">My Rides</Link>
                  <Link to="/profile" onClick={() => setIsOpen(false)} className="block px-3 py-3 rounded-lg text-gray-700 hover:bg-emerald-50 font-medium">Profile</Link>
                  <button 
                    onClick={async () => { await logout(); setIsOpen(false); navigate('/'); }}
                    className="w-full text-left px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"
                  >
                    <LogOut className="w-5 h-5" /> Logout
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => { signInWithGoogle(); setIsOpen(false); }}
                  className="w-full bg-emerald-600 text-white px-5 py-3 rounded-xl font-semibold mt-2"
                >
                  Sign In with Google
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
