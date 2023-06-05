---
id: stage
sidebar_position: 1
title: Stage
---
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