import { RouteTable } from "../imports/providers/aws"

/**
 * Adds missing "null" values to route table.
 * @param routeTable The route table to override.
 *
 * @returns The overridden route table.
 * @link https://github.com/hashicorp/terraform-cdk/issues/223
 */
const overrideNullValuesForRouteTable = (routeTable: RouteTable) => {
  const propertiesToOverride = [
    ["egressOnlyGatewayId", "egress_only_gateway_id"],
    ["instanceId", "instance_id"],
    ["ipv6CidrBlock", "ipv6_cidr_block"],
    ["localGatewayId", "local_gateway_id"],
    ["natGatewayId", "nat_gateway_id"],
    ["networkInterfaceId", "network_interface_id"],
    ["transitGatewayId", "transit_gateway_id"],
    ["vpcPeeringConnectionId", "vpc_peering_connection_id"],
    ["gatewayId", "gateway_id"],
  ]

  if (routeTable.route?.length) {
    routeTable.route.forEach((route, routeIndex) => {
      propertiesToOverride.forEach(propertyToOverride => {
        if (!(route as any)[propertyToOverride[0]]) {
          routeTable.addOverride(`route.${routeIndex}.${propertyToOverride[1]}`, null)
        }
      })
    })
  }

  return routeTable
}

export default overrideNullValuesForRouteTable
