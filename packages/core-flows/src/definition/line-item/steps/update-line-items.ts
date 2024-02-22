import { ModuleRegistrationName } from "@medusajs/modules-sdk"
import {
  ICartModuleService,
  UpdateLineItemWithSelectorDTO,
} from "@medusajs/types"
import {
  getSelectsAndRelationsFromObjectArray,
  promiseAll,
} from "@medusajs/utils"
import { StepResponse, createStep } from "@medusajs/workflows-sdk"

export const updateLineItemsStepId = "update-line-items"
export const updateLineItemsStep = createStep(
  updateLineItemsStepId,
  async (input: UpdateLineItemWithSelectorDTO, { container }) => {
    const service = container.resolve<ICartModuleService>(
      ModuleRegistrationName.CART
    )

    const { selects, relations } = getSelectsAndRelationsFromObjectArray([
      input.data,
    ])

    const itemsBefore = await service.listLineItems(input.selector, {
      select: selects,
      relations,
    })

    const items = await service.updateLineItems(input.selector, input.data)

    return new StepResponse(items, itemsBefore)
  },
  async (itemsBefore, { container }) => {
    if (!itemsBefore) {
      return
    }

    const service = container.resolve<ICartModuleService>(
      ModuleRegistrationName.CART
    )

    await promiseAll(
      itemsBefore.map((i) =>
        service.updateLineItems(i.id, {
          quantity: i.quantity,
          metadata: i.metadata,
          unit_price: i.unit_price,
        })
      )
    )
  }
)
