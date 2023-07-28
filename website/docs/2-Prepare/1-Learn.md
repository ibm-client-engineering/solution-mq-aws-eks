---
id: learn
sidebar_position: 1
title: Learn
---

### Installation

Add the helm chart to your repo
```
helm repo add ibm-messaging-mq https://ibm-client-engineering.github.io/mq-helm-eks/
"mq-helm-eks" has been added to your repositories
```

Show all the charts in that repo

```
helm show chart mq-helm-eks/ibm-mq

apiVersion: v2
appVersion: 9.3.1.0
description: IBM MQ queue manager
icon: https://raw.githubusercontent.com/IBM/charts/master/logo/ibm-mq-blue-icon.png
keywords:
- IBM MQ
- MQ
- amd64
- message queue
- Integration
kubeVersion: '>=1.18.0-0'
name: ibm-mq
type: application
version: 4.0.0
```

Create the following yamls

`mtlsqm.yaml`

```
kind: ConfigMap
apiVersion: v1
metadata:
  name: helmsecure
  namespace: mq-eks
data:
  mq.mqsc: |-
    DEFINE QLOCAL('APPQ') DEFPSIST(YES)
    DEFINE CHANNEL(MTLSQMCHL) CHLTYPE(SVRCONN) TRPTYPE(TCP) SSLCAUTH(REQUIRED) SSLCIPH('ANY_TLS12_OR_HIGHER')
    ALTER AUTHINFO(SYSTEM.DEFAULT.AUTHINFO.IDPWOS) AUTHTYPE(IDPWOS) ADOPTCTX(YES) CHCKCLNT(OPTIONAL) CHCKLOCL(OPTIONAL) AUTHENMD(OS)
    SET CHLAUTH('MTLSQMCHL') TYPE(SSLPEERMAP) SSLPEER('CN=application1,OU=app team1') USERSRC(MAP) MCAUSER('app1') ACTION(ADD)
    REFRESH SECURITY TYPE(CONNAUTH)
    SET AUTHREC PRINCIPAL('app1') OBJTYPE(QMGR) AUTHADD(CONNECT,INQ)
    SET AUTHREC PROFILE('APPQ') PRINCIPAL('app1') OBJTYPE(QUEUE) AUTHADD(BROWSE,DSP,GET,INQ,PUT)
    SET AUTHREC PROFILE('SYSTEM.ADMIN.COMMAND.QUEUE') OBJTYPE(QUEUE) PRINCIPAL('app1') AUTHADD(DSP, INQ, PUT)
    SET AUTHREC PROFILE('SYSTEM.MQEXPLORER.REPLY.MODEL') OBJTYPE(QUEUE) PRINCIPAL('app1') AUTHADD(DSP, INQ, GET, PUT)
    SET AUTHREC PROFILE('**') OBJTYPE(AUTHINFO) PRINCIPAL('app1') AUTHADD(ALLADM, CRT)
    SET AUTHREC PROFILE('**') OBJTYPE(CHANNEL) PRINCIPAL('app1') AUTHADD(ALLADM, CRT)
    SET AUTHREC PROFILE('**') OBJTYPE(CLNTCONN) PRINCIPAL('app1') AUTHADD(ALLADM, CRT)
    SET AUTHREC PROFILE('**') OBJTYPE(COMMINFO) PRINCIPAL('app1') AUTHADD(ALLADM, CRT)
    SET AUTHREC PROFILE('**') OBJTYPE(LISTENER) PRINCIPAL('app1') AUTHADD(ALLADM, CRT)
    SET AUTHREC PROFILE('**') OBJTYPE(NAMELIST) PRINCIPAL('app1') AUTHADD(ALLADM, CRT)
    SET AUTHREC PROFILE('**') OBJTYPE(PROCESS) PRINCIPAL('app1') AUTHADD(ALLADM, CRT)
    SET AUTHREC OBJTYPE(QMGR) PRINCIPAL('app1') AUTHADD(ALLADM, CONNECT, INQ)
    SET AUTHREC PROFILE('**') OBJTYPE(SERVICE) PRINCIPAL('app1') AUTHADD(ALLADM, CRT)
    SET AUTHREC PROFILE('**') OBJTYPE(TOPIC) PRINCIPAL('app1') AUTHADD(ALLADM, CRT, ALLMQI)
  mq.ini: |-
    Service:
      Name=AuthorizationService
      EntryPoints=14
      SecurityPolicy=UserExternal
---
kind: Secret
apiVersion: v1
metadata:
  name: helmsecure
  namespace: mq-eks
data:
  tls.key: LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRRGJpMHAwNEhRM2NCWEoKNisvZTFiZFBmcXdZMGlZTVRBMVVyYXJhd1VmaVBkZy9hVXJsYmxHUFpiVGRxbDZJNGx0SVVMbkdvcEFJRTNHZQpFSjdaZmg4Y09MNVNOVUlSUC9IQUFzK3gybnVCdldqZ1J5bmpib2JodmJ2U1M5RTlLaHJrZ2YydnlVWDRoamZYCkRBU3dvakN3dDQ4bWJEWlptd1psNkVuSVpZa2Q1QlZlblIvbkQ0UWtha00xOGxoZWdHWGhnL2I3ZDcxNUY5ODAKSU1xYlg5WjFKUTdFRVRsTkc0cDBnbzQ5djNIYXdoQVZMQXZXdWNoMkozblRpWWI0WWhEcmJheGRYUDZMNXVEcgpHb1ZqdnJMUVRNNUlYRGpEdmVBMTY1TlB4U1VPNFdwaVo3V3ZLcGFjNWw0VkIreXZtZ0c2VEtTakJlTEFER29WCkVLNEU2WEpmQWdNQkFBRUNnZ0VBUXN0UEhONEpIYkRCUUV6RER2WFFycVBvY2lqRm9Lb215Q09LUHNIZFArejIKOU52eENIcVczOXpldVM0VFV1d2pQNDRuNTFJZ0pnVGNaVzNERm9LenJsOXBNQk82QlF1Q1hwdThXdTBROUhrUApCbVZBVGt5YlJ1VDExdFp3VTM2UzdnREtrUWZZZlBOQTIvRnhIOWhJbmd0S3h6TFhHazM3RlZnbDBvMXB1U2pTCk9WbDdGUDNxV05kUlF1R3M3UnA0ajRGdEJNbW1SS1hEeUtDN0dOdkJiaUdQNXQ2b043RXcrQkZFWHpEQ3JhZGsKY1JRc1VRQmQ2MDNQMDlmaXEyOW9Hbk1ITG1iWlBocVNtcTdoRHNJNEV1ZUlZckt0YTNhNndQSVdGWW1ST1lDbwpXM1Z6endmUkV5WUZNYmVBdmdCaWRKQ3JSdm9Oem5ZU0xUYzNGTUJUcVFLQmdRRHlRM2tvY3orUGxXNFFnZklEClJlbCtTVmZNcFZOSEVZaTBrYmlUWERTS3FoQmpNMWNlU2loY2lyNUZpbnBQUVVrRW5aU1F5c0hZbjJISlRKeXMKM1NzOEU1U3YzejdxRnpiNHB5TlpIVFJaNHMxNWowUGs2TUNKNnpZNS9TNzFOU3c1TVIzK1IyTWI2OVhNWkNGdgp5T2ZOakJEK1hSRmpuUFdvbm5KcjVwUTJtd0tCZ1FEbi9nbTBlaTQ2bVdvejRidzExZVhVejZBQm9qUzBEZXB5CmlwOVRNKy9PL0RxcEsvVkVhYy9nUWpNb1JvaVV1TEplMDJXTFNUcHJSMk5RY1hZNWNoOFpCVnhaTmlkVUkzNmkKWkRsZi93K3ZKMmcwTXM4NFNiWnNjWXlGSHk3aTF4cGFpOFNZdWZldEZmZHByTHREOEs3djAxZk96RmFhZWxVaQpESFdBd3R5TmpRS0JnRzgreUkzb2poRlMzdDI1cmZZT3ptOXRJbUlZc0tyN3hEaVdpWmt4Ui9jOHJKWEE1NHBECkoxR0hiR1BtZU0rWC9QMmZscTcrVEJFNjd0NU96Y3NiTEZWRDhJenFDS3ZaeVNaWktZUXNRdlBiajlyNERJYzYKMGQ4RElUMXpvM0o1M2pyTThTYm9oUHczU1UrMzB4clB1SkhNZGFrMzkxbzBveUd3MEgzM3ZhdHRBb0dBQ3NoTgozeXVHbG9hbTN2NXc1dmVvRlBvSmI4b0FOUllvZldaZi9WZituMW90eDhzWlBUTEZ6S0NIRENvckV1NTZxOW1iCmNKdllzVC9DSit6K0Y3RnNMSmVKTVVSSkU2b0txcldKelNKbnNqWmNxNEJwRFM2djRkNXRMNHJCZlIyT1JnTVYKQWh3eW5NTFdtdnpDUDJnaVdWY3pUNU5EdXk1UVlxSzltMXh6TDhrQ2dZRUFqVHdEOW1QQjBHM0kxMlhnekxuQwpEeEM2MC9Ba1hyTGl4ODQ2OExHTlJkcVNPbndoSGxtQzNiQkRYZ1k1WWU5Z0VxTHV2cTRvTEF6bDRydkdFWkNNCjZwNTYrRGwvUEVRT1gxSlJoSWtnaDcraWlEWFdPV2dubUQyV1V3SVR5bG1OUnNJckcvYjNKMGpLMlJOTGNqQmgKQ1liR0RxaGtDN29DbloyRjE4MFV0MGc9Ci0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS0K
  tls.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUROekNDQWgrZ0F3SUJBZ0lVRjQ5Qy9oQzg2VGQ2V2N0cUJWaGViWm1lbjhzd0RRWUpLb1pJaHZjTkFRRUwKQlFBd0t6RVlNQllHQTFVRUF3d1BiWEVnY1hWbGRXVnRZVzVoWjJWeU1ROHdEUVlEVlFRTERBWnBZbTBnYlhFdwpIaGNOTWpJd01qSXhNVFF4TWpReldoY05Nekl3TWpFNU1UUXhNalF6V2pBck1SZ3dGZ1lEVlFRRERBOXRjU0J4CmRXVjFaVzFoYm1GblpYSXhEekFOQmdOVkJBc01CbWxpYlNCdGNUQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQUQKZ2dFUEFEQ0NBUW9DZ2dFQkFOdUxTblRnZERkd0ZjbnI3OTdWdDA5K3JCalNKZ3hNRFZTdHF0ckJSK0k5MkQ5cApTdVZ1VVk5bHROMnFYb2ppVzBoUXVjYWlrQWdUY1o0UW50bCtIeHc0dmxJMVFoRS84Y0FDejdIYWU0RzlhT0JICktlTnVodUc5dTlKTDBUMHFHdVNCL2EvSlJmaUdOOWNNQkxDaU1MQzNqeVpzTmxtYkJtWG9TY2hsaVIza0ZWNmQKSCtjUGhDUnFRelh5V0Y2QVplR0Q5dnQzdlhrWDN6UWd5cHRmMW5VbERzUVJPVTBiaW5TQ2pqMi9jZHJDRUJVcwpDOWE1eUhZbmVkT0podmhpRU90dHJGMWMvb3ZtNE9zYWhXTytzdEJNemtoY09NTzk0RFhyazAvRkpRN2hhbUpuCnRhOHFscHptWGhVSDdLK2FBYnBNcEtNRjRzQU1haFVRcmdUcGNsOENBd0VBQWFOVE1GRXdIUVlEVlIwT0JCWUUKRktlSWdzcnBNLzBmcjlCaTg5Qmh6c0VqOEorUE1COEdBMVVkSXdRWU1CYUFGS2VJZ3NycE0vMGZyOUJpODlCaAp6c0VqOEorUE1BOEdBMVVkRXdFQi93UUZNQU1CQWY4d0RRWUpLb1pJaHZjTkFRRUxCUUFEZ2dFQkFIRlVtdG9xCjVaUWI2cXBnQmdlaGJaVTBTSkpNK2hnOGRMTnVFT25VekxGdTh4eGZjV3kraTloSWU1dXI0M0xjaGtZR09wc2EKSzVGY0dWSVIybkFlSjgrWWY5bUtoUHRjblRzWStzL2VpZGVzdGJkdnE2eFI2RE92ckpQY1FLTlVEcmZUU2RMcwpsZHhCOFdrajY4WWRIUWdFUkN3ZHlvVFEydkVUUmIvb2J4M1ZLSlhid1cybi9xdWxIZ0IwTDJXN3hVa1FWZWdaCkk5eHByU0pEUnVvdGY0WjZuek4yZ3RNQzUzRDRweVlxL2habFlQL1ZMOGV6dFE3bGw0VzM0QWppY2VCdXpLeXgKa04zUEtHYXpJcHRpZ1d6WHhSM2pLTjMremlDVDBaR3BYeHFqbTRvVnFocHA5bTJ2YzdDVmliMzQ3c05rRG5nSgpWeUcvTnpwcS92TldLWGc9Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
  app.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUROekNDQWgrZ0F3SUJBZ0lVYUpUbGgrQ3BBZHlJSFJzbjhVQnYrVWRkTVRJd0RRWUpLb1pJaHZjTkFRRUwKQlFBd0t6RVZNQk1HQTFVRUF3d01ZWEJ3YkdsallYUnBiMjR4TVJJd0VBWURWUVFMREFsaGNIQWdkR1ZoYlRFdwpIaGNOTWpJd01qSXhNVFF4TWpReldoY05Nekl3TWpFNU1UUXhNalF6V2pBck1SVXdFd1lEVlFRRERBeGhjSEJzCmFXTmhkR2x2YmpFeEVqQVFCZ05WQkFzTUNXRndjQ0IwWldGdE1UQ0NBU0l3RFFZSktvWklodmNOQVFFQkJRQUQKZ2dFUEFEQ0NBUW9DZ2dFQkFNTFVKbkZNa2R0bWU3SWpLMHBRZWRNMngzTHhWeE1KNGxpZGF6a0U0YXN0ZGhWMgplL295c2MwUloxRXMvTzlmVTZoQU5wTkhzeG1wSWI1OWx6NmorTXpRMzR4Ylgxd0VGbS9EUUdMdElqWFlBL0x4CmVneWp2cUZ6U3pvWDZqa0JtczRCYndHRzY2UHRWVlFFczBuclpNL3J5ZXBiUERidE9uYnQ0QUUvZVRRTXdFRWoKSzVyYTA4WElTRXRhdDc2TXliUG44NkR3Sjk1ZjFmblRQc2E0K3RFT291L2Y2dEkvTUNsMzNhWTZleWxnUWw2Ywp0ZGNvVHJtWlhXVWJmZzJiVk9mM25ZSWJYTlN2S0FRRnNoWnhmdENiSldGVFVFU0RoNmltcXlEN0hZaUdLZGpvCkNSSzJhck5RQXE3SCttb25iVGJJYVg4bnNQS1FhSGJqUWZOaDZ1TUNBd0VBQWFOVE1GRXdIUVlEVlIwT0JCWUUKRkN5cWVBNHV5cksvVDNQZm1TV2I4MVU4WlhFSk1COEdBMVVkSXdRWU1CYUFGQ3lxZUE0dXlySy9UM1BmbVNXYgo4MVU4WlhFSk1BOEdBMVVkRXdFQi93UUZNQU1CQWY4d0RRWUpLb1pJaHZjTkFRRUxCUUFEZ2dFQkFLYVNlUzd1CktNaDZGZ1FLR0pkSU1LdlY1bzFUcVZGSEo2REVlb3JnNDNwS295R2prbGNuVFAzbmlMczdWZ3h6Vk9CcVdYY2cKRFYzYmw0NTkrYnFMM2FNRkU2QWFvZW9JejFZeWZQMGkxaC9hakwrM1dYc0ozUWxSL2ptZzFRYjBNVTRNM1IvRwpGSFhPdFFXTVlzMXc2SERPL2hwM1BJU0JOaU80bkxXdTdjcVhtTlF6V2Z6bGVmTy9Nb04xeW1RQWFvNlFNSlFICktET3BWVk9sM1dJVmZoVDBFRStHbmdobmZkaHZnMFhmUzNFZ2IybmVqVHNtNnhpZi9JNjR0Z3p2MjlSR29qQmcKcG9zdlQ4K01hU1dXMDRoQm1KV1pKR0RoN3prbFloQlpFb1RqRjhCQm5GSVpwMEtUQ0thdFhiS3kyVG16VHpCOQpDZzlzR0E1eWJPNUtYWm89Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K
type: Opaque
```
We create the above configmap so we don't persist the configuration. This means that it can be changed with a `kubectl edit deployment` or `helm upgrade`. As a configmap its mounted in the container and doesn't become immutable.

