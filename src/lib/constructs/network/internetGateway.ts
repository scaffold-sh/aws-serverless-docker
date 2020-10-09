import { Construct } from "constructs"
import { Token } from "cdktf"

import {
  InternetGateway,
  Vpc,
} from "../../../imports/providers/aws"

/**
 * Represents the properties of the internet gateway construct.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 * @property vpc The VPC of your infrastructure.
 */
export interface IInternetGatewayConstructProps {
  resourceNamesPrefix: string;
  vpc: Vpc;
}

/**
 * Represents the internet gateway of your VPC.
 * @class
 * @extends Construct
 */
export class InternetGatewayConstruct extends Construct {
  /**
   * The internet gateway of your VPC.
   */
  readonly self: InternetGateway

  /**
   * Creates an internet gateway construct.
   * @param scope The scope to attach the internet gateway construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The internet gateway construct properties.
   */
  constructor(scope: Construct, id: string, props: IInternetGatewayConstructProps) {
    super(scope, id)

    this.self = new InternetGateway(this, "internet_gateway", {
      vpcId: Token.asString(props.vpc.id),
      tags: {
        Name: `${props.resourceNamesPrefix}_internet_gateway`,
      },
    })
  }
}

export default InternetGatewayConstruct
