import { format } from 'date-fns';
import { User } from 'firebase/auth';
import { addDoc, arrayRemove, arrayUnion, collection, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    Leaf,
    MessageCircle,
    ShieldAlert,
    Star,
    UserMinus,
    Users,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { Message, Review, Ride, UserProfile } from '../types';

const RideDetails = ({ user, profile }: { user: User, profile: UserProfile | null }) => {
  const { rideId } = useParams<{ rideId: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [driverRating, setDriverRating] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewTargetId, setReviewTargetId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!rideId) return;
    const unsubRide = onSnapshot(doc(db, 'rides', rideId), (doc) => {
      if (doc.exists()) {
        setRide({ id: doc.id, ...doc.data() } as Ride);
      }
      setLoading(false);
    });

    const qMessages = query(collection(db, 'rides', rideId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });

    return () => { unsubRide(); unsubMessages(); };
  }, [rideId]);

  // Fetch driver's actual average rating from reviews
  useEffect(() => {
    if (!ride) return;
    const q = query(collection(db, 'reviews'), where('revieweeId', '==', ride.driverId));
    getDocs(q).then((snapshot) => {
      if (snapshot.empty) {
        setDriverRating(null);
      } else {
        const total = snapshot.docs.reduce((sum, d) => sum + (d.data() as Review).rating, 0);
        setDriverRating(parseFloat((total / snapshot.size).toFixed(1)));
      }
    });
  }, [ride?.driverId]);

  // Auto-set review target: riders review the driver; drivers with 1 rider auto-select that rider
  useEffect(() => {
    if (!ride) return;
    const isDriverUser = ride.driverId === user.uid;
    if (!isDriverUser) {
      setReviewTargetId(ride.driverId);
    } else if (ride.riders.length === 1) {
      setReviewTargetId(ride.riders[0]);
    }
  }, [ride, user.uid]);

  const handleJoin = async () => {
    if (!ride || !user || !rideId || joining) return;
    if (ride.riders.includes(user.uid)) return;
    if (ride.availableSeats <= 0) return;

    setJoining(true);
    try {
      await updateDoc(doc(db, 'rides', rideId), {
        riders: arrayUnion(user.uid),
        availableSeats: ride.availableSeats - 1,
        status: ride.availableSeats - 1 === 0 ? 'full' : 'open'
      });
      
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
      // Notify driver
      if (ride) {
        await addDoc(collection(db, 'notifications'), {
          userId: ride.driverId,
          type: 'rider_joined',
          message: `A new rider joined your ride from ${ride.origin} to ${ride.destination}!`,
          rideId,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error joining ride:", error);
    } finally {
      setJoining(false);
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

  const isDriver = ride ? ride.driverId === user.uid : false;
  const isRider = ride ? ride.riders.includes(user.uid) : false;
  const canJoin = ride ? !isDriver && !isRider && ride.availableSeats > 0 && ride.status === 'open' : false;

  const handleCompleteRide = async () => {
    if (!rideId || !isDriver) return;
    await updateDoc(doc(db, 'rides', rideId), { status: 'completed' });
  };

  const handleCancelRide = async () => {
    if (!rideId || !isDriver || !ride) return;
    if (!confirm('Cancel this ride? All riders will be notified.')) return;
    await updateDoc(doc(db, 'rides', rideId), { status: 'cancelled' });
    for (const riderId of ride.riders) {
      await addDoc(collection(db, 'notifications'), {
        userId: riderId,
        type: 'ride_cancelled',
        message: `The ride from ${ride.origin} to ${ride.destination} has been cancelled by the driver.`,
        rideId,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleLeaveRide = async () => {
    if (!rideId || !ride || !isRider) return;
    if (!confirm('Leave this ride?')) return;
    await updateDoc(doc(db, 'rides', rideId), {
      riders: arrayRemove(user.uid),
      availableSeats: ride.availableSeats + 1,
      status: 'open'
    });
    await addDoc(collection(db, 'notifications'), {
      userId: ride.driverId,
      type: 'rider_left',
      message: `A rider has left your ride from ${ride.origin} to ${ride.destination}. ${ride.availableSeats + 1} seats now available.`,
      rideId,
      read: false,
      createdAt: new Date().toISOString()
    });
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rideId || !user || !ride || !reviewTargetId) return;
    
    try {
      await addDoc(collection(db, 'reviews'), {
        rideId,
        reviewerId: user.uid,
        revieweeId: reviewTargetId,
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
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
                <h2 className="text-3xl font-black text-gray-900">{ride.origin} to {ride.destination}</h2>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-emerald-600">${ride.pricePerSeat}</p>
                <p className="text-sm text-gray-400 font-medium">per seat</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                <Calendar className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Departure</p>
                  <p className="font-bold text-gray-900">{format(new Date(ride.departureTime), 'MMM d, h:mm a')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                <Users className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Seats</p>
                  <p className="font-bold text-gray-900">{ride.availableSeats} available</p>
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

            <div className="border-t border-gray-100 pt-8">
              <h4 className="font-bold text-gray-900 mb-4">Driver Information</h4>
              <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-2xl">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                  {ride.driverName[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{ride.driverName}</p>
                  <div className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" /> Verified Identity
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1 text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold text-gray-900 text-sm">{driverRating !== null ? driverRating : 'New'}</span>
                </div>
              </div>
            </div>

            {canJoin && (
              <button 
                onClick={handleJoin}
                disabled={joining}
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg hover:shadow-emerald-100 active:scale-95 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? 'Joining...' : 'Join this Ride'}
              </button>
            )}
            {isRider && ride.status !== 'completed' && ride.status !== 'cancelled' && (
              <div className="mt-8 space-y-3">
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> You've joined this ride
                </div>
                <button 
                  onClick={handleLeaveRide}
                  className="w-full bg-red-50 text-red-600 py-3 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                >
                  <UserMinus className="w-4 h-4" /> Leave this Ride
                </button>
              </div>
            )}
            {isDriver && ride.status === 'open' && (
              <div className="mt-8 space-y-3">
                <button 
                  onClick={handleCompleteRide}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-lg"
                >
                  Mark as Completed
                </button>
                <button 
                  onClick={handleCancelRide}
                  className="w-full bg-red-50 text-red-600 py-3 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Cancel Ride
                </button>
              </div>
            )}
            {ride.status === 'cancelled' && (
              <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-2xl font-bold text-center flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5" /> This ride has been cancelled
              </div>
            )}
          </motion.div>

          {ride.status === 'completed' && (isDriver || isRider) && !reviewSubmitted && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-emerald-100"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Leave a Review</h3>
              {isDriver && ride.riders.length > 1 && (
                <div className="mb-4">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 block">Review for</label>
                  <select
                    value={reviewTargetId}
                    onChange={e => setReviewTargetId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                  >
                    <option value="">Select a rider...</option>
                    {ride.riders.map(riderId => (
                      <option key={riderId} value={riderId}>{riderId}</option>
                    ))}
                  </select>
                </div>
              )}
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
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 h-32"
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
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900">Ride Chat</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length > 0 ? messages.map(msg => (
                  <div key={msg.id} className={cn(
                    "flex flex-col max-w-[80%]",
                    msg.senderId === user.uid ? "ml-auto items-end" : "mr-auto items-start"
                  )}>
                    <div className={cn(
                      "px-4 py-2 rounded-2xl text-sm font-medium",
                      msg.senderId === user.uid ? "bg-emerald-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-900 rounded-tl-none"
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

              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
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
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h4 className="font-bold text-gray-900 mb-4">Safety Features</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Real-time Tracking</p>
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

export default RideDetails;
