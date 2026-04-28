'use strict';

function getValue(name, fallback) {
  const value = process.env[name];
  if (typeof value === 'undefined' || value === null || value === '') {
    if (typeof fallback !== 'undefined') {
      return fallback;
    }
    throw new Error('Environment variable "' + name + '" is not set');
  }
  return value;
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'y'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', 'n'].includes(normalized)) return false;
  throw new Error('Cannot convert value "' + value + '" to boolean');
}

function getenv(name, fallback) {
  return getValue(name, fallback);
}

getenv.string = function (name, fallback) {
  return String(getValue(name, fallback));
};

getenv.int = function (name, fallback) {
  const value = Number.parseInt(String(getValue(name, fallback)), 10);
  if (Number.isNaN(value)) {
    throw new Error('Cannot convert value to int for "' + name + '"');
  }
  return value;
};

getenv.float = function (name, fallback) {
  const value = Number.parseFloat(String(getValue(name, fallback)));
  if (Number.isNaN(value)) {
    throw new Error('Cannot convert value to float for "' + name + '"');
  }
  return value;
};

getenv.bool = function (name, fallback) {
  return toBoolean(getValue(name, fallback));
};

getenv.boolish = function (name, fallback) {
  try {
    return toBoolean(getValue(name, fallback));
  } catch {
    return Boolean(fallback);
  }
};

module.exports = getenv;
