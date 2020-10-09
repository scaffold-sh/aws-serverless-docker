import { Construct } from "constructs"

import {
  EcrRepository,
} from "../../../imports/providers/aws"

/**
 * Represents the properties of the repository construct.
 * @property dockerImageName A name chosen to designate your Docker image in your ECR repository.
 * @property resourceNamesPrefix An unique custom prefix used to avoid name colision with existing resources.
 */
export interface IRepositoryProps {
  dockerImageName: string;
  resourceNamesPrefix: string;
}

/**
 * Represents the ECR repository that will store your Docker images.
 * @class
 * @extends Construct
 */
export class RepositoryConstruct extends Construct {
  /**
   * The ECR repository.
   */
  readonly self: EcrRepository

  /**
   * Creates a repository construct.
   * @param scope The scope to attach the repository construct to.
   * @param id An unique id used to distinguish constructs.
   * @param props The repository construct properties.
   */
  constructor(scope: Construct, id: string, props: IRepositoryProps) {
    super(scope, id)

    this.self = new EcrRepository(this, "ecr_repository", {
      name: `${props.resourceNamesPrefix}_ecr_repository/${props.dockerImageName}`,
    })
  }
}

export default RepositoryConstruct
