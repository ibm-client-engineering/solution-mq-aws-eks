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
--nodes 6 \
--nodes-min 1 \
--nodes-max 7 \
--managed
```

#### Configure `kubectl`

Once the cluster is up, add it to your kube config

```
aws eks update-kubeconfig --name mq-cluster --region us-east-1
Added new context arn:aws:eks:us-east-1:748107796891:cluster/mq-cluster to /Users/user/.kube/config
```

#### Prepare the cluster for Ingress, Loadbalancer, and EFS

Associated an IAM oidc provider with the cluster. Assuming our region is `us-east-1`.
```
eksctl utils associate-iam-oidc-provider --region=us-east-1 --cluster=mq-cluster --approve
```
Install the EKS helm repo
```
helm repo add eks https://aws.github.io/eks-charts
helm repo update
```

Download an IAM policy for the AWS Load Balancer Controller that allows it to make calls to AWS APIs on your behalf.

```
curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.4.4/docs/install/iam_policy.json
```

Create an IAM policy using the policy downloaded in the previous step.    
```
aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy.json

{
    "Policy": {
        "PolicyName": "AWSLoadBalancerControllerIAMPolicy",
        "PolicyId": "ANPA24LVTCGNV55JFAAP5",
        "Arn": "arn:aws:iam::748107796891:policy/AWSLoadBalancerControllerIAMPolicy",
        "Path": "/",
        "DefaultVersionId": "v1",
        "AttachmentCount": 0,
        "PermissionsBoundaryUsageCount": 0,
        "IsAttachable": true,
        "CreateDate": "2023-01-17T20:22:23+00:00",
        "UpdateDate": "2023-01-17T20:22:23+00:00"
    }
}
```

Create an IAM role. Create a Kubernetes service account named `aws-load-balancer-controller` in the `kube-system` namespace for the AWS Load Balancer Controller and annotate the Kubernetes service account with the name of the IAM role.

**Replace `` `my-cluster` `` with the name of your cluster, `` `111122223333` `` with your account ID, and then run the command. If your cluster is in the AWS GovCloud (US-East) or AWS GovCloud (US-West) AWS Regions, then replace `arn:aws:` with `arn:aws-us-gov:`.
```
eksctl create iamserviceaccount \
  --cluster=mq-cluster-east \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --attach-policy-arn=arn:aws:iam::748107796891:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve
```

Install the EKS helm repo
```
helm repo add eks https://aws.github.io/eks-charts
helm repo update
```


##### Install the AWS Load Balancer Controller.
```
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=mq-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller 

NAME: aws-load-balancer-controller
LAST DEPLOYED: Tue Jan 17 15:33:50 2023
NAMESPACE: kube-system
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
AWS Load Balancer controller installed!

```
#### Install NGINX Controller

Pull down the NGINX controller deployment
```
wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/aws/deploy.yaml
```

Modify the deployment file and add the following annotations
```
service.beta.kubernetes.io/aws-load-balancer-type: "external"
service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "instance"
service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
```

Apply the deployment
```
kubectl apply -f deploy.yaml
```
Verify the deployment

Command:

```plainText
kubectl get ingressclass
```

Example output:

```plainText
NAME    CONTROLLER             PARAMETERS                             AGE 
alb     ingress.k8s.aws/alb    IngressClassParams.elbv2.k8s.aws/alb   19h 
nginx   k8s.io/ingress-nginx   none                                   15h
```

##### Configure EFS

 Create an IAM policy that allows the CSI driver's service account to make calls to AWS APIs on your behalf. This will also allow it to create access points on the fly.

 Download the IAM policy document from GitHub.

 ```
 curl -o iam-policy-example-efs.json https://raw.githubusercontent.com/kubernetes-sigs/aws-efs-csi-driver/master/docs/iam-policy-example.json
 ```

 Create the policy. 

 ```
 aws iam create-policy \
--policy-name AmazonEKS_EFS_CSI_Driver_Policy \
--policy-document file://iam-policy-example-efs.json

