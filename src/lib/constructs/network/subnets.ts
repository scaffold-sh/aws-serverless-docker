import { Construct } from "constructs"
import { Token } from "cdktf"

import {
  DataAwsAvailabilityZones,
  Subnet,
  Vpc,
} from "../../../imports/providers/aws"

/**
 * Represents the properties of the subnets construct.
 * @property numberOfAvailabilityZonesUsed The number of availability zones used by your infrastructure.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 * @property vpc The VPC of your infrastructure.
 */
export interface ISubnetsConstructProps {
  numberOfAvailabilityZonesUsed: number;
  resourceNamesPrefix: string;
  vpc: Vpc;
}

/**
 * Represents the subnets of your infrastructure.
 * @class
 * @extends Construct
 */
export class SubnetsConstruct extends Construct {
  /**
   * The private subnets of your infrastructure.
   */
  readonly privateSubnets: Subnet[]

  /**
   * The public subnets of your infrastructure.
   */
  readonly publicSubnets: Subnet[]

  /**
   * Creates a subnets construct.
   * @param scope The scope to attach the subnets construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The subnets construct properties.
   */
  constructor(scope: Construct, id: string, props: ISubnetsConstructProps) {
    super(scope, id)

    this.privateSubnets = []
    this.publicSubnets = []

    const availabilityZones = new DataAwsAvailabilityZones(this, "availability_zone")

    for (let i = 0; i < props.numberOfAvailabilityZonesUsed; ++i) {
      this.privateSubnets.push(new Subnet(this, `private_subnet_${i + 1}`, {
        // Raw Terraform while waiting for the CDKTF to support complex types
        availabilityZone: `\${${availabilityZones.fqn}.names[${i}]}`,
        // Raw Terraform to use the "cidrsubnet" function
        cidrBlock: `\${cidrsubnet("${props.vpc.cidrBlock}", 8, ${i})}`,
        vpcId: Token.asString(props.vpc.id),
        tags: {
          Name: `${props.resourceNamesPrefix}_private_subnet_${i + 1}`,
        },
        lifecycle: {
          createBeforeDestroy: true,
        },
      }))
    }

    // <!> An application load balancer requires at least two public subnets
    for (let i = 0; i < Math.max(props.numberOfAvailabilityZonesUsed, 2); ++i) {
      this.publicSubnets.push(new Subnet(this, `public_subnet_${i + 1}`, {
        // Raw Terraform while waiting for the CDKTF to support complex types
        availabilityZone: `\${${availabilityZones.fqn}.names[${i}]}`,
        // Raw Terraform to use the "cidrsubnet" function.
        // We divide the available subnet addresses in two to prevent
        // overlapping in case of addition or deletion.
        cidrBlock: `\${cidrsubnet("${props.vpc.cidrBlock}", 8, ${i + 128})}`,
        vpcId: Token.asString(props.vpc.id),
        tags: {
          Name: `${props.resourceNamesPrefix}_public_subnet_${i + 1}`,
        },
        mapPublicIpOnLaunch: true,
        lifecycle: {
          createBeforeDestroy: true,
        },
      }))
    }
  }
}

export default SubnetsConstruct