This configmap will have several certs already encrypted base64 for testing that can always be updated. As another note, the above config map settings for the container will allow access via MQ Explorer using the `admin` user with the password `mqpasswd`.

- `mqekspoc_values.yaml`

```
# © Copyright IBM Corporation 2021, 2022
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
license: accept
image:
  # repository is the container repository to use
  repository: <URL FOR AIRGAPPED REPO>/icr.io/ibm-messaging/mq
  # tag is the tag to use for the container repository
  tag: latest
  # pullSecret is the secret to use when pulling the image from a private registry
  pullSecret: ics-cots-pullsecret
  # pullPolicy is either IfNotPresent or Always (https://kubernetes.io/docs/concepts/containers/images/)
  pullPolicy: IfNotPresent

queueManager:
  nativeha:
    enable: false
    tls:
      secretName: helmsecure
  mqscConfigMaps:
    - name: helmsecure
      items:
        - mq.mqsc
  qminiConfigMaps:
    - name: helmsecure
      items:
        - mq.ini
  multiinstance:
    enable: false

persistence:
  dataPVC:
    enable: false
    name: "data"
    size: 2Gi
    storageClassName: "ebs-sc"
  logPVC:
    enable: false
    name: "log"
    size: 2Gi
    storageClassName: "ebs-sc"
  qmPVC:
    enable: true
    name: "qm"
    size: 2Gi
    storageClassName: "ebs-sc"

security:
  context:
    fsGroup: 65534
    supplementalGroups: [65534]
  initVolumeAsRoot: false
  runAsUser: 2001
  runAsGroup: 2001

pki:
  keys:
    - name: default
      secret:
        secretName: helmsecure
        items:
          - tls.key
          - tls.crt
  trust:
    - name: default
      secret:
        secretName: helmsecure
        items:
          - app.crt
metadata:
  annotations:
    productName: "IBM MQ Advanced for Developers"
    productID: "2f886a3eefbe4ccb89b2adb97c78b9cb"
    productChargedContainers: ""
    productMetric: "FREE"
route:
  nodePort:
    webconsole: true
    mqtraffic: true
  loadBalancer:
    webconsole: true
    mqtraffic: true
    awslbscheme: # Can be "internal" or "internet-facing". Defaults to "internet-facing" if not defined here. Only really applicable in AWS EKS.
    loadBalancerSourceRanges: [] # This allows to lock your allowed traffic from specific subnets
  ingress:
    webconsole: 
      enable: false
      hostname: 
      path: /
      tls: 
        enable: false 
        secret: 
    mqtraffic: 
      enable: false
      hostname: 
      path: /
      tls: 
        enable: false
        secret: 
    
```
Extra settings above allow for using an `ingress` in AWS specifically, but will probably work in plain kubernetes.

