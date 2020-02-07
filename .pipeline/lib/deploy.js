'use strict';
const {OpenShiftClientX} = require('pipeline-cli')
const path = require('path');

module.exports = (settings)=>{
  const phases = settings.phases
  const options= settings.options
  const phase=options.env
  const changeId = phases[phase].changeId
  const oc=new OpenShiftClientX(Object.assign({'namespace':phases[phase].namespace}, options));
  const templatesLocalBaseUrl =oc.toFileUrl(path.resolve(__dirname, '../../openshift'))
  var objects = []

  //if the network security policy doesn't exist, make one.
  oc.createIfMissing(
    oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/nsp.yaml`, {}),
  );

  objects = objects.concat(
    oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/dc.yaml`, {
      param: {
        APPLICATION_NAME: 'rocketchat',
        HOSTNAME_HTTPS: 'cailey-rocketchat-' + phases[phase].suffix + '.pathfinder.gov.bc.ca',
        ROCKETCHAT_IMAGE_REGISTRY: 'docker.io/library/rocket.chat',
        ROCKETCHAT_IMAGE_TAG: '2.4.1',
        ROCKETCHAT_REPLICAS: 3,
        MONGODB_REPLICAS: 3,
        MONGODB_SERVICE_NAME: 'mongodb',
        MEMORY_REQUEST: '512Mi',
        MEMORY_LIMIT: '1Gi',
        CPU_REQUEST: '500m',
        CPU_LIMIT: 2,
        VOLUME_CAPACITY: '1Gi'
      },
    }),
  );


  oc.applyRecommendedLabels(objects, phases[phase].name, phase, `${changeId}`, phases[phase].instance)
  oc.importImageStreams(objects, phases[phase].tag, phases.build.namespace, phases.build.tag)
  oc.applyAndDeploy(objects, phases[phase].instance)
}
