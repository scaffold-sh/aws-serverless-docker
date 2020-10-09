import { Construct } from "constructs"
import { Token } from "cdktf"

import {
  CloudwatchLogGroup,
  DataAwsCallerIdentity,
  DataAwsEcsTaskDefinition,
  DataAwsIamPolicyDocument,
  DataAwsRegion,
  EcrRepository,
  EcsTaskDefinition,
  IamRole,
  IamRolePolicy,
  SecurityGroup,
  SsmParameter,
  Vpc,
} from "../../../imports/providers/aws"

import overrideNullValuesForSecurityGroup from "../../../utils/overrideNullValuesForSecurityGroup"

import escapeTemplateForTerraform from "../../../utils/escapeTemplateForTerraform"

/**
 * Represents the properties of the tasks construct.
 * @property applicationLoadBalancerSecurityGroup The security group attached to your application load balancer.
 * @property containerListenPort The port that needs to be used to send requests to your Docker container.
 * @property containerName A name chosen to designate your Docker container.
 * @property containersLogsGroup The log group used to store your container logs.
 * @property currentAccount The AWS account used to create your infrastructure.
 * @property currentRegion The region used to create your DocumentDB cluster as data object.
 * @property ecrRepository The ECR repository used to store your Docker images.
 * @property environmentVariables The SSM parameters that contains your application environment variables.
 * @property preDeployCommand A command that will run in a newly created production container, just before deployment.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 * @property tasksCpu The CPU used by your Fargate tasks.
 * @property tasksMemory The memory used by your Fargate tasks.
 * @property vpc The VPC of your infrastructure.
 */
export interface ITasksConstructProps {
  applicationLoadBalancerSecurityGroup: SecurityGroup;
  containerListenPort: number;
  containerName: string;
  containersLogsGroup: CloudwatchLogGroup;
  currentAccount: DataAwsCallerIdentity;
  currentRegion: DataAwsRegion;
  ecrRepository: EcrRepository;
  environmentVariables: SsmParameter[];
  preDeployCommand: string;
  resourceNamesPrefix: string;
  tasksCpu: string;
  tasksMemory: string;
  vpc: Vpc;
}

/**
 * Represents the Fargate tasks that will run your Docker
 * container during execution and pre-deploy stage.
 * @class
 * @extends Construct
 */
export class TasksConstruct extends Construct {
  /**
   * The current main Fargate task definition.
   */
  readonly currentDefinition: DataAwsEcsTaskDefinition

  /**
   * The main Fargate task definition.
   */
  readonly mainDefinition: EcsTaskDefinition

  /**
   * The pre-deploy Fargate task definition.
   */
  readonly preDeployDefinition: EcsTaskDefinition

  /**
   * The security group used by your Fargate tasks.
   */
  readonly securityGroup: SecurityGroup

