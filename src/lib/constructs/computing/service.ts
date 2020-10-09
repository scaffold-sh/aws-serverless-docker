import { Construct } from "constructs"
import { Token } from "cdktf"

import {
  DataAwsEcsTaskDefinition,
  EcsCluster,
  EcsService,
  EcsTaskDefinition,
  LbTargetGroup,
  SecurityGroup,
  Subnet,
} from "../../../imports/providers/aws"

/**
 * Represents the properties of the service construct.
 * @property applicationLoadBalancerTargetGroup The target group attached to your application load balancer.
 * @property cluster The Fargate cluster used in your infrastructure.
 * @property containerListenPort The port that needs to be used to send requests to your Docker container.
 * @property containerName A name chosen to designate your Docker container.
 * @property currentTaskDefinition The current main Fargate task definition.
 * @property mainTaskDefinition The main Fargate task definition.
 * @property minimumNumberOfRunningTasks The minimum number of running Fargate tasks.
 * @property privateSubnets The private subnets of your infrastructure.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 * @property tasksSecurityGroup The security group used by your Fargate tasks.
 */
export interface IServiceConstructProps {
  applicationLoadBalancerTargetGroup: LbTargetGroup;
  cluster: EcsCluster;
  containerListenPort: number;
  containerName: string;
  currentTaskDefinition: DataAwsEcsTaskDefinition;
  mainTaskDefinition: EcsTaskDefinition;
  minimumNumberOfRunningTasks: number;
  privateSubnets: Subnet[];
  resourceNamesPrefix: string;
  tasksSecurityGroup: SecurityGroup;
}

/**
 * Represents the Fargate service that will manage your tasks.
 * @class
 * @extends Construct
 */
export class ServiceConstruct extends Construct {
  /**
   * The Fargate service.
   */
  readonly self: EcsService

  /**
   * Creates a service construct.
   * @param scope The scope to attach the service construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The service construct properties.
   */
  constructor(scope: Construct, id: string, props: IServiceConstructProps) {
    super(scope, id)

    if (props.minimumNumberOfRunningTasks < 1) {
      throw new Error("Your Fargate cluster must run at least one task")
    }

    this.self = new EcsService(this, "fargate_service", {
      cluster: Token.asString(props.cluster.id),
      name: `${props.resourceNamesPrefix}_fargate_service`,
      desiredCount: props.minimumNumberOfRunningTasks,
      healthCheckGracePeriodSeconds: 240,
      deploymentMaximumPercent: 200,
      deploymentMinimumHealthyPercent: 100,
      launchType: "FARGATE",
      platformVersion: "1.4.0",
      loadBalancer: [{
        containerName: props.containerName,
        containerPort: props.containerListenPort,
        targetGroupArn: props.applicationLoadBalancerTargetGroup.arn,
      }],
      networkConfiguration: [{
        assignPublicIp: false,
        securityGroups: [
          Token.asString(props.tasksSecurityGroup.id),
        ],
        subnets: props.privateSubnets.map(privateSubnet => Token.asString(privateSubnet.id)),
      }],
      taskDefinition: `${props.mainTaskDefinition.family}:\${max(${props.mainTaskDefinition.fqn}.revision, ${props.currentTaskDefinition.fqn}.revision)}`,
      lifecycle: {
        // <!> Make sure to not overwrite auto-scaling
        ignoreChanges: [
          "desired_count",
        ],
      },
      dependsOn: [
        props.applicationLoadBalancerTargetGroup,
        props.mainTaskDefinition,
      ],
    })
  }
}

export default ServiceConstruct
