import { Construct } from "constructs"
import { Token } from "cdktf"

import {
  CloudwatchDashboard,
  CloudwatchLogGroup,
  DataAwsRegion,
  EcsCluster,
  EcsService,
  Lb,
  LbTargetGroup,
} from "../../../imports/providers/aws"

/**
 * Represents the properties of the dashboard construct.
 * @property applicationLoadBalancer The application load balancer of your infrastructure.
 * @property applicationLoadBalancerTargetGroup The target group attached to your application load balancer.
 * @property autoScalingCpuLimitPercent The cpu usage required to trigger auto-scaling.
 * @property autoScalingMemoryLimitPercent The memory usage required to trigger auto-scaling.
 * @property containersLogsGroup The log group used to store your container logs.
 * @property currentRegion The AWS region used to create your DocumentDB cluster as data object.
 * @property enableAutoScaling Do auto-scaling needs to be enabled?
 * @property fargateCluster The Fargate cluster used in your infrastructure.
 * @property fargateService The Fargate service used in your infrastructure.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 */
export interface IDashboardProps {
  applicationLoadBalancer: Lb;
  applicationLoadBalancerTargetGroup: LbTargetGroup;
  autoScalingCpuLimitPercent: number;
  autoScalingMemoryLimitPercent: number;
  containersLogsGroup: CloudwatchLogGroup;
  currentRegion: DataAwsRegion;
  enableAutoScaling: boolean;
  fargateCluster: EcsCluster;
  fargateService: EcsService;
  resourceNamesPrefix: string;
}

/**
 * Represents the CloudWatch dashboard of your infrastructure.
 * @class
 * @extends Construct
 */
export class DashboardConstruct extends Construct {
  /**
   * The CloudWatch dashboard.
   */
  readonly self: CloudwatchDashboard

