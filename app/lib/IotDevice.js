'use strict';

const request = require('request');
const io = require('socket.io-client');

const DataGenerator = require('./DataGenerator');
const config = require('../config.json');
const serverUrl = config.server.serverUrl;
const loginUrl = config.server.loginUrl;
const ownerId = config.ownerInformation.ownerId;
const devicesPath = config.server.devicesPath;

class IotDevice {
  constructor() {
    this.req = request.defaults({
      baseUrl: serverUrl,
      json: true,
      encoding: 'utf8',
      gzip: true
    });
    this.connectionPath = `${serverUrl}${devicesPath}`;
    this.socket = null;
    this.loginRetryInterval = 5000;
    this.reconnectInterval = 5000;
    this.deviceId = this.generateDeviceId();
    this.dataGeneratorEnabled = config.dataGenerator.enabled;
    if (this.dataGeneratorEnabled) {
      this.dataGenerator = new DataGenerator(config.dataGenerator.opts);
    }
    this.connectSocket();
  }

  connectSocket() {
    this.login()
      .then((token) => {
        console.info('Logged in and received token');
        if (!this.socket) {
          this.socket = io(this.connectionPath, { query: `token=${token}` });
          this.setupSocket();
        } else {
          this.socket.io.opts.query = `token=${token}`;
          this.socket.connect();
        }
      });
  }

  login() {
    const deviceId = this.deviceId;
    return new Promise((resolve) => {
      this.req.post(loginUrl, { form: { ownerId, deviceId } }, (err, response, body) => {
        if (err || response.statusCode !== 200) {
          console.error(err || 'Login failed...');
          setTimeout(() => {
            resolve(this.login());
          }, this.loginRetryInterval);
          return;
        }
        const token = body.token;
        resolve(token);
      });
    });
  }

  setupSocket() {
    const socket = this.socket;
    const deviceId = this.deviceId;
    socket.on('connect', () => {
      console.info('Device connected to hub.');
      if (this.dataGeneratorEnabled) {
        this.dataGenerator.start((data) => {
          console.info('Sending data to hub:', data);
          socket.emit('data', {
            deviceId,
            data
          });
        });
      }
    });
    socket.on('disconnect', () => {
      console.error('Device disconnected from hub.');
      if (this.dataGeneratorEnabled) {
        this.dataGenerator.stop();
      }
      setTimeout(() => this.connectSocket(), this.reconnectInterval);
    });
  }

  generateDeviceId() {
    const getRandomInt = (min, max) => {
      const minC = Math.ceil(min);
      const maxF = Math.floor(max);
      return Math.floor(Math.random() * (maxF - minC)) + minC;
    };
    return process.env.deviceId || `deviceId-${getRandomInt(7, 8)}`;
  }
}

module.exports = IotDevice;
