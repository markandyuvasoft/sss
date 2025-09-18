// services/emailManager.js
const sendgridService = require('./emailService');
const brevoService    = require('./brevoEmailService');

const TIMEOUT_MS        = 5000;   // max wait per provider
const FAILURE_THRESHOLD = 3;      // failures before tripping circuit
const COOL_DOWN_MS      = 60_000; // 1 minute cool‑down

// Wrap a promise with a timeout
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, rej) => {
    timer = setTimeout(() => rej(new Error('Provider timeout')), ms);
  });
  return Promise.race([promise, timeout])
    .finally(() => clearTimeout(timer));
}

// Maintain per‑provider state for circuit‑breaking
const providers = [
  { name: 'sendgrid', fn: sendgridService.sendEmail, failures: 0, suspendedUntil: 0 },
  { name: 'brevo',    fn: brevoService.sendEmail,    failures: 0, suspendedUntil: 0 },
];

// Atomic round‑robin pointer
let pointer = 0;

/**
 * Picks the next *available* provider, skipping any in cool‑down.
 * If both are down, resets their state and tries again.
 */
function pickProvider() {
  const now = Date.now();

  for (let i = 0; i < providers.length; i++) {
    const idx = (pointer + i) % providers.length;
    const p   = providers[idx];
    if (now >= p.suspendedUntil) {
      // advance pointer for next call
      pointer = (idx + 1) % providers.length;
      return p;
    }
  }

  // if here, both are suspended → reset and pick first
  providers.forEach(p => {
    p.failures = 0;
    p.suspendedUntil = 0;
  });
  pointer = 1; // so next call picks index 0
  return providers[0];
}

/**
 * Send one email with retry/fallback, timeouts, circuit‑breaker.
 * @returns {Promise<boolean>} true if sent; false otherwise
 */
async function sendNotification(to, subject, message) {
  const start = Date.now();
  let provider = pickProvider();

  for (let attempt = 0; attempt < providers.length; attempt++) {
    try {
      // wrap their sendEmail in a timeout
      await withTimeout(provider.fn(to, subject, message), TIMEOUT_MS);

      // success → reset this provider’s failure count
      provider.failures = 0;
      return true;

    } catch (err) {
      // record a failure
      provider.failures++;
      console.warn(
        `[${provider.name}] attempt ${attempt + 1} failed:`,
        err.message || err
      );

      // if over threshold, suspend this provider
      if (provider.failures >= FAILURE_THRESHOLD) {
        provider.suspendedUntil = Date.now() + COOL_DOWN_MS;
        console.warn(
          `[${provider.name}] suspended until ${new Date(provider.suspendedUntil).toISOString()}`
        );
      }

      // pick next provider for fallback
      provider = pickProvider();
    }
  }

  const totalMs = Date.now() - start;
  console.error(`All providers failed after ${totalMs} ms.`);
  return false;
}

module.exports = { sendNotification };
