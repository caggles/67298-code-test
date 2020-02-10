'use strict';
const {OpenShiftClientX} = require('pipeline-cli');
const path = require('path');
const axios = require('axios')

module.exports = (settings)=>{
  const phases = settings.phases;
  const options= settings.options;
  const phase=options.env;
  const changeId = phases[phase].changeId;
  const oc=new OpenShiftClientX(Object.assign({'namespace':phases[phase].namespace}, options));
  let objects = [];
  const instance = axios.create({
      baseURL: 'https://cailey-rocketchat' + phases[phase].suffix + '.pathfinder.gov.bc.ca/',
      timeout: 1000
  });

  let result = instance.get('api/info')
  console.log(result)


}
