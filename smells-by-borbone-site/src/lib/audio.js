// Order-ready chime (Web Audio, no asset). Browsers only allow audio after a
// user gesture, so primeAudio() is called on taps to "unlock" it for later.
let sbAudioCtx = null;
let sbAlarmGain = null; // master gain all alert tones pass through, so it can be muted
export function primeAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!sbAudioCtx) sbAudioCtx = new AC();
    if (sbAudioCtx.state === "suspended") sbAudioCtx.resume();
  } catch {
    /* ignore */
  }
}
// The shared output node, re-opened to full volume each time an alert starts.
function alarmOutput() {
  if (!sbAudioCtx) return null;
  if (!sbAlarmGain) {
    sbAlarmGain = sbAudioCtx.createGain();
    sbAlarmGain.connect(sbAudioCtx.destination);
  }
  sbAlarmGain.gain.cancelScheduledValues(sbAudioCtx.currentTime);
  sbAlarmGain.gain.setValueAtTime(1, sbAudioCtx.currentTime);
  return sbAlarmGain;
}
// Schedule one two-note chime at absolute time `base`.
function scheduleChime(base) {
  const ctx = sbAudioCtx;
  const out = alarmOutput();
  if (!ctx || !out) return;
  [
    [880, 0],
    [1174.66, 0.16],
  ].forEach(([freq, t]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, base + t);
    gain.gain.exponentialRampToValueAtTime(0.35, base + t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, base + t + 0.45);
    osc.connect(gain).connect(out);
    osc.start(base + t);
    osc.stop(base + t + 0.5);
  });
}
export function playChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!sbAudioCtx) sbAudioCtx = new AC();
    if (sbAudioCtx.state === "suspended") sbAudioCtx.resume();
    scheduleChime(sbAudioCtx.currentTime);
  } catch {
    /* ignore */
  }
}
// Repeat the chime for ~durationMs — the sustained "order ready" alert. On iOS,
// where the web Vibration API isn't available, this IS the 10-second alert.
export function playAlarm(durationMs = 10000) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!sbAudioCtx) sbAudioCtx = new AC();
    if (sbAudioCtx.state === "suspended") sbAudioCtx.resume();
    const start = sbAudioCtx.currentTime;
    const reps = Math.max(1, Math.ceil(durationMs / 1000)); // one chime per second
    for (let i = 0; i < reps; i++) scheduleChime(start + i);
  } catch {
    /* ignore */
  }
}
// Cut the alert short (e.g. when the customer taps the banner to dismiss it).
export function stopAlarm() {
  try {
    if (sbAlarmGain && sbAudioCtx) {
      sbAlarmGain.gain.cancelScheduledValues(sbAudioCtx.currentTime);
      sbAlarmGain.gain.setValueAtTime(0.0001, sbAudioCtx.currentTime);
    }
  } catch {
    /* ignore */
  }
}
// iOS Safari has no Vibration API, so the alert there relies on the repeating
// sound + on-screen banner. (iPadOS 13+ reports as "Mac" with touch points.)
export function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
}

// Buzz the phone for ~10 seconds when the order is ready. A pulsing pattern
// (buzz / short pause) is more noticeable than one long buzz and less likely to
// be capped by the browser. Only Android supports the Vibration API — iOS
// Safari ignores it, so this is a no-op there (the chime + banner still fire).
export function vibrateAlert() {
  try {
    if (!("vibrate" in navigator)) return;
    const pattern = [];
    for (let i = 0; i < 10; i++) pattern.push(800, 200); // 10 × (800ms buzz + 200ms gap) = 10s
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
