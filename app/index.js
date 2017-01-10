'use strict';

global.Promise = require('bluebird'); // Assign global Bluebird Promises

const IotDevice = require('./lib/IotDevice');

const iotDevice = new IotDevice();

// setup final error logging before exiting
process.on('uncaughtException', err => {
  console.error(err);
});

module.exports = iotDevice;