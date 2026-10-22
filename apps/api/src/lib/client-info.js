import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Reader } from "mmdb-lib";

// Country lookups run offline against a public-domain database. Only the
// two-letter country code is kept; the IP address itself is never stored.
const require = createRequire(import.meta.url);
let reader;

function countryReader() {
  if (!reader) {
    const path = require.resolve(
      "@ip-location-db/geo-whois-asn-country-mmdb/geo-whois-asn-country.mmdb",
    );
    reader = new Reader(readFileSync(path));
  }
  return reader;
}

export function countryFromIp(ip) {
  if (!ip) return null;
  try {
    const address = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
    const code = countryReader().get(address)?.country_code;
    return typeof code === "string" && /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

// A small user-agent reading that is good enough for statistics. Order
// matters: Edge and Opera also announce themselves as Chrome.
const browsers = [
  ["Edge", /Edg(e|A|iOS)?\//],
  ["Opera", /OPR\/|Opera/],
  ["Samsung Internet", /SamsungBrowser\//],
  ["Firefox", /Firefox\/|FxiOS\//],
  ["Chrome", /Chrome\/|CriOS\//],
  ["Safari", /Safari\//],
];

export function describeUserAgent(userAgent = "") {
  const agent = String(userAgent);
  const browser = browsers.find(([, pattern]) => pattern.test(agent))?.[0] ?? null;
  let device = "DESKTOP";
  if (/iPad|Tablet|(Android(?!.*Mobile))/i.test(agent)) device = "TABLET";
  else if (/Mobi|iPhone|Android/i.test(agent)) device = "MOBILE";
  return { browser, device: agent ? device : null };
}
