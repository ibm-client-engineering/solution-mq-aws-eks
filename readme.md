<h1>IBM Client Engineering - Solution Document</h1>

<h2> IBM MQ on AWS Elastic Container Service (EKS)</h2>
<img align="right" src="https://user-images.githubusercontent.com/95059/166857681-99c92cdc-fa62-4141-b903-969bd6ec1a41.png" width="491" >

- [Introduction](#introduction)
  - [Scope](#scope)
- [Solution Strategy](#solution-strategy)
  - [Overview](#overview)
  - [Building Block View](#building-block-view)
  - [Deployment](#deployment)
    - [Requirements](#requirements)
    - [Stage Requirements](#stage-requirements)
      - [Set Up AWS Account](#set-up-aws-account)
      - [Create AWS VPC and EKS Cluster](#create-aws-vpc-and-eks-cluster)
      - [Configure `kubectl`](#configure-kubectl)
      - [Create MQ Namespace and Stage Helm Chart](#create-mq-namespace-and-stage-helm-chart)
    - [Installation](#installation)
    - [Verify the IBM MQ Deployment and Access](#verify-the-ibm-mq-deployment-and-access)
  - [Testing](#testing)
  - [Administration](#administration)
  - [Monitoring](#monitoring)
  - [Cost](#cost)
  - [Architecture Decisions](#architecture-decisions)

# Introduction
This Proof of Technology aims to provide the customer with the knowledge and resources necessary to successfully deploy and utilize IBM MQ on Amazon Elastic Kubernetes Service (EKS). The engagement will be broken down into multiple phases, with the goal of Phase 1 being to provide the customer with a blueprint for deployment, as well as guidance on testing the deployment with a production-like workload and monitoring logs and health. Additionally, this phase will cover basic operational procedures such as upgrades and patches.
## Scope
The scope of this technical engagement includes the following:

**Phase 1**
- [ ]   Design and implementation of a blueprint for deploying IBM MQ on EKS
- [ ]   Guidance on testing the deployment with a production-like workload
- [ ]   Assistance with configuring and enabling basic monitoring of logs and health
- [ ]   Overview of basic operational procedures such as upgrades and patches
- [ ]   Support during the deployment and initial configuration of IBM MQ on EKS

<img width="500" alt="image" src="https://user-images.githubusercontent.com/95059/211837985-f893a5bf-de58-47df-a996-10682e2c7fad.png">

# Solution Strategy

## Overview

## Building Block View



## Deployment

### Requirements

- Minimum Requirements
	- Software
	- Helm 3
	- Kubectl
	- AWS CLI
	- IAM
      - AWS EKS Security Group should ALLOW communication on assigned NodePorts

- Hardware
  - EKS
    - `m5.xlarge` and region as `us-east-1`. (this has 4 vcpu and 16 gigs ram)
    - Default storage class defined
  - Ports
    - 1414
  - Jump Server/Bastion Host for staging requirements

### Stage Requirements
#### Set Up AWS Account

- CMDLINE Client install (MacOS)

Download the client

```
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
```

Install it with sudo (to use for all users)

```
sudo installer -pkg ./AWSCLIV2.pkg -target /
```

Now let's configure our client env

```
aws configure
```

Answer all the questions with the info you got. If you already have a profile configured, you can add a named profile to your credentials

```
vi ~/.aws/credentials

[default]
aws_access_key_id =
aws_secret_access_key =

[748107796891_AWSAdmin]
aws_access_key_id=
aws_secret_access_key=
```

Also add location info to the config file

```
vi ~/.aws/config

[default]
region = us-east-1
output = json

[profile techzone_user]
region=us-east-1
output=json
```

We are also going to use some env magic to make sure we stick with the second profile

```
export AWS_PROFILE=748107796891_AWSAdmin
```

You may also copy the following out of the aws portal and paste it into your shell

```
export AWS_ACCESS_KEY_ID=""
export AWS_SECRET_ACCESS_KEY=""
```

#### Create AWS VPC and EKS Cluster

- Installing or updating `eksctl`

For this we are going to use homebrew

```
brew tap weaveworks/tap

brew install weaveworks/tap/eksctl
```

**We are going to create an IAM user with admin privs to create and own this whole cluster.**

In the web management UI for AWS, go to IAM settings and create a user with admin privileges but no management console access. We created a user called "K8-Admin"

Delete or rename your `~/.aws/credentials` file and re-run `aws configure` with the new user's Access and secret access keys.

- Deploying a cluster with `eksctl`

Run the `eksctl` command below to create your first cluster and perform the following:

- Create a 3-node Kubernetes cluster named `dev` with one node type as `m5.xlarge` and region as `us-east-1`. (this has 4 vCPU and 16 GB Memory)
- Define a minimum of one node (`--nodes-min 1`) and a maximum of five-node (`--nodes-max 5`) for this node group managed by EKS. The node group is named `standard-workers`.
- Create a node group with the name `standard-workers` and select a machine type for the `standard-workers` node group.

```
eksctl create cluster \
--name mq-cluster \
--version 1.22 \
--region us-east-1 \
--nodegroup-name standard-workers \
--node-type m5.xlarge \
--nodes 4 \
--nodes-min 1 \
--nodes-max 5 \
--managed
```

#### Configure `kubectl`

Once the cluster is up, add it to your kube config

```
aws eks update-kubeconfig --name mq-cluster --region us-east-1
Added new context arn:aws:eks:us-east-1:748107796891:cluster/mq-cluster to /Users/user/.kube/config
```

#### Create MQ Namespace and Stage Helm Chart

Create a namespace to deploy to

```
kubectl create namespace mq-eks
```

Git clone the following repo
```
git clone https://github.com/ibm-messaging/mq-helm.git
```

### Installation
- Log into AWS EKS via CLI [ref](https://aws.amazon.com/premiumsupport/knowledge-center/eks-cluster-connection/)
- Add the helm chart to your repo
```
cd  mq-helm/samples/AWSEKS/deploy
./install.sh mq-eks mqpasswd mqpasswd
```

This will deploy a number of resources:
- The IBM MQ Helm Chart using the properties within the [secureapp_nativeha.yaml](https://github.com/ibm-messaging/mq-helm/blob/main/samples/AWSEKS/deploy/secureapp_nativeha.yaml) file.
- A configMap with MQ configuration to define a default Queue, and the security required.
- A secret that includes certificates and keys from the `genericresources/createcerts` directory. Assuring the communication in MQ is secure.
This will take a minute or so to deploy, and the status can be checked with the following command: `kubectl get pods | grep secureapp`. Wait until one of the three Pods is showing `1/1` under the ready status (only one will ever show this, the remaining two will be `0/1` showing they are replicas).


```
deploy git:(main) ./install.sh mq-eks
Context "arn:aws:eks:us-east-1:748107796891:cluster/mq-cluster" modified.
configmap/helmsecure created
secret/helmsecure created
NAME: secureapphelm
LAST DEPLOYED: Mon Jan  9 16:10:18 2023
NAMESPACE: mq-eks
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Get the MQ Console URL by running these commands:
  export CONSOLE_PORT=$(kubectl get services secureapphelm-ibm-mq-web -n mq-eks -o jsonpath="{.spec.ports[?(@.port=="9443")].nodePort}")
  export CONSOLE_IP=$(kubectl get nodes -o jsonpath='{..addresses[1].address}' | awk '{print $1}')
  echo https://$CONSOLE_IP:$CONSOLE_PORT/ibmmq/console

Get the load balancer exposed MQ Console URL by running these commands:
  export CONSOLE_PORT=9443
  export CONSOLE_IP=$(kubectl get services secureapphelm-ibm-mq-loadbalancer -n mq-eks -o jsonpath="{..hostname}")$(kubectl get services secureapphelm-ibm-mq-loadbalancer -n mq-eks -o jsonpath="{..ip}")
  echo https://$CONSOLE_IP:$CONSOLE_PORT/ibmmq/console
The MQ connection information for clients inside the cluster is as follows:
  secureapphelm-ibm-mq:1414
```

- Verify that the pods are up

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
    SET AUTHREC PROFILE('APPQ') PRINCIPAL('app1') OBJTYPE(QUEUE) AUTHADD(BROWSE,GET,INQ,PUT)
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

This will have several certs already encrypted base64 for testing.

- `secureapp_nativeha.yaml`

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
queueManager:
  nativeha:
    enable: true
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
persistence:
  qmPVC:
    enable: true
    storageClassName: gp2
security:
  context:
    fsGroup: 0
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

```

- Log into AWS EKS via CLI [ref](https://aws.amazon.com/premiumsupport/knowledge-center/eks-cluster-connection/)

Set our context so we're in the correct namespace (if we aren't) and apply mtlsqm.yaml
```
kubectl config set-context --current --namespace=$TARGET_NAMESPACE
kubectl apply -f mtlsqm.yaml
```

- Now install the helm chart

```
helm install secureapphelm ibm-messaging-mq/ibm-mq \
-f secureapp_nativeha.yaml \
--set "queueManager.envVariables[0].name=MQ_ADMIN_PASSWORD" \
--set "queueManager.envVariables[0].value=mqpasswd" \
--set "queueManager.envVariables[1].name=MQ_APP_PASSWORD" \
--set "queueManager.envVariables[1].value=mqpasswd"

NAME: secureapphelm
LAST DEPLOYED: Tue Jan 10 16:08:43 2023
NAMESPACE: mq-eks
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
Get the MQ Console URL by running these commands:
  export CONSOLE_PORT=$(kubectl get services secureapphelm-ibm-mq-web -n mq-eks -o jsonpath="{.spec.ports[?(@.port=="9443")].nodePort}")
  export CONSOLE_IP=$(kubectl get nodes -o jsonpath='{..addresses[1].address}' | awk '{print $1}')
  echo https://$CONSOLE_IP:$CONSOLE_PORT/ibmmq/console

Get the load balancer exposed MQ Console URL by running these commands:
  export CONSOLE_PORT=9443
  export CONSOLE_IP=$(kubectl get services secureapphelm-ibm-mq-loadbalancer -n mq-eks -o jsonpath="{..hostname}")$(kubectl get services secureapphelm-ibm-mq-loadbalancer -n mq-eks -o jsonpath="{..ip}")
  echo https://$CONSOLE_IP:$CONSOLE_PORT/ibmmq/console
The MQ connection information for clients inside the cluster is as follows:
  secureapphelm-ibm-mq:1414
```

Following the returned prompts above, you should be able to retrieve the webui url.

User/pass: `admin/mqpasswd`

This will deploy a number of resources:
-   The IBM MQ Helm Chart using the properties within the [secureapp_nativeha.yaml](https://github.com/ibm-messaging/mq-helm/blob/main/samples/AWSEKS/deploy/secureapp_nativeha.yaml) file.
- A configMap with MQ configuration to define a default Queue, and the security required.
- A secret that includes certificates and keys from the `genericresources/createcerts` directory. Assuring the communication in MQ is secure.
This will take a minute or so to deploy, and the status can be checked with the following command: `kubectl get pods | grep secureapp`. Wait until one of the three Pods is showing `1/1` under the ready status (only one will ever show this, the remainding two will be `0/1` showing they are replicas).

verify the pods are up
```
kubectl get pods
NAME                     READY   STATUS    RESTARTS   AGE
secureapphelm-ibm-mq-0   1/1     Running   0          25m
secureapphelm-ibm-mq-1   0/1     Running   0          25m
secureapphelm-ibm-mq-2   0/1     Running   0          25m
```

This is normal behavior since only one will ever be up. The other two are replicas.

Relevant helm charts
`
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



### Verify the IBM MQ Deployment and Access

## Testing
## Administration
## Monitoring
## Cost

## Architecture Decisions












