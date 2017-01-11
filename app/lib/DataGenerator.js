'use strict';

const defaultSensor = {
  value: 5
};

class DataGenerator {
  constructor(opts) {
    this.settings = opts.settings;
    this.sensors = opts.sensors;
    this.running = false;
    this.timer = null;
    DataGenerator.validateSensors(this.sensors);
  }

  start(transmitter) {
    this.running = true;
    this.timer = setInterval(() => {
      if (!this.running) { // just a failsafe
        clearInterval(this.timer);
        return;
      }
      const data = {};
      const sensors = this.sensors;
      const len = sensors.length - 1;
      let i = -1;
      while (i++ < len) {
        const sensor = sensors[i];
        data[`sensorId-${i + 1}`] = DataGenerator.computeSensorValue(sensor);
      }
      transmitter(data);
    }, this.settings.sleepTime);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.running = false;
  }

  static computeSensorValue(sensor) {
    if (sensor.value) {
      return sensor.value;
    }
    const values = sensor.values;
    const valuesPattern = sensor.valuesPattern;
    let index;
    let min;
    let max;
    let value;
    switch (valuesPattern) {
      case 'random':
        index = Math.floor(Math.random() * (values.length));
        value = values[index];
        break;
      case 'range':
        if (values[1] !== undefined) {
          min = Math.ceil(values[0]);
          max = Math.floor(values[1]);
          value = Math.floor(Math.random() * (max - min + 1)) + min;
        } else {
          value = values[0];
        }
        break;
      case 'seq':
      default:
        // unknown pattern, same as 'seq' for now
        if (sensor.index === undefined) {
          sensor.index = -1;
        }
        index = sensor.index;
        index = (index + 1) % values.length;
        sensor.index = index;
        value = values[index];
    }
    return value;
  }

  static validateSensors(sensors) {
    const len = sensors.length - 1;
    let i = -1;
    while (i++ < len) {
      sensors[i] = DataGenerator.validateSensor(sensors[i]);
    }
  }

  static validateSensor(sensor) {
    if (!sensor.value && !sensor.values && (sensor.values && !(sensor.values instanceof Array))) {
      return defaultSensor;
    }
    if (sensor.values && !sensor.valuesPattern) {
      return defaultSensor;
    }
    return sensor;
  }
}

module.exports = DataGenerator;
