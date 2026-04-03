import { clsx, type ClassValue } from 'clsx';
import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth, subMonths } from 'date-fns';
import { onAuthStateChanged, User } from 'firebase/auth';
import { addDoc, arrayUnion, collection, doc, getDoc, limit, onSnapshot, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Car,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  Sun,
  TrendingUp,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';
import { Link, Navigate, Route, BrowserRouter as Router, Routes, useNavigate, useParams } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { twMerge } from 'tailwind-merge';
import { auth, db, logout, signInWithGoogle } from './firebase';
import { Message, RecurringTrip, Ride, UserProfile } from './types';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Dark Mode ---
const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => {} });

function useTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ecoride-theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('ecoride-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('ecoride-theme', 'light');
    }
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to avoid crashing the app, but we log it for the agent to see
}

// --- Components ---

const Navbar = ({ user, profile }: { user: User | null, profile: UserProfile | null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-emerald-100 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-emerald-600 font-bold text-xl">
              <div className="bg-emerald-100 dark:bg-emerald-900 p-1.5 rounded-lg">
                <Car className="w-6 h-6" />
              </div>
              <span>EcoRide</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Link to="/rides" className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 font-medium transition-colors">Find Rides</Link>
                <Link to="/post-ride" className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 font-medium transition-colors">Offer Ride</Link>
                <Link to="/my-rides" className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 font-medium transition-colors">My Rides</Link>
                <Link to="/eco-reports" className="text-gray-600 dark:text-gray-300 hover:text-emerald-600 font-medium transition-colors">Eco Reports</Link>
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                  <Link to="/profile" className="flex items-center gap-2 group">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 transition-colors">{profile?.displayName}</p>
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
                  <button
                    onClick={toggle}
                    className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                    title="Toggle dark mode"
                  >
                    {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>
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
            className="md:hidden bg-white dark:bg-gray-900 border-t border-emerald-50 dark:border-gray-800 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {user ? (
                <>
                  <Link to="/rides" onClick={() => setIsOpen(false)} className="block px-3 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-800 font-medium">Find Rides</Link>
                  <Link to="/post-ride" onClick={() => setIsOpen(false)} className="block px-3 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-800 font-medium">Offer Ride</Link>
                  <Link to="/my-rides" onClick={() => setIsOpen(false)} className="block px-3 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-800 font-medium">My Rides</Link>
                  <Link to="/eco-reports" onClick={() => setIsOpen(false)} className="block px-3 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-800 font-medium">Eco Reports</Link>
                  <Link to="/profile" onClick={() => setIsOpen(false)} className="block px-3 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-800 font-medium">Profile</Link>
                  <button
                    onClick={() => { toggle(); }}
                    className="w-full text-left px-3 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-800 font-medium flex items-center gap-2"
                  >
                    {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />} {dark ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <button 
                    onClick={async () => { await logout(); setIsOpen(false); navigate('/'); }}
                    className="w-full text-left px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950 font-medium flex items-center gap-2"
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

const Hero = () => (
  <div className="relative overflow-hidden bg-emerald-50 dark:bg-gray-900 py-20 sm:py-32">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-10 pointer-events-none">
      <div className="absolute top-10 left-10 w-64 h-64 bg-emerald-400 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-300 rounded-full blur-3xl" />
    </div>
    
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold mb-6">
            <Leaf className="w-4 h-4" /> Eco-Friendly Commuting
          </span>
          <h1 className="text-5xl sm:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-8">
            Ride Together, <span className="text-emerald-600">Save the Planet.</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">
            Connect with verified commuters, split costs, and reduce your carbon footprint. 
            The smartest way to travel for you and the environment.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/rides" className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl hover:shadow-emerald-200 active:scale-95 flex items-center justify-center gap-2">
              Find a Ride <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/post-ride" className="w-full sm:w-auto bg-white text-emerald-600 border-2 border-emerald-100 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2">
              Offer a Ride <Plus className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  </div>
);

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-emerald-50 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
      <Icon className="w-7 h-7" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
  </div>
);

const Landing = () => (
  <div className="space-y-20 pb-20">
    <Hero />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard 
          icon={ShieldAlert}
          title="Verified Safety"
          description="Every driver and rider is verified through our multi-step trust system, including ID checks and community ratings."
        />
        <FeatureCard 
          icon={Leaf}
          title="Eco-Impact Tracking"
          description="See the real-time impact of your carpooling choices with our built-in carbon footprint calculator."
        />
        <FeatureCard 
          icon={DollarSign}
          title="Cost Splitting"
          description="Save up to 75% on your daily commute costs by splitting fuel and maintenance with fellow travelers."
        />
      </div>
    </div>
  </div>
);

const Leaderboard = () => {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('carbonSaved', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTopUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return unsubscribe;
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-emerald-50/50 dark:bg-emerald-950/30 flex items-center gap-3">
        <Star className="w-5 h-5 text-emerald-600 fill-current" />
        <h3 className="font-bold text-gray-900 dark:text-white">Eco Leaderboard</h3>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" /></div>
        ) : (
          <div className="space-y-4">
            {topUsers.map((u, i) => (
              <div key={u.uid} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                    i === 0 ? "bg-amber-100 text-amber-700" : 
                    i === 1 ? "bg-gray-200 text-gray-700" :
                    i === 2 ? "bg-orange-100 text-orange-700" : "text-gray-400"
                  )}>
                    {i + 1}
                  </span>
                  <img src={u.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.uid} className="w-8 h-8 rounded-full" alt="" />
                  <span className="font-bold text-sm text-gray-900">{u.displayName}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">{u.carbonSaved.toFixed(1)}kg</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Saved</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const RecurringTrips = ({ user }: { user: User }) => {
  const [trips, setTrips] = useState<RecurringTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTrip, setNewTrip] = useState({
    origin: '',
    destination: '',
    role: 'rider' as 'driver' | 'rider',
    days: [] as string[],
    time: '08:00'
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    const q = query(collection(db, 'recurringTrips'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecurringTrip)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recurringTrips');
    });
    return unsubscribe;
  }, [user.uid]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTrip.days.length === 0) return;
    await addDoc(collection(db, 'recurringTrips'), {
      ...newTrip,
      userId: user.uid,
      active: true
    });
    setShowAdd(false);
    setNewTrip({ origin: '', destination: '', role: 'rider', days: [], time: '08:00' });
  };

  const toggleDay = (day: string) => {
    setNewTrip(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring Commutes</h3>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline"
        >
          {showAdd ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Schedule</>}
        </button>
      </div>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAdd} 
          className="bg-emerald-50 dark:bg-emerald-950/50 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input 
              required
              placeholder="Origin"
              value={newTrip.origin}
              onChange={e => setNewTrip({...newTrip, origin: e.target.value})}
              className="px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input 
              required
              placeholder="Destination"
              value={newTrip.destination}
              onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
              className="px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                  newTrip.days.includes(day) ? "bg-emerald-600 text-white" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                )}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <input 
              type="time" 
              value={newTrip.time}
              onChange={e => setNewTrip({...newTrip, time: e.target.value})}
              className="px-4 py-2 rounded-xl border border-emerald-200 outline-none"
            />
            <select 
              value={newTrip.role}
              onChange={e => setNewTrip({...newTrip, role: e.target.value as any})}
              className="px-4 py-2 rounded-xl border border-emerald-200 outline-none"
            >
              <option value="rider">As Rider</option>
              <option value="driver">As Driver</option>
            </select>
            <button type="submit" className="ml-auto bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700">
              Save
            </button>
          </div>
        </motion.form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {trips.map(trip => (
          <div key={trip.id} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl",
                trip.role === 'driver' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
              )}>
                {trip.role === 'driver' ? <Car className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{trip.origin} → {trip.destination}</p>
                <p className="text-xs text-gray-500 font-medium">
                  {trip.days.map(d => d.slice(0, 3)).join(', ')} at {trip.time}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                trip.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
              )}>
                {trip.active ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RideCard = ({ ride }: { ride: Ride }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={cn(
      "bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all overflow-hidden group",
      ride.status === 'cancelled' && "opacity-60 grayscale"
    )}
  >
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg">
            {ride.driverName[0]}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white">{ride.driverName}</h4>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Verified Driver
            </div>
          </div>
        </div>
        <div className="text-right">
          {ride.status === 'cancelled' ? (
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-wider">Cancelled</span>
          ) : (
            <>
              <p className="text-2xl font-black text-emerald-600">${ride.pricePerSeat}</p>
              <p className="text-xs text-gray-400 font-medium">per seat</p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4 mb-6 relative">
        <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-emerald-100 dark:bg-emerald-800" />
        <div className="flex items-center gap-4 relative">
          <div className="w-5 h-5 bg-white dark:bg-gray-800 border-2 border-emerald-500 rounded-full z-10" />
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">From</p>
            <p className="font-bold text-gray-900 dark:text-white">{ride.origin}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 relative">
          <div className="w-5 h-5 bg-emerald-500 rounded-full z-10 flex items-center justify-center">
            <MapPin className="w-3 h-3 text-white" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">To</p>
            <p className="font-bold text-gray-900 dark:text-white">{ride.destination}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-50 dark:border-gray-700">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium">{format(new Date(ride.departureTime), 'MMM d, h:mm a')}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Users className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium">{ride.availableSeats} seats left</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
          <Leaf className="w-3.5 h-3.5" /> -{ride.carbonImpact}kg CO₂
        </div>
        <Link 
          to={`/ride/${ride.id}`}
          className="bg-gray-900 dark:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all flex items-center gap-2"
        >
          View Details <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  </motion.div>
);

// --- Eco Reports ---
const EcoReports = ({ user, profile }: { user: User, profile: UserProfile | null }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qOffered = query(collection(db, 'rides'), where('driverId', '==', user.uid));
    const qJoined = query(collection(db, 'rides'), where('riders', 'array-contains', user.uid));
    
    let allRides: Ride[] = [];
    let loaded = 0;

    const handleLoad = () => {
      loaded++;
      if (loaded >= 2) {
        // deduplicate
        const unique = Array.from(new Map(allRides.map(r => [r.id, r])).values());
        setRides(unique);
        setLoading(false);
      }
    };

    const unsub1 = onSnapshot(qOffered, (snap) => {
      const offered = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ride));
      allRides = [...allRides.filter(r => !offered.some(o => o.id === r.id)), ...offered];
      handleLoad();
    });
    const unsub2 = onSnapshot(qJoined, (snap) => {
      const joined = snap.docs.map(d => ({ id: d.id, ...d.data() } as Ride));
      allRides = [...allRides.filter(r => !joined.some(j => j.id === r.id)), ...joined];
      handleLoad();
    });

    return () => { unsub1(); unsub2(); };
  }, [user.uid]);

  // Generate monthly data for last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    const monthRides = rides.filter(r => {
      try {
        const rideDate = parseISO(r.createdAt);
        return isWithinInterval(rideDate, { start, end }) && r.status !== 'cancelled';
      } catch { return false; }
    });

    const carbonSaved = monthRides.reduce((sum, r) => sum + r.carbonImpact, 0);
    const moneySaved = monthRides.reduce((sum, r) => sum + r.pricePerSeat, 0);

    return {
      month: format(date, 'MMM'),
      rides: monthRides.length,
      carbonSaved: parseFloat(carbonSaved.toFixed(1)),
      moneySaved: parseFloat(moneySaved.toFixed(0)),
    };
  });

  const totalCarbon = monthlyData.reduce((s, d) => s + d.carbonSaved, 0);
  const totalRides = monthlyData.reduce((s, d) => s + d.rides, 0);
  const totalSaved = monthlyData.reduce((s, d) => s + d.moneySaved, 0);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-xl text-emerald-600">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">Monthly Eco Reports</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-emerald-100"><Leaf className="w-5 h-5" /><span className="text-sm font-bold">Carbon Saved</span></div>
          <p className="text-4xl font-black">{totalCarbon.toFixed(1)}<span className="text-lg ml-1">kg</span></p>
          <p className="text-emerald-200 text-xs mt-1">Last 6 months</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400"><TrendingUp className="w-5 h-5 text-emerald-600" /><span className="text-sm font-bold">Total Rides</span></div>
          <p className="text-4xl font-black text-gray-900 dark:text-white">{totalRides}</p>
          <p className="text-gray-400 text-xs mt-1">Last 6 months</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400"><DollarSign className="w-5 h-5 text-emerald-600" /><span className="text-sm font-bold">Money Saved</span></div>
          <p className="text-4xl font-black text-gray-900 dark:text-white">${totalSaved}</p>
          <p className="text-gray-400 text-xs mt-1">Estimated savings</p>
        </div>
      </div>

      {/* Carbon Chart */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Carbon Savings Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="carbonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value: number) => [`${value} kg CO₂`, 'Carbon Saved']}
            />
            <Area type="monotone" dataKey="carbonSaved" stroke="#059669" strokeWidth={3} fill="url(#carbonGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Rides Chart */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Monthly Ride Activity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="rides" fill="#059669" radius={[8, 8, 0, 0]} name="Rides" />
            <Bar dataKey="moneySaved" fill="#0d9488" radius={[8, 8, 0, 0]} name="$ Saved" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Eco Achievements Summary */}
      <div className="mt-8 bg-emerald-50 dark:bg-emerald-950 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-900">
        <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mb-4">Your Eco Achievements</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-600">{profile?.totalRides || 0}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase">Total Rides</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-600">{profile?.carbonSaved.toFixed(1) || 0}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase">kg CO₂ Saved</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-600">{profile?.points || 0}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase">Eco Points</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-black text-emerald-600">{profile?.badges?.length || 0}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase">Badges</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RideSearch = ({ user }: { user: User }) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [recurringTrips, setRecurringTrips] = useState<RecurringTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [minSeats, setMinSeats] = useState<number>(0);
  const [departureBefore, setDepartureBefore] = useState('');
  const [departureAfter, setDepartureAfter] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'rides'), where('status', '==', 'open'), orderBy('departureTime', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rides');
    });

    const qRecurring = query(collection(db, 'recurringTrips'), where('userId', '==', user.uid), where('active', '==', true));
    const unsubRecurring = onSnapshot(qRecurring, (snapshot) => {
      setRecurringTrips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecurringTrip)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'recurringTrips');
    });

    return () => { unsubscribe(); unsubRecurring(); };
  }, [user.uid]);

  const hasActiveFilters = maxPrice > 0 || minSeats > 0 || departureBefore || departureAfter;

  const filteredRides = rides.filter(r => {
    const matchesSearch = !search || r.origin.toLowerCase().includes(search.toLowerCase()) || r.destination.toLowerCase().includes(search.toLowerCase());
    const matchesPrice = maxPrice <= 0 || r.pricePerSeat <= maxPrice;
    const matchesSeats = minSeats <= 0 || r.availableSeats >= minSeats;
    const matchesBefore = !departureBefore || r.departureTime <= departureBefore;
    const matchesAfter = !departureAfter || r.departureTime >= departureAfter;
    return matchesSearch && matchesPrice && matchesSeats && matchesBefore && matchesAfter;
  });

  const clearFilters = () => { setMaxPrice(0); setMinSeats(0); setDepartureBefore(''); setDepartureAfter(''); };

  const suggestedRides = rides.filter(r => 
    recurringTrips.some(t => 
      t.origin.toLowerCase() === r.origin.toLowerCase() && 
      t.destination.toLowerCase() === r.destination.toLowerCase() &&
      t.role !== (r.driverId === user.uid ? 'driver' : 'rider')
    )
  ).slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {suggestedRides.length > 0 && !search && !hasActiveFilters && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900 rounded-lg text-emerald-600">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Suggested for your Commute</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {suggestedRides.map(ride => <RideCard key={ride.id} ride={ride} />)}
          </div>
          <div className="mt-8 border-b border-gray-100 dark:border-gray-700" />
        </div>
      )}

      <div className="mb-12">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6">Find your next ride</h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Where are you going?" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            <button onClick={() => setShowFilters(f => !f)} className={cn("p-4 rounded-2xl border transition-all", showFilters || hasActiveFilters ? "bg-emerald-50 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-600" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-emerald-300")}>
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>

          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="max-w-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Filters</h4>
                {hasActiveFilters && <button onClick={clearFilters} className="text-sm text-emerald-600 hover:underline">Clear all</button>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Price (₹)</label>
                  <input type="number" min={0} value={maxPrice || ''} onChange={(e) => setMaxPrice(Number(e.target.value))} placeholder="Any price" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Seats</label>
                  <input type="number" min={0} max={8} value={minSeats || ''} onChange={(e) => setMinSeats(Number(e.target.value))} placeholder="Any" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Departs After</label>
                  <input type="datetime-local" value={departureAfter} onChange={(e) => setDepartureAfter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Departs Before</label>
                  <input type="datetime-local" value={departureBefore} onChange={(e) => setDepartureBefore(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
            </motion.div>
          )}

          {hasActiveFilters && (
            <div className="flex items-center gap-2 max-w-2xl flex-wrap">
              <span className="text-sm text-gray-500 dark:text-gray-400">Active:</span>
              {maxPrice > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">≤ ₹{maxPrice} <button onClick={() => setMaxPrice(0)} className="hover:text-red-500">×</button></span>}
              {minSeats > 0 && <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">≥ {minSeats} seats <button onClick={() => setMinSeats(0)} className="hover:text-red-500">×</button></span>}
              {departureAfter && <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">After {format(new Date(departureAfter), 'MMM d, h:mm a')} <button onClick={() => setDepartureAfter('')} className="hover:text-red-500">×</button></span>}
              {departureBefore && <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">Before {format(new Date(departureBefore), 'MMM d, h:mm a')} <button onClick={() => setDepartureBefore('')} className="hover:text-red-500">×</button></span>}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        </div>
      ) : filteredRides.length > 0 ? (
        <div>
          {hasActiveFilters && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{filteredRides.length} ride{filteredRides.length !== 1 ? 's' : ''} found</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRides.map(ride => <RideCard key={ride.id} ride={ride} />)}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <Car className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No rides found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {hasActiveFilters ? 'Try adjusting your filters or search terms.' : 'Try searching for a different location or check back later.'}
          </p>
          {hasActiveFilters && <button onClick={clearFilters} className="mt-4 text-emerald-600 hover:underline text-sm font-medium">Clear all filters</button>}
        </div>
      )}
    </div>
  );
};

const PostRide = ({ user, profile }: { user: User, profile: UserProfile | null }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    departureTime: '',
    availableSeats: 3,
    pricePerSeat: 10,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.isVerified) {
      alert("Please verify your account in your profile before offering rides.");
      return;
    }

    try {
      const rideData = {
        ...formData,
        driverId: user.uid,
        driverName: user.displayName,
        status: 'open',
        riders: [],
        totalSeats: formData.availableSeats,
        carbonImpact: Math.floor(Math.random() * 10) + 5, // Mock calculation
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'rides'), rideData);
      navigate('/rides');
    } catch (error) {
      console.error("Error posting ride:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-3xl shadow-xl border border-emerald-50 dark:border-gray-700"
      >
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-8">Offer a Ride</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Origin</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
                <input 
                  required
                  type="text" 
                  placeholder="Starting from..."
                  value={formData.origin}
                  onChange={e => setFormData({...formData, origin: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 w-5 h-5" />
                <input 
                  required
                  type="text" 
                  placeholder="Going to..."
                  value={formData.destination}
                  onChange={e => setFormData({...formData, destination: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Departure Time</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5" />
              <input 
                required
                type="datetime-local" 
                value={formData.departureTime}
                onChange={e => setFormData({...formData, departureTime: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Available Seats</label>
              <input 
                required
                type="number" 
                min="1"
                max="8"
                value={formData.availableSeats}
                onChange={e => setFormData({...formData, availableSeats: parseInt(e.target.value)})}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Price per Seat ($)</label>
              <input 
                required
                type="number" 
                min="0"
                value={formData.pricePerSeat}
                onChange={e => setFormData({...formData, pricePerSeat: parseFloat(e.target.value)})}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-100 active:scale-95 mt-4"
          >
            Post Ride
          </button>
        </form>
      </motion.div>
    </div>
  );
};

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
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <div className="relative inline-block mb-4">
              <img 
                src={profile?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.uid} 
                alt="Profile" 
                className="w-32 h-32 rounded-full border-4 border-emerald-50 dark:border-emerald-900 mx-auto"
              />
              {profile?.isVerified && (
                <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full border-4 border-white dark:border-gray-800">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.displayName}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{profile?.email}</p>
            
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
            <div className="mt-6 pt-6 border-t border-emerald-500/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Rides</span>
                <span className="font-bold">{profile?.totalRides}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cancellations</span>
                <span className={cn("font-bold", (profile?.cancellations || 0) > 3 ? "text-red-200" : "text-emerald-100")}>
                  {profile?.cancellations || 0}
                </span>
              </div>
            </div>
          </div>

          {profile?.cancellations && profile.cancellations > 3 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-start gap-4 shadow-sm"
            >
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
              <div>
                <h4 className="text-base font-bold text-red-900 mb-1">Reliability Warning</h4>
                <p className="text-sm text-red-700 leading-relaxed">You have {profile.cancellations} cancellations. High cancellation rates affect platform trust and may lead to temporary account suspension.</p>
              </div>
            </motion.div>
          )}

          <Leaderboard />
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Achievements</h3>
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

          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <RecurringTrips user={user} />
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h3>
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
                  <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{profile?.role}</p>
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
                  <span className="font-bold text-gray-900 dark:text-white">{profile?.rating.toFixed(1)} / 5.0</span>
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
              <div>
                <h4 className="text-lg font-bold text-red-900 mb-1">Emergency SOS</h4>
                <p className="text-red-700 text-sm mb-4">In case of any emergency during your ride, use the SOS feature to alert authorities and our safety team.</p>
                <button className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-100">
                  Configure SOS Contacts
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MyRides = ({ user }: { user: User }) => {
  const [offeredRides, setOfferedRides] = useState<Ride[]>([]);
  const [joinedRides, setJoinedRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qOffered = query(collection(db, 'rides'), where('driverId', '==', user.uid), orderBy('departureTime', 'desc'));
    const qJoined = query(collection(db, 'rides'), where('riders', 'array-contains', user.uid), orderBy('departureTime', 'desc'));

    const unsubOffered = onSnapshot(qOffered, (snapshot) => {
      setOfferedRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rides');
    });

    const unsubJoined = onSnapshot(qJoined, (snapshot) => {
      setJoinedRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rides');
    });

    return () => { unsubOffered(); unsubJoined(); };
  }, [user.uid]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-12">My Rides</h2>
      
      <div className="space-y-16">
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Rides I'm Offering</h3>
          </div>
          {offeredRides.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {offeredRides.map(ride => <RideCard key={ride.id} ride={ride} />)}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl border border-gray-100 dark:border-gray-700 text-center">
              <p className="text-gray-500 dark:text-gray-400 font-medium">You haven't offered any rides yet.</p>
              <Link to="/post-ride" className="text-emerald-600 font-bold mt-2 inline-block hover:underline">Offer your first ride</Link>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Rides I've Joined</h3>
          </div>
          {joinedRides.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {joinedRides.map(ride => <RideCard key={ride.id} ride={ride} />)}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl border border-gray-100 dark:border-gray-700 text-center">
              <p className="text-gray-500 dark:text-gray-400 font-medium">You haven't joined any rides yet.</p>
              <Link to="/rides" className="text-emerald-600 font-bold mt-2 inline-block hover:underline">Find a ride to join</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDanger = false }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
      >
        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">{message}</p>
        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className={cn(
              "flex-1 py-4 px-6 rounded-2xl font-bold text-white transition-all shadow-lg",
              isDanger ? "bg-red-600 hover:bg-red-700 shadow-red-200" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
            )}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const RideDetails = ({ user, profile }: { user: User, profile: UserProfile | null }) => {
  const { rideId } = useParams<{ rideId: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!rideId) return;
    const unsubRide = onSnapshot(doc(db, 'rides', rideId), (doc) => {
      if (doc.exists()) {
        setRide({ id: doc.id, ...doc.data() } as Ride);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rides/${rideId}`);
    });

    return () => unsubRide();
  }, [rideId]);

  useEffect(() => {
    if (!rideId || !ride || !user) return;
    
    const isDriver = ride.driverId === user.uid;
    const isRider = ride.riders.includes(user.uid);
    
    if (!isDriver && !isRider) return;

    const qMessages = query(collection(db, 'rides', rideId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rides/${rideId}/messages`);
    });

    return () => unsubMessages();
  }, [rideId, ride, user]);

  const handleJoin = async () => {
    if (!ride || !user || !rideId) return;
    if (ride.riders.includes(user.uid)) return;
    if (ride.availableSeats <= 0) return;

    try {
      await updateDoc(doc(db, 'rides', rideId), {
        riders: arrayUnion(user.uid),
        availableSeats: ride.availableSeats - 1,
        status: ride.availableSeats - 1 === 0 ? 'full' : 'open'
      });
      
      // Update user carbon saved and points
      if (profile) {
        const newCarbonSaved = profile.carbonSaved + ride.carbonImpact;
        const newPoints = profile.points + 50;
        const newBadges = [...profile.badges];
        
        if (newCarbonSaved >= 100 && !newBadges.includes('Eco Warrior')) {
          newBadges.push('Eco Warrior');
        }
        if (profile.totalRides + 1 >= 10 && !newBadges.includes('Frequent Flyer')) {
          newBadges.push('Frequent Flyer');
        }

        await updateDoc(doc(db, 'users', user.uid), {
          carbonSaved: newCarbonSaved,
          totalRides: profile.totalRides + 1,
          points: newPoints,
          badges: newBadges
        });
      }
    } catch (error) {
      console.error("Error joining ride:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !rideId || !user) return;

    try {
      await addDoc(collection(db, 'rides', rideId, 'messages'), {
        rideId,
        senderId: user.uid,
        receiverId: ride?.driverId,
        content: newMessage,
        timestamp: new Date().toISOString()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleCompleteRide = async () => {
    if (!rideId || !isDriver) return;
    await updateDoc(doc(db, 'rides', rideId), { status: 'completed' });
  };

  const handleCancelRide = async () => {
    if (!rideId || !isDriver || !ride) return;
    try {
      await updateDoc(doc(db, 'rides', rideId), { status: 'cancelled' });
      if (profile) {
        await updateDoc(doc(db, 'users', user.uid), {
          cancellations: (profile.cancellations || 0) + 1
        });
      }
      navigate('/my-rides');
    } catch (error) {
      console.error("Error cancelling ride:", error);
    }
  };

  const handleLeaveRide = async () => {
    if (!rideId || !isRider || !ride) return;
    try {
      const newRiders = ride.riders.filter(id => id !== user.uid);
      await updateDoc(doc(db, 'rides', rideId), {
        riders: newRiders,
        availableSeats: ride.availableSeats + 1,
        status: 'open'
      });
      if (profile) {
        await updateDoc(doc(db, 'users', user.uid), {
          cancellations: (profile.cancellations || 0) + 1
        });
      }
      navigate('/my-rides');
    } catch (error) {
      console.error("Error leaving ride:", error);
    }
  };

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rideId || !user) return;
    
    try {
      await addDoc(collection(db, 'reviews'), {
        rideId,
        reviewerId: user.uid,
        revieweeId: isDriver ? ride.riders[0] : ride.driverId, // Simplified for demo
        rating: reviewRating,
        comment: reviewComment,
        timestamp: new Date().toISOString()
      });
      setReviewSubmitted(true);
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" /></div>;
  if (!ride) return <div className="text-center py-20">Ride not found</div>;

  const isDriver = ride.driverId === user.uid;
  const isRider = ride.riders.includes(user.uid);
  const canJoin = !isDriver && !isRider && ride.availableSeats > 0 && ride.status === 'open';

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <ConfirmationModal 
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelRide}
        title="Cancel Ride"
        message="Are you sure you want to cancel this ride? This will notify all riders and may affect your reliability rating."
        confirmText="Cancel Ride"
        isDanger={true}
      />
      <ConfirmationModal 
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveRide}
        title="Leave Ride"
        message="Are you sure you want to leave this ride?"
        confirmText="Leave Ride"
        isDanger={true}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block",
                  ride.status === 'open' ? "bg-emerald-100 text-emerald-700" : 
                  ride.status === 'completed' ? "bg-blue-100 text-blue-700" : 
                  ride.status === 'cancelled' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                )}>
                  {ride.status}
                </span>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white">{ride.origin} to {ride.destination}</h2>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-emerald-600">${ride.pricePerSeat}</p>
                <p className="text-sm text-gray-400 font-medium">per seat</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                <Calendar className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Departure</p>
                  <p className="font-bold text-gray-900 dark:text-white">{format(new Date(ride.departureTime), 'MMM d, h:mm a')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                <Users className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Seats</p>
                  <p className="font-bold text-gray-900 dark:text-white">{ride.availableSeats} available</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl">
                <Leaf className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs text-emerald-600/60 font-bold uppercase">Eco Saving</p>
                  <p className="font-bold text-emerald-700">-{ride.carbonImpact}kg CO₂</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-8">
              <h4 className="font-bold text-gray-900 dark:text-white mb-4">Driver Information</h4>
              <div className="flex items-center gap-4 p-4 border border-gray-100 dark:border-gray-700 rounded-2xl">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                  {ride.driverName[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{ride.driverName}</p>
                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" /> Verified Identity
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold text-gray-900 text-sm">4.9</span>
                </div>
              </div>
            </div>

            {canJoin && (
              <button 
                onClick={handleJoin}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-100 active:scale-95 mt-8"
              >
                Join this Ride
              </button>
            )}
            {isRider && ride.status !== 'completed' && ride.status !== 'cancelled' && (
              <div className="space-y-4 mt-8">
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> You've joined this ride
                </div>
                <button 
                  onClick={() => setShowLeaveModal(true)}
                  className="w-full py-4 px-6 rounded-2xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
                  Leave Ride
                </button>
              </div>
            )}
            {isDriver && ride.status === 'open' && (
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <button 
                  onClick={handleCompleteRide}
                  className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark as Completed
                </button>
                <button 
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Cancel Ride
                </button>
              </div>
            )}
          </motion.div>

          {ride.status === 'completed' && (isDriver || isRider) && !reviewSubmitted && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-emerald-100 dark:border-gray-700"
            >
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Leave a Review</h3>
              <form onSubmit={handleReview} className="space-y-4">
                <div className="flex gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={cn("p-1 transition-all", reviewRating >= star ? "text-amber-400" : "text-gray-200")}
                    >
                      <Star className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>
                <textarea 
                  placeholder="How was your experience?"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 h-32 text-gray-900 dark:text-white"
                />
                <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">
                  Submit Review
                </button>
              </form>
            </motion.div>
          )}

          {reviewSubmitted && (
            <div className="bg-emerald-50 p-8 rounded-3xl text-emerald-700 font-bold text-center">
              Thank you for your feedback!
            </div>
          )}

          {(isDriver || isRider) && ride.status !== 'completed' && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-[500px]">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 dark:text-white">Ride Chat</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length > 0 ? messages.map(msg => (
                  <div key={msg.id} className={cn(
                    "flex flex-col max-w-[80%]",
                    msg.senderId === user.uid ? "ml-auto items-end" : "mr-auto items-start"
                  )}>
                    <div className={cn(
                      "px-4 py-2 rounded-2xl text-sm font-medium",
                      msg.senderId === user.uid ? "bg-emerald-600 text-white rounded-tr-none" : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1">{format(new Date(msg.timestamp), 'h:mm a')}</span>
                  </div>
                )) : (
                  <div className="text-center py-10 text-gray-400 text-sm italic">
                    No messages yet. Start the conversation!
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                  />
                  <button type="submit" className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Safety Features</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Real-time Tracking</p>
                  <p className="text-xs text-gray-500">Share your live location with trusted contacts.</p>
                </div>
              </div>
              <button className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Emergency SOS
              </button>
            </div>
          </div>

          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
            <h4 className="font-bold text-emerald-900 mb-2">Carbon Calculator</h4>
            <p className="text-sm text-emerald-700 mb-4">By sharing this ride, you're preventing {ride.carbonImpact}kg of CO₂ from entering the atmosphere.</p>
            <div className="w-full bg-emerald-200 rounded-full h-2">
              <div className="bg-emerald-600 h-2 rounded-full w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
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
            cancellations: 0,
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', u.uid), newProfile);
          setProfile(newProfile);
        } else {
          setProfile(userDoc.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
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
    <ThemeProvider>
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-white transition-colors">
        <Navbar user={user} profile={profile} />
        
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/rides" element={user ? <RideSearch user={user} /> : <Navigate to="/" />} />
            <Route path="/ride/:rideId" element={user ? <RideDetails user={user} profile={profile} /> : <Navigate to="/" />} />
            <Route path="/post-ride" element={user ? <PostRide user={user} profile={profile} /> : <Navigate to="/" />} />
            <Route path="/my-rides" element={user ? <MyRides user={user} /> : <Navigate to="/" />} />
            <Route path="/profile" element={user ? <Profile user={user} profile={profile} /> : <Navigate to="/" />} />
            <Route path="/eco-reports" element={user ? <EcoReports user={user} profile={profile} /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 py-12 mt-20">
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
      </div>
    </Router>
    </ThemeProvider>
  );
}
