import SunCalc from "suncalc3";
import { format } from "small-date";

///////////////
// CONSTANTS //
///////////////

const NOW = new Date();

const DEVELOPMENT = process.env.NODE_ENV === "development";
const PRODUCTION = process.env.NODE_ENV === "production";

const LOCAL_FILE_MANAGER = FileManager.local();
const CACHE_DIR = LOCAL_FILE_MANAGER.cacheDirectory();

const LOCATION_TIMEOUT_MS = 5000;
const LOCATION_CACHE_FILE_PATH = CACHE_DIR + "/soluna.location.json";
const LOCATION_CACHE_VERSION = 1;

////////////////////////////
// GET AND CALCULATE INFO //
////////////////////////////

// Get info for today
const { latitude, longitude, locationStr } = await getLocationInfo();
const sunMoonInfo = getSunMoonInfo(NOW, latitude, longitude);

// Get info for yesterday
const yesterday = new Date(NOW);
yesterday.setDate(NOW.getDate() - 1);
const yesterdaySunMoonInfo = getSunMoonInfo(yesterday, latitude, longitude);

// Calculate deltas between today/yesterday
const { dayDeltaMsStr, sunriseDeltaStr, sunsetDeltaStr } = getDeltas(
  sunMoonInfo,
  yesterdaySunMoonInfo,
);

// Get yearly daylight min/max
const { minMs, minStr, maxMs, maxStr } = getYearlyDaylightInfo();

// Find current "percent progress" between yearly daylight min/max
const percentProgress = (sunMoonInfo.dayLengthMs - minMs) / (maxMs - minMs);
const percentProgressStr =
  (percentProgress * 100).toPrecision(3).toString() + "%";

////////////
// LAYOUT //
////////////

const widget = new ListWidget();
const stack = widget.addStack();
stack.layoutVertically();
const monoFont = new Font("CourierNewPS-BoldMT", 18);

[
  stack.addText(`Daytime: ${sunMoonInfo.dayLengthStr} (${dayDeltaMsStr})`),
  stack.addText(`Sunrise: ${sunMoonInfo.sunriseStr}   (${sunriseDeltaStr})`),
  stack.addText(`Sunset:  ${sunMoonInfo.sunsetStr}   (${sunsetDeltaStr})`),
].forEach((text) => (text.font = monoFont));

stack.addSpacer(8);

const minMaxProgressText = stack.addText(
  `${minStr} - ${maxStr} (${percentProgressStr})`,
);
minMaxProgressText.font = Font.systemFont(14);

const moonData = [
  sunMoonInfo.moonEmoji,
  sunMoonInfo.moonPhase,
  `↑${sunMoonInfo.moonriseStr}`,
  `↓${sunMoonInfo.moonsetStr}`,
  `(${Math.round(sunMoonInfo.moonFraction * 100)}%)`,
];
const moonText = stack.addText(moonData.join(" "));
moonText.font = Font.systemFont(14);

stack.addSpacer(8);

const refreshText = stack.addText(
  `Refreshed ${format(new Date(), "HH:mm MMM d")} in ${locationStr}`,
);
refreshText.font = Font.systemFont(12);
if (DEVELOPMENT) {
  refreshText.textColor = new Color("#ff0000", 100);
}

///////////////////
// WIDGET CONFIG //
///////////////////

widget.presentMedium();
Script.setWidget(widget);
Script.complete();

/////////////////
// GEOLOCATION //
/////////////////

async function getLocationInfo() {
  // Try looking up location info normally, but race with a timeout
  let locationInfo = await Promise.race([
    lookupLocationInfo(),
    delay(LOCATION_TIMEOUT_MS),
  ]);

  // Get location from cache if timeout was reached
  if (!locationInfo) {
    log(`Fell back to cached location after ${LOCATION_TIMEOUT_MS}ms`);
    locationInfo = getCachedLocationInfo();

    // Just try a real lookup again if cache didn't return anything
    if (!locationInfo) {
      log("Trying a lookup again");
      locationInfo = await lookupLocationInfo();
    }
  }

  return locationInfo;
}

// Does an actual location lookup using the Scriptable/iOS geolocation API
async function lookupLocationInfo() {
  Location.setAccuracyToThreeKilometers();
  const { latitude, longitude } = await Location.current();
  const locations = await Location.reverseGeocode(latitude, longitude);
  const location = locations[0];
  const locationStr = location
    ? `${location.locality}, ${location.administrativeArea}`
    : "Unknown";

  const locationInfo = { latitude, longitude, location, locationStr };
  cacheLocationInfo(locationInfo);

  return locationInfo;
}

function getCachedLocationInfo() {
  try {
    const locationInfo = JSON.parse(
      LOCAL_FILE_MANAGER.readString(LOCATION_CACHE_FILE_PATH),
    );

    log({ locationInfo, LOCATION_CACHE_VERSION });

    if (locationInfo.version !== LOCATION_CACHE_VERSION) {
      throw new Error(
        `Cached location version is ${locationInfo.version}; expected ${LOCATION_CACHE_VERSION}`,
      );
    } else {
      return locationInfo;
    }
  } catch (e) {
    log(`Error reading cached location: ${e.message}`);
  }

  return null;
}

