import { Construct } from "constructs"
import { Token } from "cdktf"

import {
  AcmCertificate,
  DataAwsCallerIdentity,
  DataAwsIamPolicyDocument,
  Lb,
  LbListener,
  LbTargetGroup,
  S3Bucket,
  S3BucketPolicy,
  SecurityGroup,
  SecurityGroupRule,
  Subnet,
  Vpc,
} from "../../../imports/providers/aws"

import overrideNullValuesForSecurityGroupRule from "../../../utils/overrideNullValuesForSecurityGroupRule"

/**
 * Represents the AWS account IDs used to store the application load balancer logs depending on region.
 * @link https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html#access-logging-bucket-permissions
 */
const lbLogsBucketPolicyAccountIdDependingOnRegion: any = {
  "us-east-1": "127311923021",
  "us-east-2": "033677994240",
  "us-west-1": "027434742980",
  "us-west-2": "797873946194",
  "af-south-1": "098369216593",
  "ca-central-1": "985666609251",
  "eu-central-1": "054676820928",
  "eu-west-1": "156460612806",
  "eu-west-2": "652711504416",
  "eu-south-1": "635631232127",
  "eu-west-3": "009996457667",
  "eu-north-1": "897822967062",
  "ap-east-1": "754344448648",
  "ap-northeast-1": "582318560864",
  "ap-northeast-2": "600734575887",
  "ap-northeast-3": "383597477331",
  "ap-southeast-1": "114774131450",
  "ap-southeast-2": "783225319266",
  "ap-south-1": "718504428378",
  "me-south-1": "076674570225",
  "sa-east-1": "507241528517",
  "us-gov-west-1": "048591011584",
  "us-gov-east-1": "190560391635",
  "cn-north-1": "638102146993",
  "cn-northwest-1": "037604701340",
}

/**
 * Represents the properties of the application load balancer construct.
 * @property acmCertificate The ACM certificate created for your application.
 * @property currentAccount The AWS account used to create your infrastructure.
 * @property currentRegionAsString The AWS region used to create your infrastructure as string.
 * @property enableHttps Do you want to redirect HTTP to HTTPS?
 * @property publicSubnets The public subnets of your infrastructure.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 * @property vpc The VPC of your infrastructure.
 */
export interface IApplicationLoadBalancerConstructProps {
  acmCertificate: AcmCertificate;
  currentAccount: DataAwsCallerIdentity;
  currentRegionAsString: string;
  enableHttps: boolean;
  publicSubnets: Subnet[];
  resourceNamesPrefix: string;
  vpc: Vpc;
}

/**
 * Represents the application load balancer of your infrastructure.
 * @class
 * @extends Construct
 */
export class ApplicationLoadBalancerConstruct extends Construct {
  /**
   * The security group attached to your application load balancer.
   */
  readonly securityGroup: SecurityGroup

  /**
   * The security group egress rule attached to your application load balancer security group.
   */
  readonly securityGroupEgressRule: SecurityGroupRule

  /**
   * The application load balancer of your infrastructure.
   */
  readonly self: Lb

  /**
   * The target group attached to your application load balancer.
   */
  readonly targetGroup: LbTargetGroup

