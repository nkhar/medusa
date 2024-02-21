import { ModuleRegistrationName } from "@medusajs/modules-sdk"
import {
  ICartModuleService,
  UpdateLineItemWithSelectorDTO,
} from "@medusajs/types"
import { StepResponse, createStep } from "@medusajs/workflows-sdk"

export const updateLineItemsStepId = "update-line-items"
export const updateLineItemsStep = createStep(
  updateLineItemsStepId,
  async (input: UpdateLineItemWithSelectorDTO[], { container }) => {
    const service = container.resolve<ICartModuleService>(
      ModuleRegistrationName.CART
    )

    const items = await service.updateLineItems(input)

    return new StepResponse(items)
  }
)
