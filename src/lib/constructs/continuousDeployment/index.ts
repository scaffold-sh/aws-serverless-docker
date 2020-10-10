import { Construct } from "constructs"

import {
  CloudwatchLogGroup,
  DataAwsCallerIdentity,
  DataAwsRegion,
  EcrRepository,
  EcsCluster,
  EcsService,
  EcsTaskDefinition,
  S3Bucket,
  SecurityGroup,
  SsmParameter,
  Subnet,
  Vpc,
} from "../../../imports/providers/aws"

import BuildsConstruct from "./builds"
import PipelineConstruct from "./pipeline"

/**
 * Represents the properties of the continuous deployment construct.
 * @property awsProfile The AWS named profile used to create your infrastructure.
 * @property buildsEnvironmentVariables The SSM parameters that contains your builds environment variables.
 * @property containerName A name chosen to designate your Docker container.
 * @property containersLogsGroup The log group used to store your container logs.
 * @property currentAccount The AWS account used to create your infrastructure.
 * @property currentRegion The AWS region used to create your DocumentDB cluster as data object.
 * @property currentRegionAsString The AWS region used to create your infrastructure as string.
 * @property ecrRepository The ECR repository used to store your Docker images.
 * @property fargateCluster The Fargate cluster used in your infrastructure.
 * @property fargateService The AWS Fargate service used in your infrastructure.
 * @property fargateTasksSecurityGroup The security group used by your Fargate tasks.
 * @property githubBranch The GitHub branch from which you want to deploy.
 * @property githubOauthToken The GitHub OAuth token used by your pipeline to access your repository.
 * @property githubRepo The GitHub repository used as source for your pipeline.
 * @property githubRepoOwner The GitHub repository owner (an user or an organization).
 * @property githubWebhookToken A random token that will be used by CodePipeline and GitHub to prevent impersonation
 * @property predeployFargateTaskDefinition The pre-deploy Fargate task definition.
 * @property privateSubnets The private subnets of your infrastructure.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 * @property vpc The VPC of your infrastructure.
 */
export interface IContinuousDeploymentConstructProps {
  awsProfile: string;
  buildsEnvironmentVariables: SsmParameter[];
  containerName: string;
  containersLogGroup: CloudwatchLogGroup;
  currentAccount: DataAwsCallerIdentity;
  currentRegion: DataAwsRegion;
  currentRegionAsString: string;
  ecrRepository: EcrRepository;
  fargateCluster: EcsCluster;
  fargateService: EcsService;
  fargateTasksSecurityGroup: SecurityGroup;
  githubBranch: string;
  githubOauthToken: string;
  githubRepo: string;
  githubRepoOwner: string;
  githubWebhookToken: string;
  predeployFargateTaskDefinition: EcsTaskDefinition;
  privateSubnets: Subnet[];
  resourceNamesPrefix: string;
  vpc: Vpc;
}

/**
 * Represents the components of the deployment pipeline
 * for your infrastructure.
 * @class
 * @extends Construct
 */
export class ContinuousDeploymentConstruct extends Construct {
  /**
   * The security group used by CodeBuild instances.
   */
  readonly buildsSecurityGroup: SecurityGroup

  /**
   * The URL to the deployment pipeline execution details on AWS.
   */
  readonly pipelineExecutionDetailsUrl: string

  /**
   * Creates a continuous deployment construct.
   * @param scope The scope to attach the continuous deployment construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The continuous deployment construct properties.
   */
  constructor(scope: Construct, id: string, props: IContinuousDeploymentConstructProps) {
    super(scope, id)

    const pipelineS3Bucket = new S3Bucket(this, "pipeline_s3_bucket", {
      acl: "private",
      bucket: `${props.resourceNamesPrefix.replace(/[^a-z0-9.-]/gi, "-")}-codepipeline-bucket`,
      forceDestroy: true,
    })

    const builds = new BuildsConstruct(this, "builds", {
      resourceNamesPrefix: props.resourceNamesPrefix,
      currentAccount: props.currentAccount,
      currentRegion: props.currentRegion,
      pipelineS3Bucket,
      vpc: props.vpc,
      privateSubnets: props.privateSubnets,
      ecrRepository: props.ecrRepository,
      fargateCluster: props.fargateCluster,
      predeployFargateTaskDefinition: props.predeployFargateTaskDefinition,
      fargateTasksSecurityGroup: props.fargateTasksSecurityGroup,
      containersLogsGroup: props.containersLogGroup,
      containerName: props.containerName,
      environmentVariables: props.buildsEnvironmentVariables,
    })

    this.buildsSecurityGroup = builds.securityGroup

    const pipeline = new PipelineConstruct(this, "pipeline", {
      awsProfile: props.awsProfile,
      resourceNamesPrefix: props.resourceNamesPrefix,
      currentRegionAsString: props.currentRegionAsString,
      codebuildBuildProject: builds.codebuildBuildProject,
      codebuildPreDeployProject: builds.codebuildPreDeployProject,
      codebuildTestProject: builds.codebuildTestProject,
      selfS3Bucket: pipelineS3Bucket,
      fargateCluster: props.fargateCluster,
      fargateService: props.fargateService,
      githubBranch: props.githubBranch,
      githubRepo: props.githubRepo,
      githubRepoOwner: props.githubRepoOwner,
      githubOauthToken: props.githubOauthToken,
      githubWebhookToken: props.githubWebhookToken,
    })

    this.pipelineExecutionDetailsUrl = pipeline.executionDetailsUrl
  }
}

export default ContinuousDeploymentConstruct
