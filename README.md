# Smart Parking: Simulation and Project Setup

This guide covers two things:

1. Installing the compiler and simulating the ESP32 + 10 HC-SR04 sensors with Wokwi.
2. Running the rest of the project (database, backend, frontend) with Docker.

All commands are for **Windows PowerShell** unless stated otherwise (do not use Git Bash for `arduino-cli`).

---

## 1. How the pieces fit together

```
Wokwi (simulated ESP32 + 10 sensors)
        |  POST /api/device/readings  (header: x-api-key)
        v
Backend (Node, port 5000)  <->  Postgres
        |
        v  (live updates)
Frontend dashboard (http://localhost:8080)
```

The ESP32 reports 10 slots named `A01` to `A10`, which must exist in the `slots` table.

---

## 2. Folder structure

```
smart-parking/
├── backend/
├── frontend/
├── parking_sim/                         <- simulation project
│   ├── smart_parking_wokwi/
│   │   ├── smart_parking_wokwi.ino      <- ESP32 code (folder and file name must match)
│   │   └── build/                       <- created by the compile step
│   ├── diagram.json                     <- sensor wiring for Wokwi
│   └── wokwi.toml                       <- tells Wokwi which firmware to run
├── docker-compose.yml
├── .env
└── simulate.js                          <- optional Node simulator (no Wokwi needed)
```

---

## 3. Install the compiler (one time)

1. **Install Arduino CLI**
   - Easiest: `winget install ArduinoSA.CLI` (if winget cannot find it, use the next option).
   - Or download the `Windows_64bit.zip` from https://github.com/arduino/arduino-cli/releases, unzip it, and add the folder to your PATH.
   - Close and reopen PowerShell, then check: `arduino-cli version`

2. **Install the ESP32 board package.** Run these as two commands. The URL must be on the same line as `--additional-urls`.
   ```
   arduino-cli core update-index
   arduino-cli core install esp32:esp32 --additional-urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
   This downloads several hundred MB and takes several minutes the first time. Later compiles do not repeat it.

3. **Check it installed:** `arduino-cli core list` should show `esp32:esp32`.

4. **Install Wokwi for VS Code**
   - Install the "Wokwi for VS Code" extension.
   - Press `F1`, choose **Wokwi: Request a new License**, and sign in to a free Wokwi account.

---

## 4. Configure the sketch

Open `parking_sim/smart_parking_wokwi/smart_parking_wokwi.ino` and check the top of the file:

| Setting | Meaning |
|---|---|
| `#define USE_NGROK 0` | Use Wokwi's local gateway (`http://host.wokwi.internal:5000/...`) |
| `#define USE_NGROK 1` | Use the ngrok address in `SERVER_URL_NGROK` |
| `DEVICE_API_KEY` | Must equal `DEVICE_API_KEY` in your project `.env` |

The sketch sends `POST /api/device/readings` with this body, using the `x-api-key` header:

```json
{ "readings": [ { "slot": "A01", "status": "occupied" }, { "slot": "A02", "status": "free" } ] }
```

A distance of **15 cm or less** counts as occupied. A sensor that returns no echo is left out of the request and shows as "No signal".

---

## 5. Compile

Run this from the `parking_sim` folder (the one containing `smart_parking_wokwi/` and `diagram.json`):

```
cd "<path to>\parking_sim"
arduino-cli compile --fqbn esp32:esp32:esp32 --output-dir build smart_parking_wokwi
```

Note: with this command the `build` folder is created inside `smart_parking_wokwi/`. A successful compile ends with a "Sketch uses ... bytes" summary.

Re-run the compile every time you change the `.ino`. The simulator only runs what is in `build`.

---

## 6. Create `wokwi.toml`

Put this file in `parking_sim/`, next to `diagram.json`. The paths are relative to that folder and must match where `build` really is:

```toml
[wokwi]
version = 1
firmware = 'smart_parking_wokwi/build/smart_parking_wokwi.ino.merged.bin'
elf = 'smart_parking_wokwi/build/smart_parking_wokwi.ino.elf'
```

(If you move `build` up into `parking_sim/`, use `build/...` instead.)

---

## 7. Run the rest of the project

1. **Set up `.env`** in the project root. It needs at least:
   ```
   POSTGRES_USER=parking
   POSTGRES_PASSWORD=change_me_db
   POSTGRES_DB=parking
   JWT_SECRET=dev_secret_change_me
   DEVICE_API_KEY=change_me_device_key
   GUARD_USERNAME=guard
   GUARD_PASSWORD=guard123
   OFFLINE_AFTER_SECONDS=90
   CORS_ORIGIN=*
   ```
   Use the same `DEVICE_API_KEY` value in the sketch.

2. **Start everything** from the project root:
   ```
   docker compose up --build
   ```