{
    "Policy": {
        "PolicyName": "AmazonEKS_EFS_CSI_Driver_Policy",
        "PolicyId": "ANPA24LVTCGN7YGDYRWJT",
        "Arn": "arn:aws:iam::748107796891:policy/AmazonEKS_EFS_CSI_Driver_Policy",
        "Path": "/",
        "DefaultVersionId": "v1",
        "AttachmentCount": 0,
        "PermissionsBoundaryUsageCount": 0,
        "IsAttachable": true,
        "CreateDate": "2023-01-24T17:24:00+00:00",
        "UpdateDate": "2023-01-24T17:24:00+00:00"
    }
}
 ```
Pay attention to the `Arn` value above.

Create an IAM role and attach the IAM policy to it. Annotate the Kubernetes service account with the IAM role ARN and the IAM role with the Kubernetes service account name. You can create the role using `eksctl` or the AWS CLI. We're going to use `eksctl`, Also our `Arn` is returned in the output above, so we'll use it here.

```
eksctl create iamserviceaccount \
    --cluster mq-cluster \
    --namespace kube-system \
    --name efs-csi-controller-sa \
    --attach-policy-arn arn:aws:iam::748107796891:policy/AmazonEKS_EFS_CSI_Driver_Policy \
    --approve \
    --region us-east-1
```

Copy the following contents to a file named `` `trust-policy`.json ``. Replace `` `111122223333` `` with your account ID. Replace `` `EXAMPLED539D4633E53DE1B71EXAMPLE` `` and `` `region-code` `` with the values returned in the previous step. 

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::111122223333:oidc-provider/oidc.eks.region-code.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.region-code.amazonaws.com/id/EXAMPLED539D4633E53DE1B71EXAMPLE:sub": "system:serviceaccount:kube-system:efs-csi-controller-sa"
        }
      }
    }
  ]
}
```
Once created, check the iam service account is created running the following command.

```bash
eksctl get iamserviceaccount --cluster <cluster-name>

NAMESPACE	NAME				ROLE ARN
kube-system	aws-load-balancer-controller	arn:aws:iam::748107796891:role/AmazonEKSLoadBalancerControllerRole
kube-system	efs-csi-controller-sa		arn:aws:iam::748107796891:role/eksctl-mq-cluster-addon-iamserviceaccount-ku-Role1-1SCBRU1DS52QY
```
Now we just need our add-on registry address. This can be found here: https://docs.aws.amazon.com/eks/latest/userguide/add-ons-images.html

Let's install the driver add-on to our clusters. We're going to use `helm` for this.
```
helm repo add aws-efs-csi-driver https://kubernetes-sigs.github.io/aws-efs-csi-driver/

helm repo update
```
Install a release of the driver using the Helm chart. Replace the repository address with the cluster's [container image address](https://docs.aws.amazon.com/eks/latest/userguide/add-ons-images.html).

```
helm upgrade -i aws-efs-csi-driver aws-efs-csi-driver/aws-efs-csi-driver \
    --namespace kube-system \
    --set image.repository=602401143452.dkr.ecr.us-east-1.amazonaws.com/eks/aws-efs-csi-driver \
    --set controller.serviceAccount.create=false \
    --set controller.serviceAccount.name=efs-csi-controller-sa

Release "aws-efs-csi-driver" does not exist. Installing it now.
NAME: aws-efs-csi-driver
LAST DEPLOYED: Tue Jan 24 12:42:42 2023
NAMESPACE: kube-system
STATUS: deployed
REVISION: 1
TEST SUITE: None
NOTES:
To verify that aws-efs-csi-driver has started, run:

    kubectl get pod -n kube-system -l "app.kubernetes.io/name=aws-efs-csi-driver,app.kubernetes.io/instance=aws-efs-csi-driver"
```
Now we need to create the filesystem in EFS so we can use it

Retrieve the VPC ID that your cluster is in and store it in a variable for use in a later step. Replace `` `my-cluster` `` with your cluster name. We'll have to wash, rinse, repeat for both of our clusters. 

Let's make life easier and just export the clustername as `$clustername` and the region as `$region`

```
export clustername=mq-cluster
export region=us-east-1
```

```
vpc_id=$(aws eks describe-cluster \
    --name $clustername \
    --query "cluster.resourcesVpcConfig.vpcId" \
    --region $region \
    --output text)
```

Retrieve the CIDR range for your cluster's VPC and store it in a variable for use in a later step. Replace `` `region-code` `` with the AWS Region that your cluster is in.

```
cidr_range=$(aws ec2 describe-vpcs \
    --vpc-ids $vpc_id \
    --query "Vpcs[].CidrBlock" \
    --output text \
    --region $region)
```

Create a security group with an inbound rule that allows inbound NFS traffic for your Amazon EFS mount points.

