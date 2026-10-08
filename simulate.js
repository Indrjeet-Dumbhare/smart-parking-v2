const URL = process.env.API_URL || 'http://localhost:5000/api/device/readings';
const KEY = process.env.DEVICE_API_KEY || 'change_me_device_key'; // DEVICE_API_KEY the backend uses
const SLOTS = Array.from({ length: 10 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`);
const state = Object.fromEntries(SLOTS.map((s) => [s, 'free']));

async function send() {
  // flip one random slot, then report all of them (like the ESP32 heartbeat)
  const pick = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  state[pick] = state[pick] === 'free' ? 'occupied' : 'free';

  const readings = SLOTS.map((slot) => ({ slot, status: state[slot] }));
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
      body: JSON.stringify({ readings }),
    });
    const text = res.ok ? '' : '  ' + (await res.text()).slice(0, 200);
    console.log(`${pick} -> ${state[pick]} (HTTP ${res.status})${text}`);
  } catch (err) {
    console.log(`Request failed: ${err.message}`);
  }
}

send();
setInterval(send, 3000);