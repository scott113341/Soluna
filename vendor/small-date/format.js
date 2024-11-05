function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var PATTERN_REGEX = /(M|y|d|D|h|H|m|s|S|G|Z|P|a)+/g;
var ESCAPE_REGEX = /\\"|"((?:\\"|[^"])*)"|(\+)/g;
var optionNames = {
  y: 'year',
  M: 'month',
  d: 'day',
  D: 'weekday',
  S: 'fractionalSecondDigits',
  G: 'era',
  Z: 'timeZoneName',
  P: 'dayPeriod',
  a: 'hour12',
  h: 'hour',
  H: 'hour',
  m: 'minute',
  s: 'second'
};
var values = {
  y: ['numeric', '2-digit', undefined, 'numeric'],
  M: ['narrow', '2-digit', 'short', 'long'],
  d: ['numeric', '2-digit'],
  D: ['narrow', 'short', 'long'],
  S: [1, 2, 3],
  G: ['narrow', 'short', 'long'],
  Z: ['short', 'long'],
  P: ['narrow', 'short', 'long'],
  a: [true],
  h: ["numeric", "2-digit"],
  H: ["numeric", "2-digit"],
  m: ["numeric", "2-digit"],
  s: ["numeric", "2-digit"]
};

function padIf(condition, value, length) {
  return condition && length === 2 && value / 10 < 1 ? '0' + value : value;
}

function formatType(date, type, length) {
  var _options;

  var _ref = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {},
      locale = _ref.locale,
      timeZone = _ref.timeZone;

  var option = optionNames[type];
  var value = values[type][length - 1];

  if (!value) {
    return;
  }

  var options = (_options = {}, _defineProperty(_options, option, value), _defineProperty(_options, "timeZone", timeZone), _options);

  if (type === 'a') {
    return Intl.DateTimeFormat(locale, _objectSpread(_objectSpread({}, options), {}, {
      hour: 'numeric'
    })).formatToParts(date).pop().value;
  }

  if (type === 'G' || type === 'Z') {
    return Intl.DateTimeFormat(locale, options).formatToParts(date).pop().value;
  }

  if (type === 'H' || type === 'h') {
    return Intl.DateTimeFormat('en-GB', _objectSpread(_objectSpread({}, options), {}, {
      hourCycle: type === "H" ? "h23" : "h11"
    })).format(date).toLocaleLowerCase().replace(" am", "").replace(" pm", "");
  }

  return padIf(['m', 's'].includes(type) && value === '2-digit', Intl.DateTimeFormat(locale, options).format(date), 2);
}

export default function format(date, pattern, config) {
  return pattern.split(ESCAPE_REGEX).filter(function (sub) {
    return sub !== undefined;
  }).map(function (sub, index) {
    // keep escaped strings as is
    if (index % 2 !== 0) {
      return sub;
    }

    return sub.replace(PATTERN_REGEX, function (match) {
      var type = match.charAt(0);
      return formatType(date, type, match.length, config) || match;
    });
  }).join('');
}