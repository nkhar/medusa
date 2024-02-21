import { UpdateLineItemWorkflowInputDTO } from "@medusajs/types"
import {
  WorkflowData,
  createWorkflow,
  transform,
} from "@medusajs/workflows-sdk"
import { getVariantPriceSetsStep } from "../../cart"
import { updateLineItemsStep } from "../steps"

// TODO: The UpdateLineItemsWorkflow are missing the following steps:
// - Confirm inventory exists (inventory module)
// - Validate shipping methods for new items (fulfillment module)
// - Refresh line item adjustments (promotion module)
// - Update payment sessions (payment module)

export const updateLineItemsInCartWorkflowId = "update-line-items-in-cart"
export const updateLineItemsInCartWorkflow = createWorkflow(
  updateLineItemsInCartWorkflowId,
  (input: WorkflowData<UpdateLineItemWorkflowInputDTO>) => {
    // TODO: Needs to be more flexible
    const pricingContext = transform({ cart: input.cart }, (data) => {
      return {
        currency_code: data.cart.currency_code,
        region_id: data.cart.region_id,
      }
    })

    const priceSets = getVariantPriceSetsStep({
      variantIds: [input.item.variant_id],
      context: pricingContext,
    })

    const lineItem = transform({ input, priceSets }, (data) => {
      const price = data.priceSets[data.input.item.variant_id].calculated_amount
      return {
        quantity: data.input.update.quantity,
        metadata: data.input.update.metadata,
        unit_price: price,
      }
    })

    const updatedLineItem = updateLineItemsStep([
      { selector: { id: input.cart.id }, data: lineItem },
    ])

    return updatedLineItem
  }
)
