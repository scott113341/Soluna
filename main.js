// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: magic;

const SunCalc = importModule("modules/suncalc.js");

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

// Create widget
const widget = new ListWidget();
const monoFont = new Font("CourierNewPS-BoldMT", 18);

const stack = widget.addStack();
stack.layoutVertically();

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

  const sunriseAsIfToday = new Date(yesterdaySunMoonInfo.sunrise);
  sunriseAsIfToday.setDate(sunriseAsIfToday.getDate() + 1);
  const sunriseDeltaMs = sunMoonInfo.sunrise - sunriseAsIfToday;
  const sunriseDeltaStr = lengthMsToDeltaStr(sunriseDeltaMs);

  const sunsetAsIfToday = new Date(yesterdaySunMoonInfo.sunset);
  sunsetAsIfToday.setDate(sunsetAsIfToday.getDate() + 1);
  const sunsetDeltaMs = sunMoonInfo.sunset - sunsetAsIfToday;
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

async function log(message) {
  console.log(message);

  try {
    const req = new Request("http://192.168.2.3:3000/logs");
    req.method = "POST";
    req.body = JSON.stringify(message);
    await req.loadString();
  } catch (e) {
    console.error(e);
  }
}

// https://github.com/robinweser/small-date/blob/6224f7d99fa6b57783859744e9cd242b82a33e27/src/format.js
function format(date, pattern, config) {
  const PATTERN_REGEX = /(M|y|d|D|h|H|m|s|S|G|Z|P|a)+/g;
  const ESCAPE_REGEX = /\\"|"((?:\\"|[^"])*)"|(\+)/g;

  const optionNames = {
    y: "year",
    M: "month",
    d: "day",
    D: "weekday",
    S: "fractionalSecondDigits",
    G: "era",
    Z: "timeZoneName",
    P: "dayPeriod",
    a: "hour12",
    h: "hour",
    H: "hour",
    m: "minute",
    s: "second",
  };

  const values = {
    y: ["numeric", "2-digit", undefined, "numeric"],
    M: ["narrow", "2-digit", "short", "long"],
    d: ["numeric", "2-digit"],
    D: ["narrow", "short", "long"],
    S: [1, 2, 3],
    G: ["narrow", "short", "long"],
    Z: ["short", "long"],
    P: ["narrow", "short", "long"],
    a: [true],
    h: ["numeric", "2-digit"],
    H: ["numeric", "2-digit"],
    m: ["numeric", "2-digit"],
    s: ["numeric", "2-digit"],
  };

  function padIf(condition, value, length) {
    return condition && length === 2 && value / 10 < 1 ? "0" + value : value;
  }

  function formatType(date, type, length, { locale, timeZone } = {}) {
    const option = optionNames[type];
    const value = values[type][length - 1];

    if (!value) {
      return;
    }

    const options = {
      [option]: value,
      timeZone,
    };

    if (type === "a") {
      return Intl.DateTimeFormat(locale, {
        ...options,
        hour: "numeric",
      })
        .formatToParts(date)
        .pop().value;
    }

    if (type === "G" || type === "Z") {
      return Intl.DateTimeFormat(locale, options).formatToParts(date).pop()
        .value;
    }

    if (type === "H" || type === "h") {
      return Intl.DateTimeFormat("en-GB", {
        ...options,
        hourCycle: type === "H" ? "h23" : "h11",
      })
        .format(date)
        .toLocaleLowerCase()
        .replace(" am", "")
        .replace(" pm", "");
    }

    return padIf(
      ["m", "s"].includes(type) && value === "2-digit",
      Intl.DateTimeFormat(locale, options).format(date),
      2,
    );
  }

  return pattern
    .split(ESCAPE_REGEX)
    .filter((sub) => sub !== undefined)
    .map((sub, index) => {
      // keep escaped strings as is
      if (index % 2 !== 0) {
        return sub;
      }

      return sub.replace(PATTERN_REGEX, (match) => {
        const type = match.charAt(0);
        return formatType(date, type, match.length, config) || match;
      });
    })
    .join("");
}
