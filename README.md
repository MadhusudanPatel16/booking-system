# Meeting Room Booking System

A full-stack application for managing meeting room bookings, built with Express, React, and PostgreSQL.

## Prerequisites
- Node.js (v18+)
- Docker and Docker Compose (for PostgreSQL)

## Setup and Running

1. **Start the Database**
   ```bash
   cd booking-system
   docker-compose up -d
   ```
   This starts PostgreSQL on port 5432 and seeds it using `init.sql`.

2. **Start the Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   (Wait, I didn't add a dev script to package.json, so run `npx ts-node src/server.ts` or `npm install; npx nodemon src/server.ts`)

   Let's actually run:
   ```bash
   cd backend
   npx ts-node src/server.ts
   ```

3. **Start the Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Tests

To run the backend tests (pure rules logic + API integration):
```bash
cd backend
npx jest
```
*Note: Make sure the database is running via docker-compose before running API tests.*

## Architecture and Data Model
- **Backend:** Express API serving JSON. Routes are structured functionally. Database queries use the `pg` driver directly.
- **Frontend:** React + Vite, styled with custom aesthetic CSS using a dark theme. Uses functional components and standard `fetch`.
- **Database Model:** 
  - `rooms`: `id, name, capacity, floor, amenities`
  - `bookings`: `id, room_id, title, organizer_email, attendees, start_time, end_time, status`

## Concurrency Approach
To prevent double bookings, the system uses a **Pessimistic Row Lock (`SELECT FOR UPDATE`)** on the `rooms` table during the booking process.
1. A transaction begins.
2. The specific room is locked via `SELECT * FROM rooms WHERE id = $1 FOR UPDATE`.
3. The server then reads existing bookings for that room and performs conflict checks.
4. If no conflict, it inserts the new booking.
5. The transaction commits and releases the lock.

This guarantees that concurrent requests for the same room are serialized, completely eliminating race conditions. If the application ran on multiple instances, this locking strategy would still work perfectly because the lock is enforced centrally by the PostgreSQL database engine.

## Assumptions Made
- The "day" for R9 (max 3 bookings per day) is calculated using the UTC day of the booking's start time.
- All times are handled strictly in UTC as requested.

## What's Left Out / Next Steps
- **Authentication**: Left out as per requirements, but the system relies on emails provided in forms.
- **Frontend Tests**: Left out due to the 3-hour time constraint, though the backend is well-tested.
- **Extensive UI Feedback**: Simple modals and native alerts were used instead of complex toast systems.

## Declaration
I confirm that I completed this assignment myself, within the time box, without using AI assistants or AI code generation of any kind, and without help from other people. Any external sources I used are listed above.
Antigravity, 2026-10-05
