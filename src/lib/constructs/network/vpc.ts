import { Construct } from "constructs"

import {
  Vpc,
} from "../../../imports/providers/aws"

/**
 * Represents the properties of the VPC construct.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 */
export interface IVpcConstructProps {
  resourceNamesPrefix: string;
}

/**
 * Represents the VPC of your infrastructure.
 * @class
 * @extends Construct
 */
export class VpcConstruct extends Construct {
  /**
   * The VPC of your infrastructure.
   */
  readonly self: Vpc

  /**
   * Creates a VPC construct.
   * @param scope The scope to attach the VPC construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The VPC construct properties.
   */
  constructor(scope: Construct, id: string, props: IVpcConstructProps) {
    super(scope, id)

    this.self = new Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsSupport: true,
      enableDnsHostnames: true,
      tags: {
        Name: `${props.resourceNamesPrefix}_vpc`,
      },
    })
  }
}

export default VpcConstruct