  /**
   * Creates an application load balancer construct.
   * @param scope The scope to attach the application load balancer construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The application load balancer construct properties.
   */
  constructor(scope: Construct, id: string, props: IApplicationLoadBalancerConstructProps) {
    super(scope, id)

    this.securityGroup = new SecurityGroup(this, "application_load_balancer_security_group", {
      description: "Allow inbound HTTP/HTTPS traffic to application load balancer",
      name: `${props.resourceNamesPrefix}_lb_security_group`,
      tags: {
        Name: `${props.resourceNamesPrefix}_lb_security_group`,
      },
      vpcId: Token.asString(props.vpc.id),
    })

    // We use security group rules here to avoid
    // cycle with the ECS task security group

    overrideNullValuesForSecurityGroupRule(new SecurityGroupRule(this, "application_load_balancer_security_group_http_ingress_rule", {
      type: "ingress",
      fromPort: 80,
      toPort: 80,
      protocol: "tcp",
      cidrBlocks: [
        "0.0.0.0/0",
      ],
      securityGroupId: Token.asString(this.securityGroup.id),
    }))

    overrideNullValuesForSecurityGroupRule(new SecurityGroupRule(this, "application_load_balancer_security_group_https_ingress_rule", {
      type: "ingress",
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      cidrBlocks: [
        "0.0.0.0/0",
      ],
      securityGroupId: Token.asString(this.securityGroup.id),
    }))

    this.securityGroupEgressRule = overrideNullValuesForSecurityGroupRule(new SecurityGroupRule(this, "application_load_balancer_security_group_egress_rule", {
      type: "egress",
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      securityGroupId: Token.asString(this.securityGroup.id),
      // Set to ECS task security group
      // in "main.ts" to prevent cycle
      sourceSecurityGroupId: "", // <--- cycle
    }))

    // ----

    const applicationLoadBalancerLogsBucket = new S3Bucket(this, "application_load_balancer_logs_bucket", {
      acl: "private",
      bucket: `${props.resourceNamesPrefix.replace(/_/gi, "-")}-alb-logs-bucket`,
      forceDestroy: true,
    })

    const applicationLoadBalancerLogsBucketPolicyDocument = new DataAwsIamPolicyDocument(this, "application_load_balancer_logs_bucket_policy_document", {
      version: "2012-10-17",
      statement: [{
        effect: "Allow",
        principals: [{
          type: "AWS",
          identifiers: [
            `arn:aws:iam::${lbLogsBucketPolicyAccountIdDependingOnRegion[props.currentRegionAsString]}:root`,
          ],
        }],
        actions: [
          "s3:PutObject",
        ],
        resources: [
          `arn:aws:s3:::${Token.asString(applicationLoadBalancerLogsBucket.bucket)}/AWSLogs/${props.currentAccount.accountId}/*`,
        ],
      }, {
        effect: "Allow",
        principals: [{
          type: "Service",
          identifiers: [
            "delivery.logs.amazonaws.com",
          ],
        }],
        actions: [
          "s3:PutObject",
        ],
        resources: [
          `arn:aws:s3:::${Token.asString(applicationLoadBalancerLogsBucket.bucket)}/AWSLogs/${props.currentAccount.accountId}/*`,
        ],
        condition: [{
          test: "StringEquals",
          variable: "s3:x-amz-acl",
          values: [
            "bucket-owner-full-control",
          ],
        }],
      }, {
        effect: "Allow",
        principals: [{
          type: "Service",
          identifiers: [
            "delivery.logs.amazonaws.com",
          ],
        }],
        actions: [
          "s3:GetBucketAcl",
        ],
        resources: [
          `arn:aws:s3:::${Token.asString(applicationLoadBalancerLogsBucket.bucket)}`,
        ],
      }],
    })

    new S3BucketPolicy(this, "application_load_balancer_logs_bucket_policy", {
      bucket: Token.asString(applicationLoadBalancerLogsBucket.bucket),
      policy: applicationLoadBalancerLogsBucketPolicyDocument.json,
      dependsOn: [
        applicationLoadBalancerLogsBucket,
      ],
    })

    this.self = new Lb(this, "application_load_balancer", {
      internal: false,
      loadBalancerType: "application",
      // "name" cannot be longer than 32 characters
      name: `${props.resourceNamesPrefix.replace(/_/gi, "-").substring(0, 32)}`,
      securityGroups: [
        Token.asString(this.securityGroup.id),
      ],
      subnets: props.publicSubnets.map(publicSubnet => Token.asString(publicSubnet.id)),
      accessLogs: [{
        enabled: true,
        bucket: Token.asString(applicationLoadBalancerLogsBucket.bucket),
      }],
      dependsOn: [
        applicationLoadBalancerLogsBucket,
      ],
    })

    // Fargate tasks will be registered to this target group.
    // See the "loadBalancer" property in the computing/service construct.
    this.targetGroup = new LbTargetGroup(this, "application_load_balancer_target_group", {
      // "name" cannot be longer than 32 characters
      name: `${props.resourceNamesPrefix.replace(/_/gi, "-").substring(0, 32)}`,
      port: 80,
      protocol: "HTTP",
      targetType: "ip",
      vpcId: Token.asString(props.vpc.id),
      healthCheck: [{
        enabled: true,
        healthyThreshold: 5,
        interval: 5,
        path: "/",
        protocol: "HTTP",
        timeout: 4,
        unhealthyThreshold: 2,
      }],
      dependsOn: [
        this.self,
      ],
    })

    const httpsListener = new LbListener(this, "application_load_balancer_https_listener", {
      certificateArn: props.acmCertificate.arn,
      defaultAction: [{
        targetGroupArn: this.targetGroup.arn,
        type: "forward",
      }],
      loadBalancerArn: this.self.arn,
      port: 443,
      protocol: "HTTPS",
      dependsOn: [
        this.targetGroup,
        props.acmCertificate,
      ],
    })

    new LbListener(this, "application_load_balancer_http_listener", {
      defaultAction: [props.enableHttps ? {
        type: "redirect",
        redirect: [{
          port: "443",
          protocol: "HTTPS",
          statusCode: "HTTP_301",
        }],
      } : {
        targetGroupArn: this.targetGroup.arn,
        type: "forward",
      }],
      loadBalancerArn: this.self.arn,
      port: 80,
      protocol: "HTTP",
      dependsOn: props.enableHttps ? [
        this.targetGroup,
        httpsListener,
      ] : [
        this.targetGroup,
      ],
    })
  }
}

export default ApplicationLoadBalancerConstruct