3. **Database slots.** `backend/src/db/init.sql` runs only when the database volume is empty. It creates slots `A01` to `A10`. If you still see old slots (A1 to B2), reset with:
   ```
   docker compose down -v
   docker compose up --build
   ```
   Warning: `-v` deletes the database volume (users and reservations too).
   To keep your data instead, run `backend/src/db/sample-lot.sql` against the running database.

4. **Open the apps**
   - Dashboard: http://localhost:8080
   - Backend health check: http://localhost:5000/api/health (should show `{"status":"ok"}`)
   - Guard login: `/guard/login` with the `GUARD_USERNAME` and `GUARD_PASSWORD` from `.env`

---

## 8. Run the simulation

1. Make sure the backend is running (section 7).
2. Open the **`parking_sim`** folder in VS Code (File > Open Folder).
3. Press `F1` and choose **Wokwi: Start Simulator**.
4. In the Serial Monitor you should see `WiFi Connected!` and then `POST -> HTTP 200` every few seconds.
5. Click a sensor in the simulation and set its distance to 15 cm or less. The matching slot turns **occupied** on the dashboard within about 3 seconds.

Sensor to slot mapping: `ultrasonic1` to `ultrasonic4` are A01 to A04, `ultrasonic7` to `ultrasonic10` are A07 to A10. `ultrasonic6` is wired to the pins of **A05** and `ultrasonic5` to **A06**, so those two are swapped.

---

## 9. If Wokwi cannot reach the backend (ngrok fallback)

The local gateway (`host.wokwi.internal`) may need a paid Wokwi plan or extra settings. Check https://docs.wokwi.com/guides/esp32-wifi. If you see `HTTP -1`, use ngrok instead:

1. Install ngrok from https://ngrok.com, create a free account, and run `ngrok config add-authtoken <your token>` once. Keep the token private.
2. With the backend running, start the tunnel:
   ```
   ngrok http 5000
   ```
3. Copy the `https://....ngrok-free.dev` (or `.app`) address from the `Forwarding` line, or from http://127.0.0.1:4040.
4. In the sketch, set `#define USE_NGROK 1` and put the address in `SERVER_URL_NGROK`, keeping `/api/device/readings` at the end.
5. Compile again (section 5) and restart the simulator.

The ngrok address changes every time ngrok restarts on the free plan.

---

## 10. Testing without the simulator

`simulate.js` fakes the ESP32 from your PC and toggles a random slot every 3 seconds:

```
node simulate.js
```

Set the key with `$env:DEVICE_API_KEY="..."` if it differs from the one in the script. Stop it while testing with Wokwi so the two do not overwrite each other.

### Postman checks

Base URL: `http://localhost:5000`

| Request | Notes |
|---|---|
| `GET /api/health` | Expect `{"status":"ok"}` |
| `GET /api/slots` | Public slot list |
| `POST /api/device/readings` | Headers: `Content-Type: application/json`, `x-api-key: <DEVICE_API_KEY>`. Body as in section 4. |

---

## 11. Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| `arduino-cli: command not found` | You are in Git Bash. Use Windows PowerShell, or reopen it after installing. |
| `Can't open sketch: main file missing` | The `.ino` is not named exactly like its folder (`smart_parking_wokwi.ino`). |
| `flag needs an argument: --additional-urls` | The URL was on a separate line. Put it on the same line as the command. |
| Simulator runs old behavior | You changed the `.ino` but did not compile again. |
| Dashboard shows "No signal" | No successful POST in the last 90 seconds. Check the Serial Monitor and the backend logs. |
| `HTTP 401` | `DEVICE_API_KEY` in the sketch differs from the backend's. |
| `HTTP 400` or `404` | Slot names do not match the database, or the database still has the old slots. Reset it (section 7). |
| `HTTP -1` | Wokwi cannot reach the backend. Use the ngrok fallback (section 9), and check the Windows Firewall for port 5000. |
| Blank `diagram.json` view | Check the Wokwi license, reload the VS Code window, and make sure you opened the `parking_sim` folder. |
| Only ever "Sensor Error" | A sensor is not wired to the pins used in the sketch, so nothing is sent. |

.env
# ---- Database ----
POSTGRES_USER=parking
POSTGRES_PASSWORD=change_me_db
POSTGRES_DB=parking

# Long random string. Generate one with: openssl rand -hex 32
JWT_SECRET=change_me_to_a_long_random_string
# Shared secret the ESP32 sends in the x-api-key header
DEVICE_API_KEY=change_me_device_key
# Guard account, created automatically on first start if it does not exist
GUARD_USERNAME=guard
GUARD_PASSWORD=change_me_guard_password
# A slot becomes "unknown" if its ESP32 has not reported for this many seconds
OFFLINE_AFTER_SECONDS=90
CORS_ORIGIN=*