  /**
   * Creates a tasks construct.
   * @param scope The scope to attach the tasks construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The tasks construct properties.
   */
  constructor(scope: Construct, id: string, props: ITasksConstructProps) {
    super(scope, id)

    const fargateTasksAssumeRolePolicyDocument = new DataAwsIamPolicyDocument(this, "fargate_tasks_assume_role_policy", {
      version: "2012-10-17",
      statement: [{
        effect: "Allow",
        principals: [{
          type: "Service",
          identifiers: [
            "ecs-tasks.amazonaws.com",
          ],
        }],
        actions: [
          "sts:AssumeRole",
        ],
      }],
    })

    const fargateTasksExecutionRole = new IamRole(this, "fargate_tasks_execution_role", {
      assumeRolePolicy: fargateTasksAssumeRolePolicyDocument.json,
      name: `${props.resourceNamesPrefix}_fargate_tasks_execution_role`,
      forceDetachPolicies: true,
    })

    const fargateTasksExecutionRolePolicyDocument = new DataAwsIamPolicyDocument(this, "fargate_tasks_execution_role_policy_document", {
      version: "2012-10-17",
      statement: [{
        effect: "Allow",
        actions: [
          "ecr:GetAuthorizationToken",
        ],
        resources: [
          "*",
        ],
      }, {
        effect: "Allow",
        actions: [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ],
        resources: [
          props.ecrRepository.arn,
        ],
      }, {
        effect: "Allow",
        actions: [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `${props.containersLogsGroup.arn}`,
          `${props.containersLogsGroup.arn}:*`,
        ],
      }, {
        effect: "Allow",
        actions: [
          "ssm:GetParameters",
        ],
        resources: [
          `arn:aws:ssm:${Token.asString(props.currentRegion.name)}:${props.currentAccount.accountId}:parameter/${props.resourceNamesPrefix}/fargate-tasks-env/*`,
        ],
      }],
    })

    new IamRolePolicy(this, "fargate_tasks_execution_role_policy", {
      name: `${props.resourceNamesPrefix}_fargate_tasks_execution_role_policy`,
      policy: fargateTasksExecutionRolePolicyDocument.json,
      role: Token.asString(fargateTasksExecutionRole.id),
    })

    this.securityGroup = overrideNullValuesForSecurityGroup(new SecurityGroup(this, "fargate_tasks_security_group", {
      description: "Allow inbound access from the application load balancer only",
      egress: [{
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: [
          "0.0.0.0/0",
        ],
      }],
      ingress: [{
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        securityGroups: [
          Token.asString(props.applicationLoadBalancerSecurityGroup.id),
        ],
      }],
      name: `${props.resourceNamesPrefix}_fargate_tasks_security_group`,
      tags: {
        Name: `${props.resourceNamesPrefix}_fargate_tasks_security_group`,
      },
      vpcId: Token.asString(props.vpc.id),
    }))

    const environmentVariablesAsTaskSecrets = props.environmentVariables.map(environmentVariable => {
      return {
        name: environmentVariable.tags!.name,
        valueFrom: Token.asString(environmentVariable.arn),
      }
    })

    this.mainDefinition = new EcsTaskDefinition(this, "main_fargate_tasks_definition", {
      containerDefinitions: JSON.stringify([{
        name: props.containerName,
        image: props.ecrRepository.repositoryUrl,
        portMappings: [{
          protocol: "tcp",
          containerPort: props.containerListenPort,
          hostPort: props.containerListenPort,
        }],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": Token.asString(props.containersLogsGroup.name),
            "awslogs-region": Token.asString(props.currentRegion.name),
            "awslogs-stream-prefix": props.resourceNamesPrefix,
          },
        },
        secrets: environmentVariablesAsTaskSecrets,
        essential: true,
      }]),
      cpu: props.tasksCpu,
      executionRoleArn: fargateTasksExecutionRole.arn,
      family: `${props.resourceNamesPrefix}_fargate_tasks`,
      memory: props.tasksMemory,
      networkMode: "awsvpc",
      requiresCompatibilities: [
        "FARGATE",
      ],
      dependsOn: [
        fargateTasksExecutionRole,
        props.ecrRepository,
      ],
    })

    this.preDeployDefinition = new EcsTaskDefinition(this, "pre_deploy_fargate_tasks_definition", {
      containerDefinitions: JSON.stringify([{
        name: props.containerName,
        image: `${props.ecrRepository.repositoryUrl}:latest`,
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": Token.asString(props.containersLogsGroup.name),
            "awslogs-region": Token.asString(props.currentRegion.name),
            "awslogs-stream-prefix": props.resourceNamesPrefix,
          },
        },
        entryPoint: [
          "sh",
          "-c",
        ],
        command: [
          escapeTemplateForTerraform(props.preDeployCommand),
        ],
        secrets: environmentVariablesAsTaskSecrets,
        essential: true,
      }]),
      cpu: props.tasksCpu,
      executionRoleArn: fargateTasksExecutionRole.arn,
      family: `${props.resourceNamesPrefix}_fargate_pre_deploy_task`,
      memory: props.tasksMemory,
      networkMode: "awsvpc",
      requiresCompatibilities: [
        "FARGATE",
      ],
      dependsOn: [
        fargateTasksExecutionRole,
        props.ecrRepository,
      ],
    })

    this.currentDefinition = new DataAwsEcsTaskDefinition(this, "current_main_fargate_tasks_definition", {
      taskDefinition: this.mainDefinition.family,
      dependsOn: [
        this.mainDefinition,
      ],
    })
  }
}

export default TasksConstruct