- Log into AWS EKS via CLI [ref](https://aws.amazon.com/premiumsupport/knowledge-center/eks-cluster-connection/)

Set our context so we're in the correct namespace (if we aren't) and apply mtlsqm.yaml
```
kubectl config set-context --current --namespace=$TARGET_NAMESPACE
kubectl apply -f mtlsqm.yaml
```

- Now install the helm chart

```
helm install mqekspoc ibm-messaging-mq/ibm-mq \
-f mqekspoc_values.yaml \
--set "queueManager.envVariables[0].name=MQ_ADMIN_PASSWORD" \
--set "queueManager.envVariables[0].value=mqpasswd" \
--set "queueManager.envVariables[1].name=MQ_APP_PASSWORD" \
--set "queueManager.envVariables[1].value=mqpasswd"

NAME: mqekspoc
LAST DEPLOYED: Tue Jan 10 16:08:43 2023
NAMESPACE: 
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Get the MQ Console URL by running these commands:
  export CONSOLE_PORT=$(kubectl get services mqekspoc-ibm-mq-web -n mq-eks -o jsonpath="{.spec.ports[?(@.port=="9443")].nodePort}")
  export CONSOLE_IP=$(kubectl get nodes -o jsonpath='{..addresses[1].address}' | awk '{print $1}')
  echo https://$CONSOLE_IP:$CONSOLE_PORT/ibmmq/console

Get the load balancer exposed MQ Console URL by running these commands:
  export CONSOLE_PORT=9443
  export CONSOLE_IP=$(kubectl get services mqekspoc-ibm-mq-loadbalancer -n mq-eks -o jsonpath="{..hostname}")$(kubectl get services mqekspoc-ibm-mq-loadbalancer -n mq-eks -o jsonpath="{..ip}")
  echo https://$CONSOLE_IP:$CONSOLE_PORT/ibmmq/console
The MQ connection information for clients inside the cluster is as follows:
  mqekspoc-ibm-mq:1414
```

Following the returned prompts above, you should be able to retrieve the webui url.

User/pass: `admin/mqpasswd`

This will deploy a number of resources:
- A configMap with MQ configuration to define a default Queue, and the security required.
- A secret that includes certificates and keys from the `genericresources/createcerts` directory. Assuring the communication in MQ is secure.
This will take a minute or so to deploy, and the status can be checked with the following command: `kubectl get pods | grep secureapp`. If you've enabled `nativeha` with a `true` value, then three pods will be generated. Wait until one of the three Pods is showing `1/1` under the ready status (only one will ever show this, the remainding two will be `0/1` showing they are replicas). If `nativeha` is set to `false`, only one pod will come up.

verify the pods are up. If we enabled nativeha in our values you should see three. Otherwise just one.
```
kubectl get pods
NAME                     READY   STATUS    RESTARTS   AGE
secureapphelm-ibm-mq-0   1/1     Running   0          25m
secureapphelm-ibm-mq-1   0/1     Running   0          25m
secureapphelm-ibm-mq-2   0/1     Running   0          25m
```