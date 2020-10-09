<p align="center">
  <img src="/assets/docker.png" alt="Docker" height="200" />
</p>

<h1 align="center">AWS Serverless Docker</h1>

<h4 align="center">
  <a href="https://scaffold.sh/docs/infrastructures/aws/serverless-docker">Documentation</a> |
  <a href="https://scaffold.sh">Website</a> |
  <a href="https://medium.com/scaffold">Blog</a> |
  <a href="https://twitter.com/scaffold_sh">Twitter</a> |
  <a href="https://www.linkedin.com/company/scaffold-sh">LinkedIn</a>
</h4>

<p align="center"><b>+ $70</b> / month &nbsp;&nbsp;&nbsp;&nbsp;  <b>~ 4min</b> / create</p>

<p align="center">
  <a href="https://github.com/scaffold-sh/cli/blob/master/package.json"><img src="https://img.shields.io/node/v/@scaffold.sh/cli" alt="Node version"></a>
  <a href="https://yarnpkg.com/en/docs/install"><img src="https://img.shields.io/badge/yarn-%3E%3D1.21-blue" alt="Yarn version"></a>
    <a href="https://aws.amazon.com/cli/?nc1=h_ls"><img src="https://img.shields.io/badge/aws-%3E%3D2.0-0b1b2c" alt="AWS version"></a>
  <a href="https://www.terraform.io/downloads.html"><img src="https://img.shields.io/badge/terraform-13.0-5c44db" alt="Terraform version"></a>
  <a href="https://github.com/hashicorp/terraform-cdk"><img src="https://img.shields.io/badge/cdktf-%3E%3D0.14-green" alt="CDKTF version"></a>
  <a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/LICENSE"><img src="https://img.shields.io/github/license/scaffold-sh/aws-serverless-docker" alt="License"></a>
</p>

```console
$ scaffold aws:serverless-docker
```

