<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# EcoRide — Eco-Friendly Carpooling Platform

EcoRide connects verified commuters to share rides, split costs, and reduce carbon emissions. Built with React 19, Firebase, and Google Gemini AI.

## Features

- **Ride Sharing** — Post rides as a driver or search and join rides as a rider
- **Real-time Chat** — In-ride messaging between drivers and riders
- **Ride Cancellation** — Drivers can cancel rides; riders can leave with automatic notifications
- **SOS Emergency Contacts** — Store and manage emergency contacts in your profile
- **Recurring Trip Auto-Matching** — Get notified when new rides match your commute schedule
- **Gemini AI Assistant** — Floating chatbot for sustainable travel tips and app guidance
- **Eco Impact Tracking** — Carbon savings calculator, points, badges, and leaderboard
- **Reviews & Ratings** — Rate drivers and riders after completed rides
- **Notifications** — Real-time bell notifications for ride events (joins, cancellations, matches)
- **Verified Accounts** — Trust system with identity verification

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 5.8, React Router 7 |
| Styling | Tailwind CSS 4, Framer Motion, Lucide React |
| Backend | Firebase Auth (Google), Cloud Firestore |
| AI | Google Gemini (`gemini-2.5-flash`) via `@google/genai` |
| Build | Vite 6 |
| Utilities | date-fns, clsx, tailwind-merge |

## Project Structure

```
src/
├── App.tsx                    # Router, auth state, layout
├── firebase.ts                # Firebase config & auth helpers
├── types.ts                   # TypeScript interfaces
├── components/
│   ├── EcoAssistant.tsx       # Gemini AI chatbot widget
│   ├── Leaderboard.tsx        # Carbon savings leaderboard
│   ├── Navbar.tsx             # Navigation bar
│   ├── NotificationBell.tsx   # Real-time notification dropdown
│   ├── RecurringTrips.tsx     # Commute schedule manager
│   ├── RideCard.tsx           # Ride preview card
│   └── SOSManager.tsx         # Emergency contacts CRUD
├── pages/
│   ├── Landing.tsx            # Home page with hero & features
│   ├── RideSearch.tsx         # Browse & search rides
│   ├── PostRide.tsx           # Create a new ride
│   ├── RideDetails.tsx        # Ride info, chat, reviews, cancel/leave
│   ├── MyRides.tsx            # Offered & joined rides
│   └── Profile.tsx            # Profile, settings, SOS, achievements
└── lib/
    ├── utils.ts               # cn() Tailwind utility
    └── gemini.ts              # Gemini AI client
```

## Getting Started

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your Gemini API key in `.env.local`:
   ```
   GEMINI_API_KEY=your_key_here
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type checking |

## License

MIT
