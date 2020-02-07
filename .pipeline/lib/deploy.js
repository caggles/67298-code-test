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
    oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/nsp.yaml`, {
      param: {
        NAMESPACE: 'cailey-' + phase
      }
    }),
  );

  //todo: run a backup on the database before proceeding.

  //make the mongodb replica set first.
  objects = objects.concat(
    oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/dc-mongo.yaml`, {
      param: {
        APPLICATION_NAME: 'rocketchat' + phases[phase].suffix,
        HOSTNAME_HTTPS: 'cailey-rocketchat' + phases[phase].suffix + '.pathfinder.gov.bc.ca',
        MONGODB_REPLICAS: 3,
        MONGODB_SERVICE_NAME: 'mongodb' + phases[phase].suffix,
        MONGODB_SECRET_NAME: 'mongodb' + phases[phase].suffix,
        MONGODB_NAME: 'rocketdb' + phases[phase].suffix,
        MONGODB_REPLICA_NAME: 'rs0' + phases[phase].suffix,
        MONGODB_IMAGE: 'docker-registry.default.svc:5000/openshift/mongodb',
        MONGODB_TAG: '3.6',
        MONGODB_STORAGE_CLASS: 'netapp-file-standard',
        MEMORY_LIMIT: '1Gi',
        VOLUME_CAPACITY: '1Gi'
      },
    }),
  );

  //now deploy rocketchat
  objects = objects.concat(
    oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/dc-rocketchat.yaml`, {
      param: {
        APPLICATION_NAME: 'rocketchat' + phases[phase].suffix,
        HOSTNAME_HTTPS: 'cailey-rocketchat' + phases[phase].suffix + '.pathfinder.gov.bc.ca',
        ROCKETCHAT_IMAGE_REGISTRY: 'docker.io/library/rocket.chat',
        ROCKETCHAT_IMAGE_TAG: '2.2.0',
        ROCKETCHAT_REPLICAS: '3',
        MONGODB_SECRET_NAME: 'mongodb' + phases[phase].suffix,
        MEMORY_REQUEST: '512Mi',
        MEMORY_LIMIT: '1Gi',
        CPU_REQUEST: '500m',
        CPU_LIMIT: 2
      },
    }),
  );

  //todo: now deploy the backup container

  oc.applyRecommendedLabels(objects, phases[phase].name, phase, `${changeId}`, phases[phase].instance)
  oc.importImageStreams(objects, phases[phase].tag, phases.build.namespace, phases.build.tag)
  oc.applyAndDeploy(objects, phases[phase].instance)
}
