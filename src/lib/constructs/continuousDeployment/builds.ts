import { resolve } from "path"
import { readFileSync } from "fs"

import { Token } from "cdktf"
import { Construct } from "constructs"

import {
  CloudwatchLogGroup,
  CodebuildProject,
  DataAwsCallerIdentity,
  DataAwsIamPolicyDocument,
  DataAwsRegion,
  EcrRepository,
  EcsCluster,
  EcsTaskDefinition,
  IamRole,
  IamRolePolicy,
  S3Bucket,
  SecurityGroup,
  SsmParameter,
  Subnet,
  Vpc,
} from "../../../imports/providers/aws"

import overrideNullValuesForSecurityGroup from "../../../utils/overrideNullValuesForSecurityGroup"
import escapeTemplateForTerraform from "../../../utils/escapeTemplateForTerraform"

/**
 * Represents the properties of the builds construct.
 * @property containerName A name chosen to designate your Docker container.
 * @property containersLogsGroup The log group used to store your container logs.
 * @property currentAccount The AWS account used to create your infrastructure.
 * @property currentRegion The region used to create your DocumentDB cluster as data object.
 * @property ecrRepository The ECR repository used to store your Docker images.
 * @property environmentVariables The SSM parameters that contain your builds environment variables.
 * @property fargateCluster The Fargate cluster used in your infrastructure.
 * @property fargateTasksSecurityGroup The security group used by your Fargate tasks.
 * @property pipelineS3Bucket The S3 bucket containing your pipeline artifacts.
 * @property predeployFargateTaskDefinition The pre-deploy Fargate task definition.
 * @property privateSubnets The private subnets of your infrastructure.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 * @property vpc The VPC of your infrastructure.
 */
export interface IBuildConstructProps {
  containerName: string;
  containersLogsGroup: CloudwatchLogGroup;
  currentAccount: DataAwsCallerIdentity;
  currentRegion: DataAwsRegion;
  ecrRepository: EcrRepository;
  environmentVariables: SsmParameter[];
  fargateCluster: EcsCluster;
  fargateTasksSecurityGroup: SecurityGroup;
  pipelineS3Bucket: S3Bucket;
  predeployFargateTaskDefinition: EcsTaskDefinition;
  privateSubnets: Subnet[];
  resourceNamesPrefix: string;
  vpc: Vpc;
}

/**
 * Represents the test, build and pre-deploy stages of your pipeline.
 * @class
 * @extends Construct
 */
export class BuildsConstruct extends Construct {
  /**
   * The CodeBuild build project.
   */
  readonly codebuildBuildProject: CodebuildProject

  /**
   * The CodeBuild pre-deploy project.
   */
  readonly codebuildPreDeployProject: CodebuildProject

  /**
   * The CodeBuild test project.
   */
  readonly codebuildTestProject: CodebuildProject

  /**
   * The security group used by your CodeBuild instances.
   */
  readonly securityGroup: SecurityGroup

