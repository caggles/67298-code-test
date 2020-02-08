# 67298-code-test

to rollback dev:

`oc delete all -l app=code-test-<suffix>`

`oc delete all,configmap,secret -l app=code-test-<suffix>`

`oc delete all -l app=rocketchat-<suffix>`

`oc delete pvc -l statefulset=mongodb-<suffix>`