This infrastructure uses **[AWS Fargate](https://aws.amazon.com/fargate)** to host your Docker container in a **serverless way**.

Your **GitHub account** will be connected to **[CodePipeline](https://aws.amazon.com/codepipeline)** and **[CodeBuild](https://aws.amazon.com/codebuild)**, so you will be able to build, test and deploy your application using the usual `git push` command.

[Your pipeline](https://aws.amazon.com/codepipeline) will be configured with 5 stages: Source, Test, Build, Pre-deploy and Deploy. The test, build and pre-deploy stages will run in CodeBuild.

The test stage may be used to run your unit/integration/e2e tests. **CodeBuild is configured to run in your VPC so you will be able to access all your infrastructure components, including your database.**

The build stage will build and push your Docker container in **[ECR](https://aws.amazon.com/ecr)**.

The pre-deploy stage will run [a command](https://scaffold.sh/docs/infrastructures/aws/serverless-docker/environment-variables#pre-deploy-command) in a newly created production container, just before deployment. **You can use this stage to run your database migrations, for example.**

This infrastructure also uses **[ACM](https://aws.amazon.com/acm)** to add a fully-managed SSL certificate to your application and **[SSM Parameters Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)** to store your environment variables.

The number of Availability Zones used may be configured for high availability. **This infrastructure is load-balanced, auto-scaled and with zero downtime deployment.**

![](/assets/schema.png)

### Requirements

*   You will need a **GitHub** account to create this infrastructure. **Support for GitLab and BitBucket is coming soon.**

*   If you plan to use an apex domain for your website (i.e. a root domain that does not contain a subdomain), make sure that your domain host support the ANAME, ALIAS or naked CNAME DNS record type.

## Components

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Source</th>
            <th>Price</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><b><a href="https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html">VPC</a></b> <sup>(one)</sup><br/>All your infrastructure components will be contained in one VPC.</td>
            <td><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/network/vpc.ts">src/lib/constructs/network/vpc.ts</a></td>
          <td><b>Free</b></td>
        </tr>
        <tr>
            <td><b><a href="https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Scenario2.html">Public subnet(s)</a></b> <sup>(one or more)</sup><br />One or more public subnet(s) that will contain your application load balancer and your NAT gateway(s).</td>
            <td><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/network/subnets.ts">src/lib/constructs/network/subnets.ts</a></td>
          <td><b>Free</b></td>
        </tr>
        <tr>
            <td><b><a href="https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Scenario2.html">Private subnet(s)</a></b> <sup>(one or more)</sup><br />One or more private subnet(s) that will contain your Fargate and CodeBuild instances.</td>
            <td><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/network/subnets.ts">src/lib/constructs/network/subnets.ts</a></td>
          <td><b>Free</b></td>
        </tr>
        <tr>
            <td><b><a href="https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html">Application load balancer</a></b> <sup>(one)</sup><br />One application load balancer (replicated in public subnet(s)) that will be used to distribute incoming traffic across your Fargate instances.</td>
            <td><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/network/applicationLoadBalancer.ts">src/lib/constructs/network/applicationLoadBalancer.ts</a></td>
          <td><b>+$18</b>&nbsp;/&nbsp;month</td>
        </tr>
        <tr>
            <td><b><a href="https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html">NAT gateway(s)</a></b> <sup>(one or more)</sup><br />One or more NAT gateway(s) that will enable Fargate and CodeBuild instances in private subnet(s) to connect to the internet.</td>
            <td><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/network/natGateways.ts">src/lib/constructs/network/natGateways.ts</a></td>
          <td><b>+$35</b>&nbsp;/&nbsp;month</td>
        </tr>
        <tr>
          <td><b><a href="https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html">ACM</a></b> <sup>(one certificate)</sup><br />ACM will be used to manage the SSL certificate of your application.</td>
            <td><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/network/ssl.ts">src/lib/constructs/network/ssl.ts</a></td>
          <td><b>Free</b></td>
        </tr>
    </tbody>
</table>

### Computing

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Source</th>
            <th>Price</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><b><a href="https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html">Fargate</a></b> <sup>(one cluster)</sup><br/>Fargate will be used to run your containers without having to manage servers.</td>
            <td><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/computing/cluster.ts">src/lib/constructs/computing/cluster.ts</a><br /><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/computing/service.ts">src/lib/constructs/computing/service.ts</a><br /><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/computing/tasks.ts">src/lib/constructs/computing/tasks.ts</a></td>
          <td><b>+$15</b>&nbsp;/&nbsp;month</td>
        </tr>
        <tr>
            <td><b><a href="https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html">ECR</a></b> <sup>(one repository)</sup><br />ECR will be used to store your Docker images.</td>
            <td><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/computing/repository.ts">src/lib/constructs/computing/repository.ts</a></td>
          <td><b>Usage</b></td>
        </tr>
        <tr>
            <td><b><a href="https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html">SSM</a></b> <sup>(one parameter store)</sup><br />SSM Parameter Store will be used to store the environment variables of your application.</td>
            <td><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/computing/environmentVariables.ts">src/lib/constructs/computing/environmentVariables.ts</a></td>
          <td><b>Usage</b></td>
        </tr>
    </tbody>
</table>

### Continuous Deployment

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Source</th>
            <th>Price</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><b><a href="https://docs.aws.amazon.com/codepipeline/latest/userguide/welcome.html">CodePipeline</a></b> <sup>(one pipeline)</sup><br/>CodePipeline will be used to manage the builds and deployments of your application.</td>
            <td><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/continuousDeployment/pipeline.ts">src/lib/constructs/continuousDeployment/pipeline.ts</a></td>
          <td><b>+$1</b>&nbsp;/&nbsp;month</td>
        </tr>
        <tr>
            <td><b><a href="https://docs.aws.amazon.com/codebuild/latest/userguide/welcome.html">CodeBuild</a></b> <sup>(three build projects)</sup><br />CodeBuild will be used to run the test, build and pre-deploy stages of your pipeline.</td>
            <td><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/continuousDeployment/builds.ts">src/lib/constructs/continuousDeployment/builds.ts</a></td>
          <td><b>+$1.5</b>&nbsp;/&nbsp;month</td>
        </tr>
    </tbody>
</table>

### Dashboard

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Source</th>
            <th>Price</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td><b><a href="https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html">CloudWatch</a></b> <sup>(one dashboard)</sup><br/>CloudWatch will be used to display the metrics of your infrastructure components.</td>
            <td><a href="https://github.com/scaffold-sh/aws-serverless-docker/blob/master/src/lib/constructs/dashboard/index.ts">src/lib/constructs/dashboard/index.ts</a></td>
          <td><b>Free</b></td>
        </tr>
    </tbody>
</table>

## Environment variables

These environment variables will be **automatically** configured each time you create <a href="https://scaffold.sh/docs/environments">an environment</a> (or <a href="https://scaffold.sh/docs/sandboxes">a sandbox</a>) for your infrastructure.

<table class="table table-striped table-dark">

<thead>

<tr>

<th scope="col">Name</th>

<th scope="col">Description</th>

</tr>

</thead>

<tbody>

<tr>

<th scope="row">CONTAINER_LISTEN_PORT</th>

<td>The port that needs to be used to send requests to your Docker container.</td>

</tr>

<tr>

<th scope="row">DOMAIN_NAMES</th>

<td>The domain names that need to be covered by your ACM certificate.</td>

</tr>

<tr>

<th scope="row">ENABLE_AUTO_SCALING</th>

<td>Do auto-scaling needs to be enabled?</td>

</tr>

<tr>

<th scope="row">ENABLE_HTTPS</th>

<td>We need to wait for the ACM certificate to be "issued" to enable HTTPS. See the "<a href="https://scaffold.sh/docs/infrastructures/aws/serverless-docker/after-install">after install</a>" section to learn more.</td>

</tr>

<tr>

<th scope="row">FARGATE_TASKS_CPU</th>

<td>The CPU that could be used by your Fargate tasks.</td>

</tr>

<tr>

<th scope="row">FARGATE_TASKS_MEMORY</th>

<td>The memory that could be used by your Fargate tasks.</td>

</tr>

<tr>

<th scope="row">GITHUB_BRANCH</th>

<td>The branch from which you want to deploy.</td>

</tr>

<tr>

<th scope="row">GITHUB_OAUTH_TOKEN</th>

<td>The GitHub Oauth token that will be used by CodePipeline to pull your source code from your repository.</td>

</tr>

<tr>

<th scope="row">GITHUB_REPO</th>

<td>The GitHub repository that contains your source code.</td>

</tr>

<tr>

<th scope="row">GITHUB_REPO_OWNER</th>

<td>The owner of your GitHub repository. Can be a regular user or an organization.</td>

</tr>

<tr>

<th scope="row">GITHUB_WEBHOOK_TOKEN</th>

<td>A random token that will be used by CodePipeline and GitHub to prevent impersonation.</td>

</tr>

<tr>

<th scope="row">NUMBER_OF_AVAILABILITY_ZONES_USED</th>

<td>The number of availability zones used by your infrastructure.</td>

</tr>

<tr>

<th scope="row">PRE_DEPLOY_COMMAND</th>

<td>A command that will run in a newly created production container, just before deployment.</td>

</tr>

</tbody>

</table>

### Inherited

<table class="table table-striped table-dark">

<thead>

<tr>

<th scope="col">Name</th>

<th scope="col">Description</th>

</tr>

</thead>

<tbody>

<tr>

<th scope="row">SCAFFOLD_AWS_PROFILE</th>

<td>The AWS named profile used to create your infrastructure.</td>

</tr>

<tr>

<th scope="row">SCAFFOLD_AWS_REGION</th>

<td>The AWS region where you want to create your infrastructure.</td>

</tr>

<tr>

<th scope="row">SCAFFOLD_AWS_S3_BACKEND_BUCKET</th>

<td>The AWS S3 bucket that will contain the Terraform state of your infrastructure.</td>

</tr>

<tr>

<th scope="row">SCAFFOLD_AWS_S3_BACKEND_DYNAMODB_TABLE</th>

<td>The AWS DynamoDB table that will be used to store the Terraform state locks.</td>

</tr>

<tr>

<th scope="row">SCAFFOLD_AWS_S3_BACKEND_KEY</th>

<td>The S3 bucket key under which your Terraform state will be saved.</td>

</tr>

<tr>

<th scope="row">SCAFFOLD_RESOURCE_NAMES_PREFIX</th>

<td>An unique custom prefix used to avoid name colision with existing resources.</td>

</tr>

</tbody>

</table>

## After install

**Your load balancer will display a "503 Service Temporarily Unavailable" error until the end of the first deployment.**

This infrastructure exports four Terraform outputs: `application_load_balancer_uri`, `dashboard_url`, `pipeline_execution_details_url` and `ssl_validation_dns_records`.

The `application_load_balancer_uri` output value contains the URI of your load balancer. You could use it to access your application while your DNS are propagating.

The `dashboard_url` and `pipeline_execution_details_url` output values contains the URLs of your CloudWatch dashboard and your pipeline executions details.

The `ssl_validation_dns_records` output value contains the DNS records that you need to set in order to validate your ACM certificate (see below).

### How do I set up my domain name?

The way you will set up your domain name will vary according to the presence or absence of a subdomain.

If your domain name doesn't have any subdomains, you will need to add two DNS records:

- **Name:** <empty> or @
- **Type:** ALIASE, ANAME or CNAME
- **Value:** `application_load_balancer_uri`

<p></p>

- **Name:** www
- **Type:** CNAME
- **Value:** `application_load_balancer_uri`

If your domain name has a subdomain, you will need to add one CNAME record:

- **Name:** subdomain
- **Type:** CNAME
- **Value:** `application_load_balancer_uri`

### How do I set up HTTPS?

The `ssl_validation_dns_records` output value contains the DNS records that you need to set in order to validate your ACM certificate.

Once set, you will need to [wait for the status](https://console.aws.amazon.com/acm/home?region=us-east-1#/) of your certificate to switch from "pending" to "issued" to use it with your application load balancer.

You could then set the `ENABLE_HTTPS` environment variable to "true" in your local env file and run the `scaffold apply` command to update your infrastructure.

If you want to automate this process, you could use AWS Route 53 as your domain host then use the `aws_route53_record` and `aws_acm_certificate_validation` resources to wait for certificate validation. See the [Terraform documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation) to learn more.

### How do I add environment variables to my application?

To add an environment variable to your application all you have to do is to add an environment variable that starts with `APPLICATION_` to your infrastructure code.

For example, let's say that you want to add a `TOKEN` variable to your application. You will first add it to your `.env` file:

```env
# .env
APPLICATION_TOKEN=
```

Then, given that this value is secret you choose to define it in your local env file:

```env
# .env.{environment}.local
APPLICATION_TOKEN=MY_SECRET_TOKEN
```

That's it! Run the `scaffold apply` command and re-deploy your application to access your `TOKEN` environment variable.

### How do I customize the test, build and pre-deploy stages of my pipeline?

[CodeBuild uses a YAML file](https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html) to describe all the steps that a stage requires. These files are located in the <kbd>templates</kbd> directory at the root of your infrastructure:

```env
# ./templates                                  
buildspec.yml
predeployspec.yml
testspec.yml
```

You could update these files directly to customize your pipeline stages.

### How do I access environment variables from my *spec files?

The process to add an environment variable to your *spec files is identical to the one used for you application except than you need to prefix your environment variables with `BUILD_`:

```env
# .env.{environment}.local
BUILD_TOKEN=MY_SECRET_TOKEN
```

One done, you could access your environment variables in all your *spec files:

```yaml
# templates/testspec.yml

version: 0.2

phases:
  pre_build:
    commands:
      - echo $TOKEN
```

Remember to run the `scaffold apply` command each time you update your infrastructure code.

### How do I customize my CloudWatch dashboard?

Your CloudWatch dashboard is composed of widgets defined as JSON in the `dashboard/index.ts` file:

```typescript
// ./src/lib/constructs/dashboard/index.ts

this.self = new CloudwatchDashboard(this, "cloudwatch_dashboard", {
  dashboardName: props.resourceNamesPrefix,
  dashboardBody: JSON.stringify({
    widgets: [
      {
        type: "metric",
        width: 12,
        height: 6,
        // ...
      }
    ]
  })
})
```

You could safely add, update or delete widgets using the structure defined in the [AWS documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html).