  /**
   * Creates a builds construct.
   * @param scope The scope to attach the builds construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The builds construct properties.
   */
  constructor(scope: Construct, id: string, props: IBuildConstructProps) {
    super(scope, id)

    const buildsLogsGroup = `${props.resourceNamesPrefix}_codebuild_logs_group`

    this.securityGroup = overrideNullValuesForSecurityGroup(new SecurityGroup(this, "codebuild_security_group", {
      description: "Allow outbound access to CodeBuild from our vpc",
      egress: [{
        cidrBlocks: [
          "0.0.0.0/0",
        ],
        fromPort: 0,
        protocol: "-1",
        toPort: 0,
      }],
      name: `${props.resourceNamesPrefix}_codebuild_security_group`,
      tags: {
        Name: `${props.resourceNamesPrefix}_codebuild_security_group`,
      },
      vpcId: Token.asString(props.vpc.id),
    }))

    const buildsAssumeRolePolicyDocument = new DataAwsIamPolicyDocument(this, "codebuild_assume_role_policy", {
      version: "2012-10-17",
      statement: [{
        effect: "Allow",
        principals: [{
          type: "Service",
          identifiers: [
            "codebuild.amazonaws.com",
          ],
        }],
        actions: [
          "sts:AssumeRole",
        ],
      }],
    })

    const buildsRole = new IamRole(this, "codebuild_role", {
      assumeRolePolicy: buildsAssumeRolePolicyDocument.json,
      name: `${props.resourceNamesPrefix}_codebuild_role`,
      forceDetachPolicies: true,
    })

    const buildsRolePolicyDocument = new DataAwsIamPolicyDocument(this, "codebuild_role_policy_document", {
      version: "2012-10-17",
      statement: [{
        effect: "Allow",
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
        ],
        resources: [
          `arn:aws:logs:${Token.asString(props.currentRegion.name)}:${props.currentAccount.accountId}:log-group:${buildsLogsGroup}`,
          `arn:aws:logs:${Token.asString(props.currentRegion.name)}:${props.currentAccount.accountId}:log-group:${buildsLogsGroup}:*`,
          `${props.containersLogsGroup.arn}`,
          `${props.containersLogsGroup.arn}:*`,
        ],
      }, {
        effect: "Allow",
        actions: [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:PutObject",
          "s3:GetBucketAcl",
          "s3:GetBucketLocation",
        ],
        resources: [
          `${Token.asString(props.pipelineS3Bucket.arn)}`,
          `${Token.asString(props.pipelineS3Bucket.arn)}/*`,
        ],
      }, {
        effect: "Allow",
        actions: [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ],
        resources: [
          `${props.ecrRepository.arn}`,
        ],
      }, {
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
          "ecs:DescribeTasks",
          "ecs:RunTask",
        ],
        resources: [
          "*",
        ],
        condition: [{
          test: "StringEquals",
          values: [
            props.fargateCluster.arn,
          ],
          variable: "ecs:cluster",
        }],
      }, {
        effect: "Allow",
        actions: [
          "ssm:GetParameters",
        ],
        resources: [
          `arn:aws:ssm:${Token.asString(props.currentRegion.name)}:${props.currentAccount.accountId}:parameter/${props.resourceNamesPrefix}/builds-env/*`,
        ],
      }, {
        effect: "Allow",
        actions: [
          "iam:passRole",
        ],
        resources: [
          "*",
        ],
        condition: [{
          test: "StringEqualsIfExists",
          values: [
            "ecs-tasks.amazonaws.com",
          ],
          variable: "iam:PassedToService",
        }],
      }, {
        effect: "Allow",
        actions: [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeDhcpOptions",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeVpcs",
        ],
        resources: [
          "*",
        ],
      }, {
        effect: "Allow",
        actions: [
          "ec2:CreateNetworkInterfacePermission",
        ],
        resources: [
          `arn:aws:ec2:${Token.asString(props.currentRegion.name)}:${props.currentAccount.accountId}:network-interface/*`,
        ],
        condition: [{
          test: "StringEquals",
          values: props.privateSubnets.map(privateSubnet => privateSubnet.arn),
          variable: "ec2:Subnet",
        }, {
          test: "StringEquals",
          values: [
            "codebuild.amazonaws.com",
          ],
          variable: "ec2:AuthorizedService",
        }],
      }],
    })

    new IamRolePolicy(this, "codebuild_role_policy", {
      name: `${props.resourceNamesPrefix}_codebuild_role_policy`,
      policy: buildsRolePolicyDocument.json,
      role: Token.asString(buildsRole.id),
    })

    const buildEnvironmentVariables = props.environmentVariables.map(environmentVariable => {
      return {
        name: environmentVariable.tags!.name,
        type: "PARAMETER_STORE",
        // Explicit dependency to SSM parameters
        value: `\${${environmentVariable.fqn}.name}`,
      }
    })

    const buildspec = escapeTemplateForTerraform(
      readFileSync(
        resolve(__dirname, "..", "..", "..", "..", "templates", "buildspec.yml")
      ).toString()
    )

    const buildProjectEnvironmentVariables = [{
      name: "AWS_ECR_REPOSITORY_URI",
      value: Token.asString(props.ecrRepository.repositoryUrl),
    }, {
      name: "CONTAINER_NAME",
      value: props.containerName,
    }].concat(buildEnvironmentVariables)

    this.codebuildBuildProject = new CodebuildProject(this, "codebuild_build_project", {
      artifacts: [{
        type: "CODEPIPELINE",
      }],
      buildTimeout: 60,
      cache: [{
        modes: [
          "LOCAL_DOCKER_LAYER_CACHE",
          "LOCAL_SOURCE_CACHE",
        ],
        type: "LOCAL",
      }],
      environment: [{
        computeType: "BUILD_GENERAL1_SMALL",
        image: "aws/codebuild/standard:4.0",
        imagePullCredentialsType: "CODEBUILD",
        privilegedMode: true,
        type: "LINUX_CONTAINER",
        environmentVariable: buildProjectEnvironmentVariables,
      }],
      logsConfig: [{
        cloudwatchLogs: [{
          groupName: buildsLogsGroup,
          streamName: `${props.resourceNamesPrefix}_codebuild_logs_stream`,
        }],
      }],
      name: `${props.resourceNamesPrefix}_codebuild_build_project`,
      serviceRole: buildsRole.arn,
      source: [{
        buildspec,
        type: "CODEPIPELINE",
      }],
      vpcConfig: [{
        vpcId: Token.asString(props.vpc.id),
        subnets: props.privateSubnets.map(privateSubnet => Token.asString(privateSubnet.id)),
        securityGroupIds: [
          Token.asString(this.securityGroup.id),
        ],
      }],
      dependsOn: [
        buildsRole,
      ],
    })

    const testspec = escapeTemplateForTerraform(
      readFileSync(
        resolve(__dirname, "..", "..", "..", "..", "templates", "testspec.yml")
      ).toString()
    )

    const testProjectEnvironmentVariables = buildEnvironmentVariables

    this.codebuildTestProject = new CodebuildProject(this, "codebuild_test_project", {
      artifacts: [{
        type: "CODEPIPELINE",
      }],
      buildTimeout: 60,
      cache: [{
        modes: [
          "LOCAL_DOCKER_LAYER_CACHE",
          "LOCAL_SOURCE_CACHE",
        ],
        type: "LOCAL",
      }],
      environment: [{
        computeType: "BUILD_GENERAL1_SMALL",
        image: "aws/codebuild/standard:4.0",
        imagePullCredentialsType: "CODEBUILD",
        privilegedMode: true,
        type: "LINUX_CONTAINER",
        environmentVariable: testProjectEnvironmentVariables,
      }],
      logsConfig: [{
        cloudwatchLogs: [{
          groupName: buildsLogsGroup,
          streamName: `${props.resourceNamesPrefix}_codebuild_test_logs_stream`,
        }],
      }],
      name: `${props.resourceNamesPrefix}_codebuild_test_project`,
      serviceRole: buildsRole.arn,
      source: [{
        buildspec: testspec,
        type: "CODEPIPELINE",
      }],
      vpcConfig: [{
        vpcId: Token.asString(props.vpc.id),
        subnets: props.privateSubnets.map(privateSubnet => Token.asString(privateSubnet.id)),
        securityGroupIds: [
          Token.asString(this.securityGroup.id),
        ],
      }],
      dependsOn: [
        buildsRole,
      ],
    })

    const preDeployspec = escapeTemplateForTerraform(
      readFileSync(
        resolve(__dirname, "..", "..", "..", "..", "templates", "predeployspec.yml")
      ).toString()
    )

    const preDeployBuildTimeoutMinutes = 60

    const preDeployProjectEnvironmentVariables = [{
      name: "WAITER_MAX_RETRIES",
      // <!> Make sure that the timeout
      // configured for the pre-deploy project
      // will be sufficient to handle your retries.
      // The aws ecs wait tasks-stopped polls for 10 minutes each time.
      value: String(preDeployBuildTimeoutMinutes / 10),
    }, {
      name: "AWS_ECS_CLUSTER",
      value: props.fargateCluster.name,
    }, {
      name: "AWS_ECS_PRE_DEPLOY_TASK_DEF",
      value: props.predeployFargateTaskDefinition.family,
    }, {
      name: "AWS_ECS_PRE_DEPLOY_TASK_SUBNETS",
      value: props.privateSubnets.map(privateSubnet => Token.asString(privateSubnet.id)).join(","),
    }, {
      name: "AWS_ECS_PRE_DEPLOY_TASK_SECURITY_GROUPS",
      value: Token.asString(props.fargateTasksSecurityGroup.id),
    }, {
      name: "AWS_ECS_PRE_DEPLOY_TASK_CONTAINER_NAME",
      value: props.containerName,
    }, {
      name: "AWS_ECS_PRE_DEPLOY_TASK_ASSIGN_PUBLIC_IP",
      value: "DISABLED",
    }, {
      name: "AWS_ECS_PRE_DEPLOY_TASK_LOGS_GROUP_NAME",
      value: Token.asString(props.containersLogsGroup.name),
    }, {
      name: "AWS_ECS_PRE_DEPLOY_TASK_LOGS_STREAM_PREFIX",
      value: `${props.resourceNamesPrefix}/${props.containerName}`,
    }].concat(buildEnvironmentVariables)

    this.codebuildPreDeployProject = new CodebuildProject(this, "codebuild_pre_deploy_project", {
      artifacts: [{
        type: "CODEPIPELINE",
      }],
      buildTimeout: preDeployBuildTimeoutMinutes,
      cache: [{
        modes: [
          "LOCAL_DOCKER_LAYER_CACHE",
          "LOCAL_SOURCE_CACHE",
        ],
        type: "LOCAL",
      }],
      environment: [{
        computeType: "BUILD_GENERAL1_SMALL",
        image: "aws/codebuild/standard:4.0",
        imagePullCredentialsType: "CODEBUILD",
        privilegedMode: true,
        type: "LINUX_CONTAINER",
        environmentVariable: preDeployProjectEnvironmentVariables,
      }],
      logsConfig: [{
        cloudwatchLogs: [{
          groupName: buildsLogsGroup,
          streamName: `${props.resourceNamesPrefix}_codebuild_pre_deploy_logs_stream`,
        }],
      }],
      name: `${props.resourceNamesPrefix}_codebuild_pre_deploy_project`,
      serviceRole: buildsRole.arn,
      source: [{
        buildspec: preDeployspec,
        type: "CODEPIPELINE",
      }],
      vpcConfig: [{
        vpcId: Token.asString(props.vpc.id),
        subnets: props.privateSubnets.map(privateSubnet => Token.asString(privateSubnet.id)),
        securityGroupIds: [
          Token.asString(this.securityGroup.id),
        ],
      }],
      dependsOn: [
        buildsRole,
      ],
    })
  }
}

export default BuildsConstruct
