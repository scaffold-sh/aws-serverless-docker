// Populate "process.env"
require("dotenv-flow").config({ path: require("path").resolve(__dirname, "..") })

import { Construct } from "constructs"

import {
  App,
  S3Backend,
  TerraformOutput,
  TerraformStack,
  Token,
} from "cdktf"

import {
  AwsProvider,
  DataAwsCallerIdentity,
  DataAwsRegion,
} from "./imports/providers/aws"

import ContinuousDeploymentConstruct from "./lib/constructs/continuousDeployment"
import NetworkConstruct from "./lib/constructs/network"

import ComputingConstruct from "./lib/constructs/computing"
import DashboardConstruct from "./lib/constructs/dashboard"

/**
 * Represents your environment variables as "key => value" format.
 */
export type EnvironmentVariables = { [key: string]: string }

/**
 * Represents the Scaffold AWS Serverless Docker infrastructure.
 * @class
 * @extends TerraformStack
 */
class ScaffoldAWSServerlessDocker extends TerraformStack {
  /**
   * Creates the Scaffold AWS Serverless Docker infrastructure.
   * @param scope The scope to attach the infrastructure to.
   * @param id An unique id used to distinguish constructs.
   */
  constructor(scope: Construct, id: string) {
    super(scope, id)

    Object.keys(process.env).forEach(environmentVariableName => {
      if (!environmentVariableName.match(/^[a-z0-9_-]+$/gi)) {
        throw new Error("Environment variable names must match /^[a-z0-9_-]+$/i format")
      }
    })

    const resourceNamesPrefix = process.env.SCAFFOLD_RESOURCE_NAMES_PREFIX
    const numberOfAvailabilityZonesUsed = Number(process.env.NUMBER_OF_AVAILABILITY_ZONES_USED)

    if (!numberOfAvailabilityZonesUsed) {
      throw new Error("Invalid number of availability zones used")
    }

    const enableAutoScaling = process.env.ENABLE_AUTO_SCALING === "true"
    const autoScalingMemoryLimitPercent = 75
    const autoScalingCpuLimitPercent = 75

    const minimumNumberOfRunningFargateTasks = numberOfAvailabilityZonesUsed
    const maximumNumberOfRunningFargateTasks = Math.ceil(minimumNumberOfRunningFargateTasks * 1.5)

    const fargateTasksCpu = process.env.FARGATE_TASKS_CPU
    const fargateTasksMemory = process.env.FARGATE_TASKS_MEMORY

    // Random names. Could be set to anything
    // but BEFORE first creation.
    const dockerImageName = "main"
    const containerName = "main"

    const containerListenPort = Number(process.env.CONTAINER_LISTEN_PORT)

    if (!containerListenPort) {
      throw new Error("Invalid container listen port")
    }

    const domainNames = process.env.DOMAIN_NAMES.split(",")
    const enableHttps = process.env.ENABLE_HTTPS === "true"

    const preDeployCommand = process.env.PRE_DEPLOY_COMMAND || "echo No pre-deploy command"

    // Environment variables that start with "APPLICATION_"
    // will become your application environment variables
    const environmentVariables = Object
      .keys(process.env)
      .filter(environmentVariableKey => environmentVariableKey.startsWith("APPLICATION_"))
      .reduce((acc, environmentVariableKey) => {
        acc[environmentVariableKey.replace(/^APPLICATION_/, "")] = process.env[environmentVariableKey] as string
        return acc
      }, {} as EnvironmentVariables)

    // Environment variables that start with "BUILD_"
    // will become your builds environment variables
    const buildsEnvironmentVariables = Object
      .keys(process.env)
      .filter(environmentVariableKey => environmentVariableKey.startsWith("BUILD_"))
      .reduce((acc, environmentVariableKey) => {
        acc[environmentVariableKey.replace(/^BUILD_/, "")] = process.env[environmentVariableKey] as string
        return acc
      }, {} as EnvironmentVariables)

    const githubOauthToken = process.env.GITHUB_OAUTH_TOKEN
    const githubWebhookToken = process.env.GITHUB_WEBHOOK_TOKEN

    const githubRepo = process.env.GITHUB_REPO
    const githubRepoOwner = process.env.GITHUB_REPO_OWNER
    const githubBranch = process.env.GITHUB_BRANCH

    const awsS3BackendKey = process.env.SCAFFOLD_AWS_S3_BACKEND_KEY
    const awsS3BackendBucket = process.env.SCAFFOLD_AWS_S3_BACKEND_BUCKET
    const awsS3BackendDynamodbTable = process.env.SCAFFOLD_AWS_S3_BACKEND_DYNAMODB_TABLE

    const awsRegion = process.env.SCAFFOLD_AWS_REGION
    const awsProfile = process.env.SCAFFOLD_AWS_PROFILE

    new S3Backend(this, {
      key: awsS3BackendKey,
      bucket: awsS3BackendBucket,
      dynamodbTable: awsS3BackendDynamodbTable,
      encrypt: true,
      region: awsRegion,
      profile: awsProfile,
    })

    new AwsProvider(this, "aws", {
      region: awsRegion,
      profile: awsProfile,
    })

    const currentRegion = new DataAwsRegion(this, "current_region", {})
    const currentAccount = new DataAwsCallerIdentity(this, "current_account", {})

    const network = new NetworkConstruct(this, "network", {
      resourceNamesPrefix,
      currentAccount,
      domainNames,
      enableHttps,
      currentRegionAsString: awsRegion,
      numberOfAvailabilityZonesUsed,
    })

    const computing = new ComputingConstruct(this, "computing", {
      autoScalingCpuLimitPercent,
      autoScalingMemoryLimitPercent,
      buildsEnvironmentVariables,
      resourceNamesPrefix,
      dockerImageName,
      containerName,
      containerListenPort,
      enableAutoScaling,
      fargateTasksCpu,
      fargateTasksMemory,
      privateSubnets: network.privateSubnets,
      currentAccount,
      currentRegion,
      vpc: network.vpc,
      applicationLoadBalancerSecurityGroup: network.applicationLoadBalancerSecurityGroup,
      applicationLoadBalancerTargetGroup: network.applicationLoadBalancerTargetGroup,
      environmentVariables,
      preDeployCommand,
      minimumNumberOfRunningFargateTasks,
      maximumNumberOfRunningFargateTasks,
    })

    // Prevent cycle with the ECS task security group.
    // Only allow outbound traffic to Fargate tasks.
    network.applicationLoadBalancerSecurityGroupEgressRule.addOverride(
      "source_security_group_id",
      Token.asString(computing.fargateTasksSecurityGroup.id)
    )

    const continuousDeployment = new ContinuousDeploymentConstruct(this, "continuous_deployment", {
      awsProfile: awsProfile,
      buildsEnvironmentVariables: computing.buildsEnvironmentVariables,
      currentRegion,
      currentRegionAsString: awsRegion,
      currentAccount,
      resourceNamesPrefix,
      vpc: network.vpc,
      privateSubnets: network.privateSubnets,
      ecrRepository: computing.ecrRepository,
      fargateCluster: computing.fargateCluster,
      fargateService: computing.fargateService,
      predeployFargateTaskDefinition: computing.predeployFargateTaskDefinition,
      fargateTasksSecurityGroup: computing.fargateTasksSecurityGroup,
      containersLogGroup: computing.containersLogsGroup,
      containerName,
      githubBranch,
      githubRepo,
      githubRepoOwner,
      githubOauthToken,
      githubWebhookToken,
    })

    const dashboard = new DashboardConstruct(this, "dashboard", {
      applicationLoadBalancer: network.applicationLoadBalancer,
      applicationLoadBalancerTargetGroup: network.applicationLoadBalancerTargetGroup,
      autoScalingCpuLimitPercent,
      autoScalingMemoryLimitPercent,
      containersLogsGroup: computing.containersLogsGroup,
      currentRegion,
      enableAutoScaling,
      fargateCluster: computing.fargateCluster,
      fargateService: computing.fargateService,
      resourceNamesPrefix,
    })

    new TerraformOutput(this, "application_load_balancer_uri", {
      value: network.applicationLoadBalancer.dnsName,
    })

    new TerraformOutput(this, "dashboard_url", {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${Token.asString(currentRegion.name)}#dashboards:name=${dashboard.self.dashboardName}`,
    })

    new TerraformOutput(this, "pipeline_execution_details_url", {
      value: continuousDeployment.pipelineExecutionDetailsUrl,
    })

    new TerraformOutput(this, "ssl_validation_dns_records", {
      value: network.sslValidationDnsRecords,
    })
  }
}

const app = new App()
new ScaffoldAWSServerlessDocker(app, "scaffold_aws_serverless_docker")
app.synth()
