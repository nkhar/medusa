import { buildQuery } from "../../modules-sdk"
import { EntityMetadata, FindOptions, wrap } from "@mikro-orm/core"
import { SqlEntityManager } from "@mikro-orm/postgresql"

function detectCircularDependency(
  manager: SqlEntityManager,
  entityMetadata: EntityMetadata,
  visited: Set<string> = new Set()
) {
  visited.add(entityMetadata.className)

  const relations = entityMetadata.relations
  const relationsToCascade = relations.filter((relation) =>
    relation.cascade.includes("soft-remove" as any)
  )

  for (const relation of relationsToCascade) {
    const branchVisited = new Set(Array.from(visited))

    if (branchVisited.has(relation.name)) {
      const dependencies = Array.from(visited)
      dependencies.push(entityMetadata.className)
      const circularDependencyStr = dependencies.join(" -> ")

      throw new Error(
        `Unable to soft delete the ${relation.name}. Circular dependency detected: ${circularDependencyStr}`
      )
    }
    branchVisited.add(relation.name)

    const relationEntityMetadata = manager
      .getDriver()
      .getMetadata()
      .get(relation.type)

    detectCircularDependency(manager, relationEntityMetadata, branchVisited)
  }
}

async function performCascadingSoftDeletion<T>(
  manager: SqlEntityManager,
  entity: T & { id: string; deleted_at?: string | Date | null },
  value: Date | null
) {
  if (!("deleted_at" in entity)) return

  entity.deleted_at = value

  const entityName = entity.constructor.name

  const relations = manager.getDriver().getMetadata().get(entityName).relations

  const relationsToCascade = relations.filter((relation) =>
    relation.cascade.includes("soft-remove" as any)
  )

  for (const relation of relationsToCascade) {
    let entityRelation = entity[relation.name]

    // Handle optional relationships
    if (relation.nullable && !entityRelation) {
      continue
    }

    const retrieveEntity = async () => {
      const query = buildQuery(
        {
          id: entity.id,
        },
        {
          relations: [relation.name],
          withDeleted: true,
        }
      )
      return await manager.findOne(
        entity.constructor.name,
        query.where,
        query.options as FindOptions<any>
      )
    }

    if (!entityRelation) {
      // Fixes the case of many to many through pivot table
      entityRelation = await retrieveEntity()
    }

    const isCollection = "toArray" in entityRelation
    let relationEntities: any[] = []

    if (isCollection) {
      if (!entityRelation.isInitialized()) {
        entityRelation = await retrieveEntity()
        entityRelation = entityRelation[relation.name]
      }
      relationEntities = entityRelation.getItems()
    } else {
      const initializedEntityRelation = await wrap(entityRelation).init()
      relationEntities = [initializedEntityRelation]
    }

    await mikroOrmUpdateDeletedAtRecursively(manager, relationEntities, value)
  }

  await manager.persist(entity)
}

export const mikroOrmUpdateDeletedAtRecursively = async <
  T extends object = any
>(
  manager: SqlEntityManager,
  entities: (T & { id: string; deleted_at?: string | Date | null })[],
  value: Date | null
) => {
  for (const entity of entities) {
    const entityMetadata = manager
      .getDriver()
      .getMetadata()
      .get(entity.constructor.name)
    detectCircularDependency(manager, entityMetadata)
    await performCascadingSoftDeletion(manager, entity, value)
  }
}

export const mikroOrmSerializer = async <TOutput extends object>(
  data: any,
  options?: any
): Promise<TOutput> => {
  options ??= {}
  const { serialize } = await import("@mikro-orm/core")
  const result = serialize(data, {
    forceObject: true,
    populate: true,
    ...options,
  })
  return result as unknown as Promise<TOutput>
}
