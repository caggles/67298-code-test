pipeline {
    agent none
    options {
        disableResume()
    }
    stages {
        stage('Build') {
            agent { label 'build' }
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
                echo "Building ..."
                //but actually there isn't anything to build, so skip this step.
                //sh "cd .pipeline && ./npmw ci && ./npmw run build -- --pr=${CHANGE_ID}"
            }
        }
        stage('Deploy (DEV)') {
            agent { label 'deploy' }
            steps {
                echo "Deploying ..."
                sh "cd .pipeline && ./npmw ci && ./npmw run deploy -- --pr=${CHANGE_ID} --env=dev"
            }
        }
        stage('Deploy (PROD)') {
            agent { label 'deploy' }
            input {
                message "Prod deploys from the master branch - have you merged your changes?"
                ok "Yes!"
            }
            when {
                expression { return env.CHANGE_TARGET == 'master';}
                beforeInput true
            }
            input {
                message "Should we continue with deployment?"
                ok "Yes!"
            }
            steps {
                echo "Deploying ..."
                sh "cd .pipeline && ./npmw ci && ./npmw run deploy -- --pr=${CHANGE_ID} --env=test"
            }
        }
    }
}