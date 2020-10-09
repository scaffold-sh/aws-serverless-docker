import { SecurityGroupRule } from "../imports/providers/aws"

/**
 * Adds missing "null" values to security group rule.
 * @param securityGroupRule The security group rule to override.
 *
 * @returns The overridden security group rule.
 * @link https://github.com/hashicorp/terraform-cdk/issues/223
 */
const overrideNullValuesForSecurityGroupRule = (securityGroupRule: SecurityGroupRule) => {
  const propertiesToOverride = [
    ["description", "description"],
    ["ipv6CidrBlocks", "ipv6_cidr_blocks"],
    ["prefixListIds", "prefix_list_ids"],
    ["sourceSecurityGroupId", "source_security_group_id"],
    ["self", "self"],
    ["cidrBlocks", "cidr_blocks"],
  ]

  propertiesToOverride.forEach(propertyToOverride => {
    if (!(securityGroupRule as any)[propertyToOverride[0]]) {
      securityGroupRule.addOverride(`${propertyToOverride[1]}`, null)
    }
  })

  return securityGroupRule
}

export default overrideNullValuesForSecurityGroupRule
