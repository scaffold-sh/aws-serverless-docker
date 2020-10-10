declare global {
  namespace NodeJS {
    /**
     * Represents the environment variables of your infrastructure.
     * @property CONTAINER_LISTEN_PORT The port that needs to be used to send requests to your Docker container.
     * @property DOMAIN_NAMES The domain names that need to be covered by your ACM certificate.
     * @property ENABLE_AUTO_SCALING Do auto-scaling needs to be enabled?
     * @property ENABLE_HTTPS Do HTTPS needs to be enabled?
     * @property FARGATE_TASKS_CPU The CPU that could be used by your Fargate tasks.
     * @property FARGATE_TASKS_MEMORY The memory that could be used by your Fargate tasks.
     * @property GITHUB_BRANCH The branch from which you want to deploy.
     * @property GITHUB_OAUTH_TOKEN The GitHub OAuth token that will be used by CodePipeline to pull your source code from your repository.
     * @property GITHUB_REPO The GitHub repository that contains your source code.
     * @property GITHUB_REPO_OWNER The owner of your GitHub repository. Can be a regular user or an organization.
     * @property GITHUB_WEBHOOK_TOKEN A random token that will be used by CodePipeline and GitHub to prevent impersonation.
     * @property NODE_ENV The current loaded environment.
     * @property NUMBER_OF_AVAILABILITY_ZONES_USED 	The number of availability zones used by your infrastructure.
     * @property PRE_DEPLOY_COMMAND A command that will run in a newly created production container, just before deployment.
     * @property SCAFFOLD_AWS_PROFILE The AWS named profile used to create your infrastructure.
     * @property SCAFFOLD_AWS_REGION The AWS region where you want to create your infrastructure.
     * @property SCAFFOLD_AWS_S3_BACKEND_BUCKET The AWS S3 bucket that will contain the Terraform state of your infrastructure.
     * @property SCAFFOLD_AWS_S3_BACKEND_DYNAMODB_TABLE The AWS DynamoDB table that will be used to store the Terraform state locks.
     * @property SCAFFOLD_AWS_S3_BACKEND_KEY The S3 bucket key under which your Terraform state will be saved.
     * @property SCAFFOLD_RESOURCE_NAMES_PREFIX An unique custom prefix used to avoid name colision with existing resources.
     */
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface ProcessEnv {
      [key: string]: string;
      CONTAINER_LISTEN_PORT: string;
      DOMAIN_NAMES: string;
      ENABLE_AUTO_SCALING: string;
      ENABLE_HTTPS: string;
      FARGATE_TASKS_CPU: string;
      FARGATE_TASKS_MEMORY: string;
      GITHUB_BRANCH: string;
      GITHUB_OAUTH_TOKEN: string;
      GITHUB_REPO: string;
      GITHUB_REPO_OWNER: string;
      GITHUB_WEBHOOK_TOKEN: string;
      NODE_ENV: string;
      NUMBER_OF_AVAILABILITY_ZONES_USED: string;
      PRE_DEPLOY_COMMAND: string;
      SCAFFOLD_AWS_PROFILE: string;
      SCAFFOLD_AWS_REGION: string;
      SCAFFOLD_AWS_S3_BACKEND_BUCKET: string;
      SCAFFOLD_AWS_S3_BACKEND_DYNAMODB_TABLE: string;
      SCAFFOLD_AWS_S3_BACKEND_KEY: string;
      SCAFFOLD_RESOURCE_NAMES_PREFIX: string;
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