function cacheLocationInfo(locationInfo) {
  LOCAL_FILE_MANAGER.writeString(
    LOCATION_CACHE_FILE_PATH,
    JSON.stringify({
      version: LOCATION_CACHE_VERSION,
      cachedAt: NOW,
      ...locationInfo,
    }),
  );
}

//////////////////
// CALCULATIONS //
//////////////////

function getSunMoonInfo(date, lat, lng) {
  // Time padding
  const p = (num) => num.toString().padStart(2, "0");

  // Sun
  const st = SunCalc.getSunTimes(date, lat, lng);
  const sunrise = st.sunriseStart.value;
  const sunset = st.sunsetEnd.value;
  const sunriseStr = p(sunrise.getHours()) + ":" + p(sunrise.getMinutes());
  const sunsetStr = p(sunset.getHours()) + ":" + p(sunset.getMinutes());

  // Day length
  const dayLengthMs = sunset - sunrise;
  const dayLengthStr = lengthMsToHHMM(dayLengthMs);

  // Moon times
  const mt = SunCalc.getMoonTimes(date, lat, lng, false);
  const moonriseStr = p(mt.rise.getHours()) + ":" + p(mt.rise.getMinutes());
  const moonsetStr = p(mt.set.getHours()) + ":" + p(mt.set.getMinutes());

  // Moon phase
  const mp = SunCalc.getMoonIllumination(date.valueOf());

  // Switch moon emojis to non-face ones
  let moonEmoji = mp.phase.emoji;
  if (moonEmoji === "🌚") moonEmoji = "🌑";
  if (moonEmoji === "🌝") moonEmoji = "🌕";

  return {
    sunrise,
    sunriseStr,
    sunset,
    sunsetStr,
    dayLengthMs,
    dayLengthStr,
    moonrise: mt.rise,
    moonriseStr,
    moonset: mt.set,
    moonsetStr,
    moonFraction: mp.fraction,
    moonPhase: mp.phase.name,
    moonEmoji,
  };
}

function getDeltas(sunMoonInfo, yesterdaySunMoonInfo) {
  const dayDeltaMs = sunMoonInfo.dayLengthMs - yesterdaySunMoonInfo.dayLengthMs;
  const dayDeltaMsStr = lengthMsToDeltaStr(dayDeltaMs);

  function delta(today, yesterday) {
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);
    const todayMsSinceMidnight = today - todayMidnight;

    const yesterdayMidnight = new Date(yesterday);
    yesterdayMidnight.setHours(0, 0, 0, 0);
    const yesterdayMsSinceMidnight = yesterday - yesterdayMidnight;

    return todayMsSinceMidnight - yesterdayMsSinceMidnight;
  }

  const sunriseDeltaMs = delta(
    sunMoonInfo.sunrise,
    yesterdaySunMoonInfo.sunrise,
  );
  const sunriseDeltaStr = lengthMsToDeltaStr(sunriseDeltaMs);

  const sunsetDeltaMs = delta(sunMoonInfo.sunset, yesterdaySunMoonInfo.sunset);
  const sunsetDeltaStr = lengthMsToDeltaStr(sunsetDeltaMs);

  return {
    dayDeltaMs,
    dayDeltaMsStr,
    sunriseDeltaMs,
    sunriseDeltaStr,
    sunsetDeltaMs,
    sunsetDeltaStr,
  };
}

function getYearlyDaylightInfo() {
  // Find min/max daylight
  let minMs = Infinity;
  let maxMs = -Infinity;

  for (let i = -1; i < 370; i++) {
    const date = new Date(NOW);
    date.setDate(NOW.getDate() + i);
    const info = getSunMoonInfo(date, latitude, longitude);
    if (info.dayLengthMs < minMs) {
      minMs = info.dayLengthMs;
    }
    if (info.dayLengthMs > maxMs) {
      maxMs = info.dayLengthMs;
    }
  }

  return {
    minMs,
    minStr: lengthMsToHHMM(minMs),
    maxMs,
    maxStr: lengthMsToHHMM(maxMs),
  };
}

//////////
// UTIL //
//////////

function lengthMsToHHMM(lengthMs) {
  return format(new Date(lengthMs), `HH"h" mm"m"`, {
    timeZone: "Etc/Utc",
  });
}

function lengthMsToDeltaStr(lengthMs) {
  const negative = lengthMs < 0;
  const sign = negative ? "-" : "+";

  if (negative) {
    lengthMs = lengthMs * -1;
  }

  return (
    sign +
    format(new Date(lengthMs), `m"m" ss"s"`, {
      timeZone: "Etc/Utc",
    })
  );
}

// Note that there is no setTimeout in this environment
async function delay(ms) {
  return new Promise((resolve) => Timer.schedule(ms, false, resolve));
}

async function log(message) {
  console.log(message);

  if (DEVELOPMENT && process.env.LOG_URL) {
    try {
      const req = new Request(process.env.LOG_URL);
      req.method = "POST";
      req.body = JSON.stringify(message);
      await req.loadString();
    } catch (_e) {}
  }
}
