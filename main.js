// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: magic;

const SunCalc = importModule("vendor/sun-calc.js");
const SmallDate = importModule("vendor/small-date.js");

const NOW = new Date();

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

// Find current "percent progress" betweeen yearly daylight min/max
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
  `Refreshed ${SmallDate.format(new Date(), "HH:mm MMM d")} in ${locationStr}`,
);
refreshText.font = Font.systemFont(12);

widget.presentMedium();
Script.setWidget(widget);
Script.complete();

/////////////////
// GEOLOCATION //
/////////////////

async function getLocationInfo() {
  Location.setAccuracyToThreeKilometers();
  const { latitude, longitude } = await Location.current();
  const locations = await Location.reverseGeocode(latitude, longitude);
  const location = locations[0];
  const locationStr = location
    ? `${location.locality}, ${location.administrativeArea}`
    : "Unknown";

  return { latitude, longitude, location, locationStr };
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
    moonEmoji: mp.phase.emoji,
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
  return SmallDate.format(new Date(lengthMs), `HH"h" mm"m"`, {
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
    SmallDate.format(new Date(lengthMs), `m"m" ss"s"`, {
      timeZone: "Etc/Utc",
    })
  );
}

async function log(message) {
  console.log(message);

  try {
    const req = new Request("http://192.168.2.14:3000/logs");
    req.method = "POST";
    req.body = JSON.stringify(message);
    await req.loadString();
  } catch (e) {
    console.error(e);
  }
}
