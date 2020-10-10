import { Construct } from "constructs"

import {
  CloudwatchLogGroup,
  DataAwsCallerIdentity,
  DataAwsRegion,
  EcrRepository,
  EcsCluster,
  EcsService,
  EcsTaskDefinition,
  LbTargetGroup,
  SecurityGroup,
  SsmParameter,
  Subnet,
  Vpc,
} from "../../../imports/providers/aws"

import ClusterConstruct from "./cluster"
import RepositoryConstruct from "./repository"

import ServiceConstruct from "./service"
import TasksConstruct from "./tasks"

import AutoScalingConstruct from "./autoScaling"
import EnvironmentVariablesConstruct from "./environmentVariables"

import { EnvironmentVariables } from "../../../main"

/**
 * Represents the properties of the computing construct.
 * @property applicationLoadBalancerSecurityGroup The security group attached to your application load balancer.
 * @property applicationLoadBalancerTargetGroup The target group attached to your application load balancer.
 * @property autoScalingCpuLimitPercent The cpu usage required to trigger auto-scaling.
 * @property autoScalingMemoryLimitPercent The memory usage required to trigger auto-scaling.
 * @property buildsEnvironmentVariables The environment variables of your builds as "key => value" format.
 * @property containerListenPort The port that needs to be used to send requests to your Docker container.
 * @property containerName A name chosen to designate your Docker container.
 * @property currentAccount The AWS account used to create your infrastructure.
 * @property currentRegion The AWS region used to create your infrastructure as data object.
 * @property dockerImageName A name chosen to designate your Docker image in your ECR repository.
 * @property enableAutoScaling Do auto-scaling needs to be enabled?
 * @property environmentVariables The environment variables of your application as "key => value" format.
 * @property fargateTasksCpu The CPU used by your Fargate tasks.
 * @property fargateTasksMemory The memory used by your Fargate tasks.
 * @property minimumNumberOfRunningFargateTasks The minimum number of running Fargate tasks.
 * @property maximumNumberOfRunningFargateTasks The maximum number of running Fargate tasks.
 * @property preDeployCommand A command that will run in a newly created production container, just before deployment.
 * @property privateSubnets The private subnets of your infrastructure.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 * @property vpc The VPC of your infrastructure.
 */
export interface IComputingConstructProps {
  applicationLoadBalancerSecurityGroup: SecurityGroup;
  applicationLoadBalancerTargetGroup: LbTargetGroup;
  autoScalingCpuLimitPercent: number;
  autoScalingMemoryLimitPercent: number;
  buildsEnvironmentVariables: EnvironmentVariables;
  containerListenPort: number;
  containerName: string;
  currentAccount: DataAwsCallerIdentity;
  currentRegion: DataAwsRegion;
  dockerImageName: string;
  enableAutoScaling: boolean;
  environmentVariables: EnvironmentVariables;
  fargateTasksCpu: string;
  fargateTasksMemory: string;
  maximumNumberOfRunningFargateTasks: number;
  minimumNumberOfRunningFargateTasks: number;
  preDeployCommand: string;
  privateSubnets: Subnet[];
  resourceNamesPrefix: string;
  vpc: Vpc;
}

/**
 * Represents all the components required to run your Fargate cluster.
 * @class
 * @extends Construct
 */
export class ComputingConstruct extends Construct {
  /**
   * The builds environment variables as SSM parameters.
   */
  readonly buildsEnvironmentVariables: SsmParameter[]

  /**
   * The log group used to store your container logs.
   */
  readonly containersLogsGroup: CloudwatchLogGroup

  /**
   * The ECR repository used to store your Docker images.
   */
  readonly ecrRepository: EcrRepository

  /**
   * The Fargate cluster.
   */
  readonly fargateCluster: EcsCluster

  /**
   * The Fargate service that will manage your tasks.
   */
  readonly fargateService: EcsService

  /**
   * The security group used by your Fargate tasks.
   */
  readonly fargateTasksSecurityGroup: SecurityGroup

  /**
   * The pre-deploy Fargate task defintion.
   */
  readonly predeployFargateTaskDefinition: EcsTaskDefinition

  /**
   * Creates a computing construct.
   * @param scope The scope to attach the computing construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The computing construct properties.
   */
  constructor(scope: Construct, id: string, props: IComputingConstructProps) {
    super(scope, id)

    this.containersLogsGroup = new CloudwatchLogGroup(this, "containers_logs_group", {
      name: `${props.resourceNamesPrefix}_fargate_containers`,
    })

    const environmentVariables = new EnvironmentVariablesConstruct(this, "environment_variables", {
      buildsEnvironmentVariables: props.buildsEnvironmentVariables,
      environmentVariables: props.environmentVariables,
      resourceNamesPrefix: props.resourceNamesPrefix,
    })

    this.buildsEnvironmentVariables = environmentVariables.buildsEnvironmentVariables

    const cluster = new ClusterConstruct(this, "cluster", {
      resourceNamesPrefix: props.resourceNamesPrefix,
    })

    this.fargateCluster = cluster.self

    const repository = new RepositoryConstruct(this, "repository", {
      resourceNamesPrefix: props.resourceNamesPrefix,
      dockerImageName: props.dockerImageName,
    })

    this.ecrRepository = repository.self

    const tasks = new TasksConstruct(this, "task", {
      resourceNamesPrefix: props.resourceNamesPrefix,
      tasksCpu: props.fargateTasksCpu,
      tasksMemory: props.fargateTasksMemory,
      vpc: props.vpc,
      currentAccount: props.currentAccount,
      currentRegion: props.currentRegion,
      containersLogsGroup: this.containersLogsGroup,
      containerListenPort: props.containerListenPort,
      containerName: props.containerName,
      applicationLoadBalancerSecurityGroup: props.applicationLoadBalancerSecurityGroup,
      ecrRepository: repository.self,
      environmentVariables: environmentVariables.applicationEnvironmentVariables,
      preDeployCommand: props.preDeployCommand,
    })

    this.fargateTasksSecurityGroup = tasks.securityGroup
    this.predeployFargateTaskDefinition = tasks.preDeployDefinition

    const service = new ServiceConstruct(this, "service", {
      resourceNamesPrefix: props.resourceNamesPrefix,
      containerListenPort: props.containerListenPort,
      containerName: props.containerName,
      applicationLoadBalancerTargetGroup: props.applicationLoadBalancerTargetGroup,
      privateSubnets: props.privateSubnets,
      tasksSecurityGroup: tasks.securityGroup,
      mainTaskDefinition: tasks.mainDefinition,
      minimumNumberOfRunningTasks: props.minimumNumberOfRunningFargateTasks,
      currentTaskDefinition: tasks.currentDefinition,
      cluster: cluster.self,
    })

    this.fargateService = service.self

    if (props.enableAutoScaling) {
      new AutoScalingConstruct(this, "auto_scaling", {
        resourceNamesPrefix: props.resourceNamesPrefix,
        cluster: cluster.self,
        cpuLimitPercent: props.autoScalingCpuLimitPercent,
        memoryLimitPercent: props.autoScalingMemoryLimitPercent,
        maximumNumberOfRunningTasks: props.maximumNumberOfRunningFargateTasks,
        minimumNumberOfRunningTasks: props.minimumNumberOfRunningFargateTasks,
        service: service.self,
      })
    }
  }
}

export default ComputingConstruct
