# 67298-code-test

This is Cailey Jones' submission for IS27 – Platform Administrator position

You can find a working example at https://cailey-rocketchat-test.pathfinder.gov.bc.ca

## Part 1 - Application Deployment

This repo contains the required code to deploy, test and rollback a highly available rocketchat application.

It is built assuming the existence of 3 openshift namespaces:
 * cailey-tools
 * cailey-dev
 * cailey-test
 
In this case, the cailey-test environment serves as our production release. There isn't a cailey-prod namespace.

The deployment results in the creation of the following objects:
 * a network security policy
 * a backup cronjob for mongodb
 * a backup job to backup the database before performing a release into the cailey-test namespace
 * services and routes for both mongodb and rocketchat
 * secrets required for mongodb
 * a configmap that is required for rocketchat
 * 3 pods in a replica set for a highly available mongodb
 * 3 pods in a deployment for a highly available rocketchat application
 
Additionally, the deployment scripts perform the following actions:
 * ensures that the user is connected to the appropriate namespace
 * tests at the end of each deployment to ensure that the rocketchat instance is accessible
 * cleans up after itself, if necessary
 
These steps are followed in both a set of ansible playbooks (found in the ansible folder) and in a jenkins pipeline (found in the .pipeline folder).

### Ansible

In order to run the ansible deployment, all you need to do is go into vars.yaml in the ansible folder and make sure that the environment is correct. 
Then, issue an oc login command to make sure that you're logged into the openshift platform.

Once you've done that, run `ansible-playbook ansible/deploy.yaml` to deploy the application. 
The initial deployment will see one of the actions fail - this is expected behaviour, since it's just the playbook attempting to delete any previous backup jobs, which obviously don't exist yet.
The deployment will test to see if it can connect to the rocketchat API at the end.

If you wish to test your deployment again (without redeploying), use `ansible-playbook ansible/test.yaml`

Because the rocketchat deployment is rolling, it will normally not require a rollback if the deployment fails - the previous working instance will simply remain running instead.
However, if that doesn't happen (or if your deployment succeeds but there is another problem with the application), use `ansible-playbook ansible/rollback.yaml` to revert to a previous deployment.
This will perform the test again to ensure that rocketchat is accessible once it's finished.

### Jenkins

In order to install jenkins, follow the directions outline in the readme in the .jenkins folder. There is currently a jenkins instance running in cailey-tools. 
To deploy via Jenkins, push a new branch to this github repository and create a pull request. The pull request will trigger a new deployment.

## Part 2 - Operational Plan Development

There is a backup script baked into the deployment. It operates as a cronjob that runs every day.
There is also an additional job that is created just before the production deployment which backs up the database as well.
Currently, the backup plan that is written in-code is not tested and there is no coded recovery. This is something to add before the backup can be considered complete.

The aim of the backup plan is to ensure that, in the event of the corruption or loss of data, we will be able to recover as much of that data as possible with as little user disruption as possible.

Ideally, a backup plan will result in no data loss and no interruption for users. While not always possible, this is the goal.

The backup plan currently looks like this:
* Backups are taken once a day, every day.
* An additional backup is taken at high-risk times (such as during deployments and upgrades)
* The backup pod is spun up, a mongodump command is issued, and the result is stored on a netapp volume.
* Should the backup be required, an administrator will need to copy the most recent backup to a volume on the master mongodb instance, and then run the following command:
`mongorestore -u admin -p <mongodb-admin-password> --authenticationDatabase admin --gzip /var/lib/mongodb-backup/dump-YYYY-MM-DD-HH:MM:SS/rocketchat -d rocketchat`

Ideally the backup plan will be extended to include the following:
* Backups taken more often - test to determine the stress put on the rocketchat instance during backups and, based on the results, schedule additional backups during the day.
* Testing the backup - create a second cronjob that will spin up with an empty mongodb instance and restore from the backup to ensure the process runs smoothly.
* Errors in either backup or test should be reported through webhooks to ensure someone can check on what happened (maybe our current rocketchat instance?)
* A fully coded option for restoring the backup (possibly alongside any other rollback task that might be taken).
* Sending the backups to a volume that has backup, or creating copies of the backups off-site (maybe in an object store)

Currently, the backup runs once a day and keeps 7 days of backups.
I chose to run the backups once per day as I have no tested any performance problems that might result from running a backup during heavy use times. 
We have recently encountered some serious problems with rocketchat performance at chat.pathfinder.gov.bc.ca that appear to result from heavy queries, 
and I would not be comfortable scheduling a backup during heavy use periods as a result until I have done further research into the performance implications.I
I have chosen to keep 7 days worth of backups because rocketchat is a application whose use is regular and instant - if there was problematic corruption or an outage, it would be noticed almost immediately, 
which means that it's likely at least 6 out of the 7 backups would not bear the problem, whatever it may be. The risk that comes of keeping only 7 days worth of backups is minimal as a result.
Keeping more copies wouldn't be worth the space.


