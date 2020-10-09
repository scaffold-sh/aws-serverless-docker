import { Construct } from "constructs"

import {
  DataAwsCallerIdentity,
  Lb,
  LbTargetGroup,
  SecurityGroup,
  SecurityGroupRule,
  Subnet,
  Vpc,
} from "../../../imports/providers/aws"

import VpcConstruct from "./vpc"
import InternetGatewayConstruct from "./internetGateway"

import SubnetsConstruct from "./subnets"
import RouteTablesConstruct from "./routeTables"

import NatGatewaysConstruct from "./NatGateways"
import ElasticIpsConstruct from "./elasticIps"

import ApplicationLoadBalancerConstruct from "./applicationLoadBalancer"
import SslConstruct from "./ssl"

/**
 * Represents the properties of the network construct.
 * @property currentAccount The AWS account used to create your infrastructure.
 * @property currentRegionAsString The region used to create your infrastructure as string.
 * @property domainNames The domain names that need to be covered by the SSL certificate.
 * @property enableHttps Do you want to redirect HTTP to HTTPS?
 * @property numberOfAvailabilityZonesUsed The number of availability zones used by your infrastructure.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 */
export interface INewtorkProps {
  currentAccount: DataAwsCallerIdentity;
  currentRegionAsString: string;
  domainNames: string[];
  enableHttps: boolean;
  numberOfAvailabilityZonesUsed: number;
  resourceNamesPrefix: string;
}

/**
 * Represents a DNS record.
 * @property name The name of the DNS record.
 * @property type The type of the DNS record.
 * @property value The value of the DNS record.
 */
export interface IDnsRecord {
  name: string;
  type: string;
  value: string;
}

/**
 * Represents the network components of your infrastructure.
 * @class
 * @extends Construct
 */
export class NetworkConstruct extends Construct {
  /**
   * The application load balancer of your infrastructure.
   */
  readonly applicationLoadBalancer: Lb

  /**
   * The security group attached to your application load balancer.
   */
  readonly applicationLoadBalancerSecurityGroup: SecurityGroup

  /**
   * The security group egress rule attached to your application load balancer security group.
   */
  readonly applicationLoadBalancerSecurityGroupEgressRule: SecurityGroupRule

  /**
   * The target group attached to your application load balancer.
   */
  readonly applicationLoadBalancerTargetGroup: LbTargetGroup

  /**
   * The private subnets of your infrastructure.
   */
  readonly privateSubnets: Subnet[]

  /**
   * The DNS records that you need to set to validate your ACM certificate.
   */
  readonly sslValidationDnsRecords: IDnsRecord[]

  /**
   * The VPC of your infrastructure.
   */
  readonly vpc: Vpc

  /**
   * Creates a network construct.
   * @param scope The scope to attach the network construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The network construct properties.
   */
  constructor(scope: Construct, id: string, props: INewtorkProps) {
    super(scope, id)

    const vpc = new VpcConstruct(this, "vpc", {
      resourceNamesPrefix: props.resourceNamesPrefix,
    })

    this.vpc = vpc.self

    const internetGateway = new InternetGatewayConstruct(this, "internet_gateway", {
      resourceNamesPrefix: props.resourceNamesPrefix,
      vpc: vpc.self,
    })

    const subnets = new SubnetsConstruct(this, "subnets", {
      resourceNamesPrefix: props.resourceNamesPrefix,
      vpc: vpc.self,
      numberOfAvailabilityZonesUsed: props.numberOfAvailabilityZonesUsed,
    })

    this.privateSubnets = subnets.privateSubnets

    const elasticIps = new ElasticIpsConstruct(this, "elastic_ips", {
      resourceNamesPrefix: props.resourceNamesPrefix,
      internetGateway: internetGateway.self,
      numberOfAvailabilityZonesUsed: props.numberOfAvailabilityZonesUsed,
    })

    const natGateways = new NatGatewaysConstruct(this, "nat_gateways", {
      resourceNamesPrefix: props.resourceNamesPrefix,
      publicSubnets: subnets.publicSubnets,
      internetGateway: internetGateway.self,
      elasticIps: elasticIps.self,
      numberOfAvailabilityZonesUsed: props.numberOfAvailabilityZonesUsed,
    })

    new RouteTablesConstruct(this, "route_tables", {
      resourceNamesPrefix: props.resourceNamesPrefix,
      vpc: vpc.self,
      internetGateway: internetGateway.self,
      publicSubnets: subnets.publicSubnets,
      privateSubnets: subnets.privateSubnets,
      natGateways: natGateways.self,
    })

    const ssl = new SslConstruct(this, "ssl", {
      resourceNamesPrefix: props.resourceNamesPrefix,
      domainNames: props.domainNames,
    })

    this.sslValidationDnsRecords = ssl.validationDns

    const applicationLoadBalancer = new ApplicationLoadBalancerConstruct(this, "application_load_balancer", {
      resourceNamesPrefix: props.resourceNamesPrefix,
      publicSubnets: subnets.publicSubnets,
      vpc: vpc.self,
      currentAccount: props.currentAccount,
      acmCertificate: ssl.acmCertificate,
      enableHttps: props.enableHttps,
      currentRegionAsString: props.currentRegionAsString,
    })

    this.applicationLoadBalancer = applicationLoadBalancer.self

    this.applicationLoadBalancerSecurityGroup = applicationLoadBalancer.securityGroup
    this.applicationLoadBalancerSecurityGroupEgressRule = applicationLoadBalancer.securityGroupEgressRule

    this.applicationLoadBalancerTargetGroup = applicationLoadBalancer.targetGroup
  }
}

export default NetworkConstruct
