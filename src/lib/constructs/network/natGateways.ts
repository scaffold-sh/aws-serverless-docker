import { Construct } from "constructs"
import { Token } from "cdktf"

import {
  Eip,
  InternetGateway,
  NatGateway,
  Subnet,
} from "../../../imports/providers/aws"

/**
 * Represents the properties of the NAT gateways construct.
 * @property elasticIps The elastic IPs for your NAT gateways.
 * @property internetGateway The internet gateway of your VPC.
 * @property numberOfAvailabilityZonesUsed The number of availability zones used by your infrastructure.
 * @property publicSubnets The public subnets of your infrastructure.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 */
export interface INatGatewaysConstructProps {
  elasticIps: Eip[];
  internetGateway: InternetGateway;
  numberOfAvailabilityZonesUsed: number;
  publicSubnets: Subnet[];
  resourceNamesPrefix: string;
}

/**
 * Represents the NAT gateways of your infrastructure.
 * @class
 * @extends Construct
 */
export class NatGatewaysConstruct extends Construct {
  /**
   * The NAT gateways of your infrastructure.
   */
  readonly self: NatGateway[]

  /**
   * Creates a NAT gateways construct.
   * @param scope The scope to attach the NAT gateways construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The NAT gateways construct properties.
   */
  constructor(scope: Construct, id: string, props: INatGatewaysConstructProps) {
    super(scope, id)

    if (props.elasticIps.length < props.numberOfAvailabilityZonesUsed) {
      throw new Error("The number of availability zones used must match the number of elastic IPs")
    }

    if (props.publicSubnets.length < props.numberOfAvailabilityZonesUsed) {
      throw new Error("The number of availability zones used must match the number of public subnets")
    }

    this.self = []

    for (let i = 0; i < props.numberOfAvailabilityZonesUsed; ++i) {
      this.self.push(new NatGateway(this, `nat_gateway_${i + 1}`, {
        allocationId: Token.asString(props.elasticIps[i].id),
        subnetId: Token.asString(props.publicSubnets[i].id),
        tags: {
          Name: `${props.resourceNamesPrefix}_nat_gateway_${i + 1}`,
        },
        dependsOn: [
          props.internetGateway,
        ],
      }))
    }
  }
}

export default NatGatewaysConstruct
