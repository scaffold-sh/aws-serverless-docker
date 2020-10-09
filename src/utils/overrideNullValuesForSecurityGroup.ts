import { SecurityGroup } from "../imports/providers/aws"

/**
 * Adds missing "null" values to security group.
 * @param securityGroup The security group to override.
 *
 * @returns The overridden security group.
 * @link https://github.com/hashicorp/terraform-cdk/issues/223
 */
const overrideNullValuesForSecurityGroup = (securityGroup: SecurityGroup) => {
  const propertiesToOverride = [
    ["description", "description"],
    ["ipv6CidrBlocks", "ipv6_cidr_blocks"],
    ["prefixListIds", "prefix_list_ids"],
    ["securityGroups", "security_groups"],
    ["self", "self"],
    ["cidrBlocks", "cidr_blocks"],
  ]

  if (securityGroup.ingress?.length) {
    securityGroup.ingress.forEach((ingress, ingressIndex) => {
      propertiesToOverride.forEach(propertyToOverride => {
        if (!(ingress as any)[propertyToOverride[0]]) {
          securityGroup.addOverride(`ingress.${ingressIndex}.${propertyToOverride[1]}`, null)
        }
      })
    })
  }

  if (securityGroup.egress?.length) {
    securityGroup.egress.forEach((egress, egressIndex) => {
      propertiesToOverride.forEach(propertyToOverride => {
        if (!(egress as any)[propertyToOverride[0]]) {
          securityGroup.addOverride(`egress.${egressIndex}.${propertyToOverride[1]}`, null)
        }
      })
    })
  }

  return securityGroup
}

export default overrideNullValuesForSecurityGroup
