# Janadesh
Secure College Voting Platform (Web + Android)

## Overview
Janadesh is a full-stack digital voting platform designed for college elections.
It provides OTP-based authentication, election and candidate management, secure
vote casting, and database-backed persistence. The web app can also be packaged
as an Android app using Capacitor.

## Tech Stack
- Frontend: React, Vite, TypeScript, MUI
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL
- Blockchain Module: Solidity, Hardhat, Ethers
- Mobile: Capacitor, Android Studio

## Core Features
- OTP-based registration and login
- Election listing, candidate details, and voting flow
- Secure vote storage in PostgreSQL
- Admin/creator election lifecycle controls
- Blockchain smart-contract testing for integrity rules
- Android app build via Capacitor

## Project Structure
```
Backend/                 Node/Express API + DB logic
Backend/Blockchain/      Solidity contracts + Hardhat tests
frontend-react/          React web app + Capacitor config
Frontend/                Legacy frontend snapshot (if used)
Docs/                    Supporting docs (if any)
```

## Run (Web Only)
1) Start PostgreSQL
2) Start backend
```
cd "C:\Users\Aayush Tiwari\Desktop\EPICS-Janadesh\Backend"
npm run dev
```
3) Seed demo data (optional but recommended)
```
npm run demo:reset-seed
```
4) Start frontend
```
cd "C:\Users\Aayush Tiwari\Desktop\EPICS-Janadesh\frontend-react"
$env:VITE_API_URL="http://localhost:3001/api/v1"
npm run dev -- --host 127.0.0.1 --port 5173
```
5) Open in browser
```
http://127.0.0.1:5173
```

## Tests
Backend:
```
cd "C:\Users\Aayush Tiwari\Desktop\EPICS-Janadesh\Backend"
npm run test
```

Frontend:
```
cd "C:\Users\Aayush Tiwari\Desktop\EPICS-Janadesh\frontend-react"
npm run test:run
```

Blockchain:
```
cd "C:\Users\Aayush Tiwari\Desktop\EPICS-Janadesh\Backend\Blockchain"
npm run test
```

## Notes
- For mobile testing, rebuild the app after changing API URLs.
- If LAN access fails, use a tunnel and point `VITE_API_URL` to the tunnel URL.
