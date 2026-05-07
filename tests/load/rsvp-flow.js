/**
 * k6 load test — simula 200 usuários simultâneos no fluxo de RSVP.
 *
 * Rodar: k6 run tests/load/rsvp-flow.js --env BASE_URL=https://seu-projeto.up.railway.app
 * Ou localmente: k6 run tests/load/rsvp-flow.js
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const SLUG = __ENV.TEST_SLUG || "casamento-exemplo";
const PUBLIC_TOKEN = __ENV.TEST_PUBLIC_TOKEN || "dev-public-token-k";

const rsvpErrors = new Counter("rsvp_errors");
const landingDuration = new Trend("landing_duration");
const rsvpDuration = new Trend("rsvp_duration");

export const options = {
  scenarios: {
    rsvp_spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },   // ramp up
        { duration: "1m", target: 200 },    // peak
        { duration: "30s", target: 0 },     // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000"],     // 95% of requests under 2s
    http_req_failed: ["rate<0.01"],        // less than 1% errors
    rsvp_errors: ["count<10"],             // less than 10 RSVP-specific errors
  },
};

export default function rsvpScenario() {
  const userId = Math.random().toString(36).slice(2, 10);

  // 1. Load landing page
  const landingRes = http.get(`${BASE_URL}/${SLUG}?k=${PUBLIC_TOKEN}`);
  landingDuration.add(landingRes.timings.duration);
  check(landingRes, {
    "landing page 200": (r) => r.status === 200,
    "landing page < 2s": (r) => r.timings.duration < 2000,
  });

  sleep(1);

  // 2. Load RSVP page
  const rsvpPageRes = http.get(`${BASE_URL}/${SLUG}/rsvp`);
  check(rsvpPageRes, {
    "rsvp page 200": (r) => r.status === 200,
  });

  sleep(0.5);

  // 3. Submit RSVP (POST via form action)
  const rsvpPayload = {
    slug: SLUG,
    name: `Convidado Load Test ${userId}`,
    emailAddr: `load-test-${userId}@example.com`,
    phone: "11999999999",
    plusOnes: "0",
    rsvpStatus: "CONFIRMED",
    consentTerms: "on",
  };

  const rsvpRes = http.post(`${BASE_URL}/${SLUG}/rsvp`, rsvpPayload, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  rsvpDuration.add(rsvpRes.timings.duration);

  const rsvpOk = check(rsvpRes, {
    "rsvp response not 500": (r) => r.status !== 500,
    "rsvp response < 3s": (r) => r.timings.duration < 3000,
  });

  if (!rsvpOk) rsvpErrors.add(1);

  // 4. Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    "health ok": (r) => r.status === 200,
  });

  sleep(2);
}
