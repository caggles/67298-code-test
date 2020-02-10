'use strict';
const settings = require('./lib/config.js')
const task = require('./lib/test.js')

task(Object.assign(settings, { phase: settings.options.env}));