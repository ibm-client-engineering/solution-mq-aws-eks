---
id: deploy
sidebar_position: 2
title: Deploy
---
## Deployment

### Create MQ Namespace and Stage Helm Chart

Create a namespace to deploy to

```
kubectl create namespace mq-eks
```

#### Customization, using encrypted EFS, and deploying with loadbalancers and ingress

Relevant helm charts

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
apiVersion: v2
name: ibm-mq
description: IBM MQ queue manager
version: 4.0.0
type: application
appVersion: 9.3.1.0
kubeVersion: ">=1.18.0-0"
keywords:
  - IBM MQ
  - MQ
  - amd64
  - message queue
  - Integration
icon: https://raw.githubusercontent.com/IBM/charts/master/logo/ibm-mq-blue-icon.png
```

To add a `loadBalancerSourceRanges` to the chart, I had to modify the following file in the source repo from github:

`mq-helm/charts/ibm-mq/templates/service-loadbalancer.yaml`

```
{{- if or (.Values.route.loadBalancer.mqtraffic) (.Values.route.loadBalancer.webconsole) }}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "ibm-mq.fullname" . }}-loadbalancer
  labels:
    {{- include "ibm-mq.labels" . | nindent 4 }}
spec:
  type: LoadBalancer
  ports:
  {{- if .Values.route.loadBalancer.mqtraffic }}
  - port: 1414
    name: qmgr
  {{- end }}
  {{- if .Values.route.loadBalancer.webconsole }}
  - port: 9443
    name: console-https
  {{- end }}
  {{- if .Values.route.loadBalancer.loadBalancerSourceRanges }}
  loadBalancerSourceRanges:
    {{- range $group := .Values.route.loadBalancer.loadBalancerSourceRanges }}
      - {{ $group -}}
    {{ end }}
  {{- end }}
  selector:
{{- include "ibm-mq.selectorLabels" . | nindent 4 }}
{{- end }}
```

Helm requires these sort of values be added to its templates if you want them to work. So our resultant `secureapp_nativeha.yaml` or in our customer case `mqekspoc_values.yaml`, it now looks like

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
  # repository: <URL FOR AIRGAPPED REPO>/icr.io/ibm-messaging/mq
  repository: icr.io/ibm-messaging/mq
  # tag is the tag to use for the container repository
  tag: latest
  # pullSecret is the secret to use when pulling the image from a private registry
  # pullSecret: ics-cots-pullsecret
  pullSecret:
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
#    dataPVC:
#      enable: false
#      name: "data"
#      size: 2Gi
#      storageClassName: "ebs-sc"
#    logPVC:
#      enable: false
#      name: "log"
#      size: 2Gi
#      storageClassName: "ebs-sc"
    qmPVC:
      enable: true
      name: "qm"
      size: 2Gi
      storageClassName: "gp2"

security:
  context:
    fsGroup: 65534
#    fsGroupChangePolicy: onRootMismatch
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
    loadBalancerSourceRanges: ["1.2.3.4/16","2.1.3.4/16","192.168.0.0/16"]
```

It's important to note that the loadBalancerSourceRanges are for inbound traffic to the cluster. Our example above shows a bunch of mostly private ip ranges, thus limiting traffic to whatever local network.

To install with our modified helm chart, we would do the following:

From the top level of our helm repo
```
helm install mqekspoc charts/ibm-mq \
-f mqekspoc_values.yaml \
--set "queueManager.envVariables[0].name=MQ_ADMIN_PASSWORD" \
--set "queueManager.envVariables[0].value=mqpasswd" \
--set "queueManager.envVariables[1].name=MQ_APP_PASSWORD" \
--set "queueManager.envVariables[1].value=mqpasswd"
```

```
