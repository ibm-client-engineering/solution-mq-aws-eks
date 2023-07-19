"use strict";(self.webpackChunkwebsite=self.webpackChunkwebsite||[]).push([[296],{4137:(e,n,t)=>{t.d(n,{Zo:()=>p,kt:()=>h});var a=t(7294);function r(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function o(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);n&&(a=a.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,a)}return t}function i(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?o(Object(t),!0).forEach((function(n){r(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):o(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function s(e,n){if(null==e)return{};var t,a,r=function(e,n){if(null==e)return{};var t,a,r={},o=Object.keys(e);for(a=0;a<o.length;a++)t=o[a],n.indexOf(t)>=0||(r[t]=e[t]);return r}(e,n);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(a=0;a<o.length;a++)t=o[a],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(r[t]=e[t])}return r}var l=a.createContext({}),c=function(e){var n=a.useContext(l),t=n;return e&&(t="function"==typeof e?e(n):i(i({},n),e)),t},p=function(e){var n=c(e.components);return a.createElement(l.Provider,{value:n},e.children)},u="mdxType",m={inlineCode:"code",wrapper:function(e){var n=e.children;return a.createElement(a.Fragment,{},n)}},d=a.forwardRef((function(e,n){var t=e.components,r=e.mdxType,o=e.originalType,l=e.parentName,p=s(e,["components","mdxType","originalType","parentName"]),u=c(t),d=r,h=u["".concat(l,".").concat(d)]||u[d]||m[d]||o;return t?a.createElement(h,i(i({ref:n},p),{},{components:t})):a.createElement(h,i({ref:n},p))}));function h(e,n){var t=arguments,r=n&&n.mdxType;if("string"==typeof e||r){var o=t.length,i=new Array(o);i[0]=d;var s={};for(var l in n)hasOwnProperty.call(n,l)&&(s[l]=n[l]);s.originalType=e,s[u]="string"==typeof e?e:r,i[1]=s;for(var c=2;c<o;c++)i[c]=t[c];return a.createElement.apply(null,i)}return a.createElement.apply(null,t)}d.displayName="MDXCreateElement"},8547:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>i,default:()=>m,frontMatter:()=>o,metadata:()=>s,toc:()=>c});var a=t(7462),r=(t(7294),t(4137));const o={id:"deploy",sidebar_position:2,title:"Deploy"},i=void 0,s={unversionedId:"Co-Create/deploy",id:"Co-Create/deploy",title:"Deploy",description:"Deployment",source:"@site/docs/3-Co-Create/1-Deploy.md",sourceDirName:"3-Co-Create",slug:"/Co-Create/deploy",permalink:"/solution-mq-aws-eks/Co-Create/deploy",draft:!1,editUrl:"https://github.com/ibm-client-engineering/solution-mq-aws-eks.git/docs/3-Co-Create/1-Deploy.md",tags:[],version:"current",sidebarPosition:2,frontMatter:{id:"deploy",sidebar_position:2,title:"Deploy"},sidebar:"tutorialSidebar",previous:{title:"Automate",permalink:"/solution-mq-aws-eks/Co-Create/automate"},next:{title:"Validate",permalink:"/solution-mq-aws-eks/Co-Create/validate"}},l={},c=[{value:"Deployment",id:"deployment",level:2},{value:"Create MQ Namespace and Stage Helm Chart",id:"create-mq-namespace-and-stage-helm-chart",level:3},{value:"Customization, using encrypted EFS, and deploying with loadbalancers and ingress",id:"customization-using-encrypted-efs-and-deploying-with-loadbalancers-and-ingress",level:4}],p={toc:c},u="wrapper";function m(e){let{components:n,...t}=e;return(0,r.kt)(u,(0,a.Z)({},p,t,{components:n,mdxType:"MDXLayout"}),(0,r.kt)("h2",{id:"deployment"},"Deployment"),(0,r.kt)("h3",{id:"create-mq-namespace-and-stage-helm-chart"},"Create MQ Namespace and Stage Helm Chart"),(0,r.kt)("p",null,"Create a namespace to deploy to"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre"},"kubectl create namespace mq-eks\n")),(0,r.kt)("h4",{id:"customization-using-encrypted-efs-and-deploying-with-loadbalancers-and-ingress"},"Customization, using encrypted EFS, and deploying with loadbalancers and ingress"),(0,r.kt)("p",null,"Relevant helm charts"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre"},'# \xa9 Copyright IBM Corporation 2021, 2022\n#\n# Licensed under the Apache License, Version 2.0 (the "License");\n# you may not use this file except in compliance with the License.\n# You may obtain a copy of the License at\n#\n# http://www.apache.org/licenses/LICENSE-2.0\n#\n# Unless required by applicable law or agreed to in writing, software\n# distributed under the License is distributed on an "AS IS" BASIS,\n# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n# See the License for the specific language governing permissions and\n# limitations under the License.\napiVersion: v2\nname: ibm-mq\ndescription: IBM MQ queue manager\nversion: 4.0.0\ntype: application\nappVersion: 9.3.1.0\nkubeVersion: ">=1.18.0-0"\nkeywords:\n  - IBM MQ\n  - MQ\n  - amd64\n  - message queue\n  - Integration\nicon: https://raw.githubusercontent.com/IBM/charts/master/logo/ibm-mq-blue-icon.png\n')),(0,r.kt)("p",null,"To add a ",(0,r.kt)("inlineCode",{parentName:"p"},"loadBalancerSourceRanges")," to the chart, I had to modify the following file in the source repo from github:"),(0,r.kt)("p",null,(0,r.kt)("inlineCode",{parentName:"p"},"mq-helm/charts/ibm-mq/templates/service-loadbalancer.yaml")),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre"},'{{- if or (.Values.route.loadBalancer.mqtraffic) (.Values.route.loadBalancer.webconsole) }}\napiVersion: v1\nkind: Service\nmetadata:\n  name: {{ include "ibm-mq.fullname" . }}-loadbalancer\n  labels:\n    {{- include "ibm-mq.labels" . | nindent 4 }}\nspec:\n  type: LoadBalancer\n  ports:\n  {{- if .Values.route.loadBalancer.mqtraffic }}\n  - port: 1414\n    name: qmgr\n  {{- end }}\n  {{- if .Values.route.loadBalancer.webconsole }}\n  - port: 9443\n    name: console-https\n  {{- end }}\n  {{- if .Values.route.loadBalancer.loadBalancerSourceRanges }}\n  loadBalancerSourceRanges:\n    {{- range $group := .Values.route.loadBalancer.loadBalancerSourceRanges }}\n      - {{ $group -}}\n    {{ end }}\n  {{- end }}\n  selector:\n{{- include "ibm-mq.selectorLabels" . | nindent 4 }}\n{{- end }}\n')),(0,r.kt)("p",null,"Helm requires these sort of values be added to its templates if you want them to work. So our resultant ",(0,r.kt)("inlineCode",{parentName:"p"},"secureapp_nativeha.yaml")," or in our customer case ",(0,r.kt)("inlineCode",{parentName:"p"},"mqekspoc_values.yaml"),", it now looks like"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre"},'# \xa9 Copyright IBM Corporation 2021, 2022\n#\n# Licensed under the Apache License, Version 2.0 (the "License");\n# you may not use this file except in compliance with the License.\n# You may obtain a copy of the License at\n#\n# http://www.apache.org/licenses/LICENSE-2.0\n#\n# Unless required by applicable law or agreed to in writing, software\n# distributed under the License is distributed on an "AS IS" BASIS,\n# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n# See the License for the specific language governing permissions and\n# limitations under the License.\n\nlicense: accept\n\nimage:\n  # repository is the container repository to use\n  # repository: <URL FOR AIRGAPPED REPO>/icr.io/ibm-messaging/mq\n  repository: icr.io/ibm-messaging/mq\n  # tag is the tag to use for the container repository\n  tag: latest\n  # pullSecret is the secret to use when pulling the image from a private registry\n  # pullSecret: ics-cots-pullsecret\n  pullSecret:\n  # pullPolicy is either IfNotPresent or Always (https://kubernetes.io/docs/concepts/containers/images/)\n  pullPolicy: IfNotPresent\n\nqueueManager:\n  nativeha:\n    enable: false\n    tls:\n      secretName: helmsecure\n  mqscConfigMaps:\n    - name: helmsecure\n      items:\n        - mq.mqsc\n  qminiConfigMaps:\n    - name: helmsecure\n      items:\n        - mq.ini\n  multiinstance:\n    enable: false\n  persistence:\n#    dataPVC:\n#      enable: false\n#      name: "data"\n#      size: 2Gi\n#      storageClassName: "ebs-sc"\n#    logPVC:\n#      enable: false\n#      name: "log"\n#      size: 2Gi\n#      storageClassName: "ebs-sc"\n    qmPVC:\n      enable: true\n      name: "qm"\n      size: 2Gi\n      storageClassName: "gp2"\n\nsecurity:\n  context:\n    fsGroup: 65534\n#    fsGroupChangePolicy: onRootMismatch\n    supplementalGroups: [65534]\n  initVolumeAsRoot: false\n  runAsUser: 2001\n  runAsGroup: 2001\n\npki:\n  keys:\n    - name: default\n      secret:\n        secretName: helmsecure\n        items:\n          - tls.key\n          - tls.crt\n  trust:\n    - name: default\n      secret:\n        secretName: helmsecure\n        items:\n          - app.crt\nmetadata:\n  annotations:\n    productName: "IBM MQ Advanced for Developers"\n    productID: "2f886a3eefbe4ccb89b2adb97c78b9cb"\n    productChargedContainers: ""\n    productMetric: "FREE"\nroute:\n  nodePort:\n    webconsole: true\n    mqtraffic: true\n  loadBalancer:\n    webconsole: true\n    mqtraffic: true\n    loadBalancerSourceRanges: ["1.2.3.4/16","2.1.3.4/16","192.168.0.0/16"]\n')),(0,r.kt)("p",null,"It's important to note that the loadBalancerSourceRanges are for inbound traffic to the cluster. Our example above shows a bunch of mostly private ip ranges, thus limiting traffic to whatever local network."),(0,r.kt)("p",null,"To install with our modified helm chart, we would do the following:"),(0,r.kt)("p",null,"From the top level of our helm repo"),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre"},'helm install mqekspoc charts/ibm-mq \\\n-f mqekspoc_values.yaml \\\n--set "queueManager.envVariables[0].name=MQ_ADMIN_PASSWORD" \\\n--set "queueManager.envVariables[0].value=mqpasswd" \\\n--set "queueManager.envVariables[1].name=MQ_APP_PASSWORD" \\\n--set "queueManager.envVariables[1].value=mqpasswd"\n')),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre"},"")))}m.isMDXComponent=!0}}]);