```
security_group_id=$(aws ec2 create-security-group \
    --group-name EFS4MQSecurityGroup \
    --description "MQ EFS security group latest" \
    --vpc-id $vpc_id \
    --region $region \
    --output text)
```

Create an inbound rule that allows inbound NFS traffic from the CIDR for your cluster's VPC.

```
aws ec2 authorize-security-group-ingress \
    --group-id $security_group_id \
    --protocol tcp \
    --port 2049 \
    --region $region \
    --cidr $cidr_range
```

Create a file system. Replace `` `region-code` `` with the AWS Region that your cluster is in.
```
file_system_id=$(aws efs create-file-system \
    --region $region \
    --encrypted \
    --performance-mode generalPurpose \
    --query 'FileSystemId' \
    --output text)
```
Create mount targets.

Determine the IP address of your cluster nodes.
```
kubectl get nodes
NAME                             STATUS   ROLES    AGE   VERSION
ip-192-168-20-100.ec2.internal   Ready    <none>   13d   v1.21.14-eks-fb459a0
ip-192-168-27-120.ec2.internal   Ready    <none>   13d   v1.21.14-eks-fb459a0
ip-192-168-39-167.ec2.internal   Ready    <none>   13d   v1.21.14-eks-fb459a0
ip-192-168-51-132.ec2.internal   Ready    <none>   13d   v1.21.14-eks-fb459a0
```

Determine the IDs of the subnets in your VPC and which Availability Zone the subnet is in.
```
aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$vpc_id" \
    --query 'Subnets[*].{SubnetId: SubnetId,AvailabilityZone: AvailabilityZone,CidrBlock: CidrBlock}' \
    --region $region \
    --output table

---------------------------------------------------------------------
|                          DescribeSubnets                          |
+------------------+-------------------+----------------------------+
| AvailabilityZone |     CidrBlock     |         SubnetId           |
+------------------+-------------------+----------------------------+
|  us-east-1b      |  192.168.96.0/19  |  subnet-0fab8f4f18bd31c1a  |
|  us-east-1d      |  192.168.64.0/19  |  subnet-06f1d5a671338af2f  |
|  us-east-1b      |  192.168.32.0/19  |  subnet-0a648663fc5c847b8  |
|  us-east-1d      |  192.168.0.0/19   |  subnet-06717fbaf2d8a0e52  |
+------------------+-------------------+----------------------------+
```

Add mount targets for the subnets that your nodes are in. Basically, for each SubnetId above, run the following command:

```
aws efs create-mount-target \
    --file-system-id $file_system_id \
    --region $region \
    --subnet-id <SUBNETID> \
    --security-groups $security_group_id
```
Create a storage class for dynamic provisioning

Let's get our filesystem ID if we don't already have it. If we ran the above commands, it should already be an exported variable in our env.
```
aws efs describe-file-systems --query "FileSystems[*].FileSystemId" --region $region --output text

```
Create the following storage class manifest. Make sure the `fileSystemId` is set to the filesystem id you just created.

`StorageClass.yaml`
```
kind: StorageClass
apiVersion: storage.k8s.io/v1
metadata:
  name: efs-sc
provisioner: efs.csi.aws.com
mountOptions:
  - tls
parameters:
  provisioningMode: efs-ap
  fileSystemId: fs-02371262af220c220
  directoryPerms: "775"
  gidRangeStart: "1000" # optional
  gidRangeEnd: "3000" # optional
  basePath: "/efs/dynamic_provisioning" # optional
  uid: "2001" # This tells the provisioner to make the owner this uid
  gid: "65534" # This tells the provisioner to make the group owner this gid
```
As a note for above, for MQ to work happily with EFS you need to specify the uid/gid in the storage class. Otherwise you will get permission errors when the container comes up and the process tries to update the `mq.ini` file.

Apply the storage class with
```
kubectl apply -f StorageClass.yaml
```
Finally, verify it's there
```
kubectl get sc
NAME            PROVISIONER             RECLAIMPOLICY   VOLUMEBINDINGMODE      ALLOWVOLUMEEXPANSION   AGE
efs-sc          efs.csi.aws.com         Delete          Immediate              false                  7s
gp2 (default)   kubernetes.io/aws-ebs   Delete          WaitForFirstConsumer   false                  13d
```

### Create MQ Namespace and Stage Helm Chart

Create a namespace to deploy to

```
kubectl create namespace mq-eks
```

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



### Verify the IBM MQ Deployment and Access

## Testing
## Administration
## Monitoring
## Cost

## Architecture Decisions












