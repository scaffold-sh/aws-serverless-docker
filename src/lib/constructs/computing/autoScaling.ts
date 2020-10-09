import { Construct } from "constructs"

import {
  AppautoscalingPolicy,
  AppautoscalingTarget,
  EcsCluster,
  EcsService,
} from "../../../imports/providers/aws"

/**
 * Represents the properties of the auto-scaling construct.
 * @property cluster The Fargate cluster used in your infrastructure.
 * @property cpuLimitPercent The cpu usage required to trigger auto-scaling.
 * @property maximumNumberOfRunningTasks The maximum number of running Fargate tasks.
 * @property memoryLimitPercent The memory usage required to trigger auto-scaling.
 * @property minimumNumberOfRunningTasks The minimum number of running Fargate tasks.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 * @property service The Fargate service used in your infrastructure.
 */
export interface IAutoScalingProps {
  cluster: EcsCluster;
  cpuLimitPercent: number;
  maximumNumberOfRunningTasks: number;
  memoryLimitPercent: number;
  minimumNumberOfRunningTasks: number;
  resourceNamesPrefix: string;
  service: EcsService;
}

/**
 * Represents the auto-scaling configuration of your Fargate service.
 * @class
 * @extends Construct
 */
export class AutoScalingConstruct extends Construct {
  /**
   * Creates an auto-scaling construct.
   * @param scope The scope to attach the auto-scaling construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The auto-scaling construct properties.
   */
  constructor(scope: Construct, id: string, props: IAutoScalingProps) {
    super(scope, id)

    if (props.memoryLimitPercent < 1 || props.memoryLimitPercent > 100) {
      throw new Error("Memory limit must be comprised between 1 and 100")
    }

    if (props.cpuLimitPercent < 1 || props.cpuLimitPercent > 100) {
      throw new Error("CPU limit must be comprised between 1 and 100")
    }

    if (props.minimumNumberOfRunningTasks < 1 || props.maximumNumberOfRunningTasks < 1) {
      throw new Error("Your Fargate cluster must run at least one task")
    }

    const fargateAutoScalingTarget = new AppautoscalingTarget(this, "fargate_auto_scaling_target", {
      maxCapacity: props.maximumNumberOfRunningTasks,
      minCapacity: props.minimumNumberOfRunningTasks,
      resourceId: `service/${props.cluster.name}/${props.service.name}`,
      scalableDimension: "ecs:service:DesiredCount",
      serviceNamespace: "ecs",
      dependsOn: [
        props.cluster,
        props.service,
      ],
    })

    new AppautoscalingPolicy(this, "fargate_auto_scaling_cpu_policy", {
      name: `${props.resourceNamesPrefix}_fargate_auto_scaling_cpu_policy`,
      policyType: "TargetTrackingScaling",
      resourceId: fargateAutoScalingTarget.resourceId,
      scalableDimension: fargateAutoScalingTarget.scalableDimension,
      serviceNamespace: fargateAutoScalingTarget.serviceNamespace,
      targetTrackingScalingPolicyConfiguration: [{
        predefinedMetricSpecification: [{
          predefinedMetricType: "ECSServiceAverageCPUUtilization",
        }],
        scaleInCooldown: 300,
        scaleOutCooldown: 300,
        targetValue: props.cpuLimitPercent,
      }],
      dependsOn: [
        fargateAutoScalingTarget,
      ],
    })

    new AppautoscalingPolicy(this, "fargate_auto_scaling_memory_policy", {
      name: `${props.resourceNamesPrefix}_fargate_auto_scaling_memory_policy`,
      policyType: "TargetTrackingScaling",
      resourceId: fargateAutoScalingTarget.resourceId,
      scalableDimension: fargateAutoScalingTarget.scalableDimension,
      serviceNamespace: fargateAutoScalingTarget.serviceNamespace,
      targetTrackingScalingPolicyConfiguration: [{
        predefinedMetricSpecification: [{
          predefinedMetricType: "ECSServiceAverageMemoryUtilization",
        }],
        scaleInCooldown: 300,
        scaleOutCooldown: 300,
        targetValue: props.memoryLimitPercent,
      }],
      dependsOn: [
        fargateAutoScalingTarget,
      ],
    })
  }
}

export default AutoScalingConstruct
