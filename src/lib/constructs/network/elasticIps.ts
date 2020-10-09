import { Construct } from "constructs"

import {
  Eip,
  InternetGateway,
} from "../../../imports/providers/aws"

/**
 * Represents the properties of the elastic IPs construct.
 * @property internetGateway The internet gateway of your VPC.
 * @property numberOfAvailabilityZonesUsed The number of availability zones used by your infrastructure.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 */
export interface IElasticIpsConstructProps {
  internetGateway: InternetGateway;
  numberOfAvailabilityZonesUsed: number;
  resourceNamesPrefix: string;
}

/**
 * Represents the elastic IPs for your NAT gateways.
 * @class
 * @extends Construct
 */
export class ElasticIpsConstruct extends Construct {
  /**
   * The elastic IPs for your NAT gateways.
   */
  readonly self: Eip[]

  /**
   * Creates an elastic IPs construct.
   * @param scope The scope to attach the elastic IPs construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The elastic IPs construct properties.
   */
  constructor(scope: Construct, id: string, props: IElasticIpsConstructProps) {
    super(scope, id)

    this.self = []

    for (let i = 0; i < props.numberOfAvailabilityZonesUsed; ++i) {
      this.self.push(new Eip(this, `elastic_ip_${i + 1}`, {
        tags: {
          Name: `${props.resourceNamesPrefix}_elastic_ip_for_nat_gateway_${i + 1}`,
        },
        vpc: true,
        // <!> EIP may require internet gateway to exist prior to association.
        // Use "depends_on" to set an explicit dependency on the internet gateway.
        // https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
        dependsOn: [
          props.internetGateway,
        ],
      }))
    }
  }
}

export default ElasticIpsConstruct
