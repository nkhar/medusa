import { ModuleRegistrationName } from "@medusajs/modules-sdk"
import { ICartModuleService } from "@medusajs/types"
import { StepResponse, createStep } from "@medusajs/workflows-sdk"

export const deleteLineItemsStepId = "delete-line-items"
export const deleteLineItemsStep = createStep(
  deleteLineItemsStepId,
  async (ids: string[], { container }) => {
    const service = container.resolve<ICartModuleService>(
      ModuleRegistrationName.CART
    )

    await service.removeLineItems(ids)

    return new StepResponse(ids)
  }
)
