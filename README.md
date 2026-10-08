# Smart Parking System (IoT)

ESP32 + ultrasonic sensors report whether each parking slot is free or occupied.
The Express server stores it in PostgreSQL and pushes it to every open browser
instantly with Socket.IO. Visitors just look; guards log in to reserve slots for faculty.

```
Ultrasonic -> ESP32 --HTTP POST (on change + heartbeat)--> Express API --> PostgreSQL
                                                              |
                                                       Socket.IO push
                                                              v
                                      React: public board  +  guard dashboard (JWT)
```

## Project structure

```
smart-parking/
├── docker-compose.yml        db + backend + frontend
├── .env.example              copy to .env and edit
├── backend/
│   ├── Dockerfile
│   ├── .env.example          only for running without Docker
│   └── src/
│       ├── server.js         starts HTTP + Socket.IO, waits for DB
│       ├── app.js            express setup (helmet, cors, routes, errors)
│       ├── config/           env.js, db.js (pool + transactions)
│       ├── routes/           slot, auth, guard, device
│       ├── controllers/      thin: read request, call service, send response
│       ├── services/         business logic + SQL (slot, reservation, auth, broadcast)
│       ├── middleware/       auth (JWT), deviceAuth (API key), validate, errorHandler
│       ├── validators/       zod schemas
│       ├── sockets/          Socket.IO setup
│       ├── jobs/             statusWatcher (offline sensors, reservation start/end)
│       ├── utils/            ApiError, asyncHandler
│       └── db/init.sql       tables + 6 demo slots
├── frontend/
│   ├── Dockerfile            builds React, serves with nginx
│   ├── nginx.conf            proxies /api and /socket.io to the backend
│   └── src/
│       ├── config.js         lot name ("LIBRARY") and which zones are drawn wide
│       ├── pages/            Dashboard (public), Login, Reservations, Activity (guard)
│       ├── components/       Layout (sidebar + top bar), Stat, ProtectedRoute
│       ├── context/          AuthContext, SlotsContext (one live socket for the app)
│       ├── hooks/            useSlots, useGuardData
│       └── styles.css        dark dashboard theme
└── firmware/esp32_parking/   Arduino sketch
```

## Run it

1. Install Docker Desktop.
2. Create your settings file and change the secrets:
   ```
   cp .env.example .env
   ```
3. Start everything:
   ```
   docker compose up --build
   ```
4. Open:
   - Public board: http://localhost:8080
   - Guard pages: http://localhost:8080/guard (redirects to the login; use `GUARD_USERNAME` / `GUARD_PASSWORD` from `.env`)
   - API health check: http://localhost:5000/api/health

The database tables and demo slots (A1 to A4, B1, B2) are created the first time the
database starts. To change the slots and start fresh: edit `backend/src/db/init.sql`, then
run `docker compose down -v` and `docker compose up --build`.

### Load a bigger sample lot (optional)

`backend/src/db/sample-lot.sql` adds 30 slots in 3 zones (SLOT 1, SLOT 2, SLOT 3: labels A01-A10, B01-B10, C01-C10)
so the dashboard looks like the design. Run it while the stack is up:

```
docker compose exec -T db psql -U parking -d parking < backend/src/db/sample-lot.sql
```

Change the lot name or which zones are drawn as a wide row in `frontend/src/config.js`
(then `docker compose up --build`).

### Try it without hardware

Pretend to be the ESP32 (use the `DEVICE_API_KEY` from your `.env`):

```
curl -X POST http://localhost:5000/api/device/readings \
  -H "Content-Type: application/json" -H "x-api-key: change_me_device_key" \
  -d '{"readings":[{"slot":"A1","status":"occupied"},{"slot":"A2","status":"free"}]}'
```

The board at :8080 updates without a refresh.

## ESP32 setup

1. Open `firmware/esp32_parking/esp32_parking.ino` in Arduino IDE (install the "esp32" board package).
2. Edit Wi-Fi name/password, `SERVER_URL` (your computer's local IP, not `localhost`) and `DEVICE_API_KEY`.
3. Wire each HC-SR04. **ECHO outputs 5V, so use a voltage divider (1k + 2k) before the ESP32 pin.**
   Default pins: A1 = TRIG 25 / ECHO 26, A2 = TRIG 27 / ECHO 14.
4. The slot labels in the sketch must match the labels in the database.
5. Your phone/ESP32 and the computer must be on the same network, and the firewall must allow port 5000.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/slots` | none | Public slot list (free / occupied / reserved / unknown) |
| POST | `/api/device/readings` | `x-api-key` | ESP32 sends `{readings:[{slot,status}]}` |
| POST | `/api/auth/login` | none | Guard login, returns JWT |
| GET | `/api/guard/slots` | JWT | Slots with reservation details |
| GET | `/api/guard/events` | JWT | Recent free/occupied changes |
| GET | `/api/guard/reservations` | JWT | Active and upcoming reservations |
| POST | `/api/guard/reservations` | JWT | `{slotId, facultyName, startTime, endTime}` |
| DELETE | `/api/guard/reservations/:id` | JWT | Cancel a reservation |

Socket.IO event: `slots:update` carries the full public slot list. It is sent on connect and
whenever anything changes.

## How a slot's status is decided

- **unknown**: its ESP32 has not reported for `OFFLINE_AFTER_SECONDS` (default 90) or never has
- **occupied**: sensor sees a car (the guard dashboard warns if it is in a reserved slot)
- **reserved**: sensor sees nothing, but a faculty reservation is active right now
- **free**: otherwise

## Running without Docker (development)

```
# terminal 1: needs a local PostgreSQL with the schema from backend/src/db/init.sql loaded
cd backend && cp .env.example .env && npm install && npm run dev

# terminal 2
cd frontend && npm install && npm run dev      # http://localhost:5173
```

## Ideas to extend it

- Occupancy-by-hour chart from the `slot_events` table
- MQTT instead of HTTP between the ESP32 and the server
- Over-the-air updates and a status LED on the ESP32
- HTTPS and rate limiting on `/api/auth/login` before any real deployment