  /**
   * Creates a dashboard construct.
   * @param scope The scope to attach the dashboard construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The dashboard construct properties.
   */
  constructor(scope: Construct, id: string, props: IDashboardProps) {
    super(scope, id)

    this.self = new CloudwatchDashboard(this, "cloudwatch_dashboard", {
      dashboardName: props.resourceNamesPrefix,
      dashboardBody: JSON.stringify({
        widgets: [
          {
            type: "metric",
            width: 12,
            height: 6,
            properties: {
              metrics: [
                [
                  "AWS/ApplicationELB",
                  "HealthyHostCount",
                  "TargetGroup",
                  `${props.applicationLoadBalancerTargetGroup.arnSuffix}`,
                  "LoadBalancer",
                  `${props.applicationLoadBalancer.arnSuffix}`,
                  {
                    label: "Healthy",
                  },
                ],
                [
                  ".",
                  "UnHealthyHostCount",
                  ".",
                  ".",
                  ".",
                  ".",
                  {
                    label: "Unhealthy",
                  },
                ],
              ],
              view: "timeSeries",
              region: `${Token.asString(props.currentRegion.name)}`,
              title: "Fargate tasks",
              period: 300,
              stat: "Average",
              legend: {
                position: "bottom",
              },
            },
          },
          {
            type: "metric",
            width: 12,
            height: 6,
            properties: {
              metrics: [
                [
                  "AWS/ApplicationELB",
                  "HTTPCode_Target_4XX_Count",
                  "TargetGroup",
                  `${props.applicationLoadBalancerTargetGroup.arnSuffix}`,
                  "LoadBalancer",
                  `${props.applicationLoadBalancer.arnSuffix}`,
                  {
                    label: "HTTPCode_Task_4XX_Count",
                  },
                ],
                [
                  ".",
                  "HTTPCode_Target_5XX_Count",
                  "TargetGroup",
                  `${props.applicationLoadBalancerTargetGroup.arnSuffix}`,
                  "LoadBalancer",
                  `${props.applicationLoadBalancer.arnSuffix}`,
                  {
                    label: "HTTPCode_Task_5XX_Count",
                  },
                ],
                [
                  ".",
                  "TargetConnectionErrorCount",
                  "LoadBalancer",
                  `${props.applicationLoadBalancer.arnSuffix}`,
                  {
                    label: "TaskConnectionErrorCount",
                  },
                ],
                [
                  ".",
                  "ClientTLSNegotiationErrorCount",
                  ".",
                  ".",
                ],
                [
                  ".",
                  "HTTPCode_ELB_5XX_Count",
                  ".",
                  ".",
                ],
              ],
              view: "timeSeries",
              stacked: true,
              region: `${Token.asString(props.currentRegion.name)}`,
              title: "Fargate tasks HTTP errors",
              liveData: true,
              period: 1,
              stat: "Sum",
            },
          },
          {
            type: "metric",
            width: 12,
            height: 6,
            properties: {
              metrics: [
                [
                  "AWS/ECS",
                  "MemoryUtilization",
                  "ServiceName",
                  `${props.fargateService.name}`,
                  "ClusterName",
                  `${props.fargateCluster.name}`,
                ],
              ],
              view: "timeSeries",
              stacked: true,
              region: `${Token.asString(props.currentRegion.name)}`,
              title: "Fargate tasks memory usage",
              period: 1,
              liveData: true,
              stat: "Average",
              annotations: props.enableAutoScaling ? {
                horizontal: [
                  {
                    label: "Autoscaling triggered",
                    value: props.autoScalingMemoryLimitPercent,
                  },
                ],
              } : {},
            },
          },
          {
            type: "metric",
            width: 12,
            height: 6,
            properties: {
              metrics: [
                [
                  "AWS/ECS",
                  "CPUUtilization",
                  "ServiceName",
                  `${props.fargateService.name}`,
                  "ClusterName",
                  `${props.fargateCluster.name}`,
                ],
              ],
              view: "timeSeries",
              stacked: true,
              region: `${Token.asString(props.currentRegion.name)}`,
              title: "Fargate tasks CPU usage",
              liveData: true,
              period: 1,
              stat: "Average",
              annotations: props.enableAutoScaling ? {
                horizontal: [
                  {
                    label: "Autoscaling triggered",
                    value: props.autoScalingCpuLimitPercent,
                  },
                ],
              } : {},
            },
          },
          {
            type: "metric",
            width: 12,
            height: 6,
            properties: {
              metrics: [
                [
                  "AWS/ApplicationELB",
                  "TargetResponseTime",
                  "TargetGroup",
                  `${props.applicationLoadBalancerTargetGroup.arnSuffix}`,
                  "LoadBalancer",
                  `${props.applicationLoadBalancer.arnSuffix}`,
                  "AvailabilityZone",
                  `${Token.asString(props.currentRegion.name)}a`,
                  {
                    yAxis: "left",
                    id: "m1",
                  },
                ],
              ],
              view: "timeSeries",
              stacked: true,
              region: `${Token.asString(props.currentRegion.name)}`,
              title: "Fargate tasks response time",
              stat: "Average",
              period: 1,
              yAxis: {
                left: {
                  showUnits: true,
                },
              },
              liveData: true,
              annotations: {
                horizontal: [
                  {
                    label: "Slow",
                    value: 0.8,
                  },
                ],
              },
            },
          },
          {
            type: "log",
            width: 12,
            height: 6,
            properties: {
              query: `SOURCE "${props.containersLogsGroup.name}" | fields @timestamp, @message\n| sort @timestamp desc\n| limit 200`,
              region: `${Token.asString(props.currentRegion.name)}`,
              stacked: false,
              title: "Fargate tasks logs",
              view: "table",
            },
          },
        ],
      }),
      dependsOn: [
        props.applicationLoadBalancer,
        props.applicationLoadBalancerTargetGroup,
        props.containersLogsGroup,
        props.fargateCluster,
        props.fargateService,
      ],
    })
  }
}

export default DashboardConstruct
