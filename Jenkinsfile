pipeline {
    agent none
    options {
        disableResume()
    }
    stages {
        stage('Abort Previous') {
            agent { label 'abort' }
            steps {
                script {
                    def filesInThisCommitAsString = sh(script:"git diff --name-only HEAD~1..HEAD | grep -v '^.jenkins/' || echo -n ''", returnStatus: false, returnStdout: true).trim()
                    def hasChangesInPath = (filesInThisCommitAsString.length() > 0)
                    echo "${filesInThisCommitAsString}"
                    if (!currentBuild.rawBuild.getCauses()[0].toString().contains('UserIdCause') && !hasChangesInPath){
                        currentBuild.rawBuild.delete()
                        error("No changes detected in the path ('^.jenkins/')")
                    }
                }
                echo "Aborting all running jobs ..."
                script {
                    abortAllPreviousBuildInProgress(currentBuild)
                }
            }
        }
        stage('Deploy (DEV)') {
            agent { label 'deploy' }
            steps {
                echo "Deploying ..."
                sh "cd .pipeline && ./npmw ci && ./npmw run deploy -- --pr=${CHANGE_ID} --env=dev"
                echo "Testing..."
                //sh "cd .pipeline && ./npmw ci && ./npmw run test -- --pr=${CHANGE_ID} --env=dev"
            }
        }

        stage('Deploy (PROD)') {
            agent { label 'deploy' }
            when {
                expression { return env.CHANGE_TARGET == 'master';}
                beforeInput true
            }
            input {
                message "Should we continue with deployment to PROD?"
                ok "Yes!"
            }
            steps {
                echo "Backing up..."
                sh "oc project cailey-test && oc create job --from cronjob/backup-mongo-test backup-mongo-${CHANGE_ID}-${currentBuild.number}"
                echo "Deploying ..."
                sh "cd .pipeline && ./npmw ci && ./npmw run deploy -- --pr=${CHANGE_ID} --env=prod"
                echo "Testing..."
                //sh "cd .pipeline && ./npmw ci && ./npmw run test -- --pr=${CHANGE_ID} --env=prod"
            }
        }

        stage('Cleanup (DEV)') {
            agent { label 'cleanup' }
            when {
                expression { return env.CHANGE_TARGET == 'master';}
                beforeInput true
            }
            input {
                message "Should we continue with cleanup of DEV?"
                ok "Yes!"
            }
            steps {
                echo "Cleaning up..."
                sh "oc project cailey-dev"
                sh "oc delete all,configmap,secret -l app=code-test-${env}-${CHANGE_ID}"
                sh "oc delete all -l app=rocketchat-${env}-${CHANGE_ID}"
                sh "oc delete pvc -l statefulset=mongodb-${env}-${CHANGE_ID}"
            }
        }

    }
}