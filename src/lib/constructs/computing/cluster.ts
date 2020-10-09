import { Construct } from "constructs"

import {
  EcsCluster,
} from "../../../imports/providers/aws"

/**
 * Represents the properties of the cluster construct.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 */
export interface IClusterProps {
  resourceNamesPrefix: string;
}

/**
 * Represents a Fargate cluster.
 * @class
 * @extends Construct
 */
export class ClusterConstruct extends Construct {
  /**
   * The Fargate cluster.
   */
  readonly self: EcsCluster

  /**
   * Creates a cluster construct.
   * @param scope The scope to attach the cluster construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The cluster construct properties.
   */
  constructor(scope: Construct, id: string, props: IClusterProps) {
    super(scope, id)

    this.self = new EcsCluster(this, "fargate_cluster", {
      name: `${props.resourceNamesPrefix}_fargate_cluster`,
    })
  }
}

export default ClusterConstruct
