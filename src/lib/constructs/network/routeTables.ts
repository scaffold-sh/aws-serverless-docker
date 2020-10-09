import { Construct } from "constructs"
import { Token } from "cdktf"

import {
  InternetGateway,
  NatGateway,
  RouteTable,
  RouteTableAssociation,
  Subnet,
  Vpc,
} from "../../../imports/providers/aws"

import overrideNullValuesForRouteTable from "../../../utils/overrideNullValuesForRouteTable"

/**
 * Represents the properties of the route tables construct.
 * @property internetGateway The internet gateway of your VPC.
 * @property natGateways The NAT gateways used in your infrastructure.
 * @property privateSubnets The private subnets of your infrastructure.
 * @property publicSubnets The public subnets of your infrastructure.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 * @property vpc The VPC of your infrastructure.
 */
export interface IRouteTablesConstructProps {
  internetGateway: InternetGateway;
  natGateways: NatGateway[];
  privateSubnets: Subnet[];
  publicSubnets: Subnet[];
  resourceNamesPrefix: string;
  vpc: Vpc;
}

/**
 * Represents the route tables of your subnets.
 * @class
 * @extends Construct
 */
export class RouteTablesConstruct extends Construct {
  /**
   * The route tables for the private subnets.
   */
  readonly privateSubnetsRouteTables: RouteTable[]

  /**
   * The route table for the public subnets.
   */
  readonly publicSubnetsRouteTable: RouteTable

  /**
   * Creates a route tables construct.
   * @param scope The scope to attach the route tables construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The route tables construct properties.
   */
  constructor(scope: Construct, id: string, props: IRouteTablesConstructProps) {
    super(scope, id)

    if (props.natGateways.length !== props.privateSubnets.length) {
      throw new Error("The number of NAT gateways must match the number of private subnets")
    }

    this.publicSubnetsRouteTable = overrideNullValuesForRouteTable(new RouteTable(this, "public_subnets_route_table", {
      route: [{
        cidrBlock: "0.0.0.0/0",
        gatewayId: Token.asString(props.internetGateway.id),
      }],
      tags: {
        Name: `${props.resourceNamesPrefix}_route_table_for_public_subnets`,
      },
      vpcId: Token.asString(props.vpc.id),
    }))

    props.publicSubnets.forEach((publicSubnet, index) => {
      new RouteTableAssociation(this, `public_subnets_route_table_association_${index + 1}`, {
        routeTableId: Token.asString(this.publicSubnetsRouteTable.id),
        subnetId: Token.asString(publicSubnet.id),
      })
    })

    this.privateSubnetsRouteTables = []

    props.privateSubnets.forEach((_privateSubnet, index) => {
      this.privateSubnetsRouteTables.push(overrideNullValuesForRouteTable(new RouteTable(this, `private_subnets_route_table_${index + 1}`, {
        route: [{
          cidrBlock: "0.0.0.0/0",
          natGatewayId: Token.asString(props.natGateways[index].id),
        }],
        tags: {
          Name: `${props.resourceNamesPrefix}_route_table_for_private_subnet_${index + 1}`,
        },
        vpcId: Token.asString(props.vpc.id),
      })))
    })

    props.privateSubnets.forEach((privateSubnet, index) => {
      new RouteTableAssociation(this, `private_subnets_route_table_association_${index + 1}`, {
        routeTableId: Token.asString(this.privateSubnetsRouteTables[index].id),
        subnetId: Token.asString(privateSubnet.id),
      })
    })
  }
}

export default RouteTablesConstruct
