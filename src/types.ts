export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'driver' | 'rider' | 'both';
  isVerified: boolean;
  rating: number;
  totalRides: number;
  carbonSaved: number;
  points: number;
  badges: string[];
  createdAt: string;
}

export interface RecurringTrip {
  id: string;
  userId: string;
  role: 'driver' | 'rider';
  origin: string;
  destination: string;
  days: string[];
  time: string;
  active: boolean;
}

export interface Ride {
  id: string;
  driverId: string;
  driverName: string;
  origin: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  totalSeats: number;
  pricePerSeat: number;
  status: 'open' | 'full' | 'completed' | 'cancelled';
  riders: string[];
  carbonImpact: number;
  createdAt: string;
}

export interface Message {
  id: string;
  rideId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
}

export interface Review {
  id: string;
  rideId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  timestamp: string;
}
