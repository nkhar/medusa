import { UpdateLineItemInCartWorkflowInputDTO } from "@medusajs/types"
import {
  WorkflowData,
  createWorkflow,
  transform,
} from "@medusajs/workflows-sdk"
import { getVariantPriceSetsStep } from ".."
import { listLineItemsStep, updateLineItemsStep } from "../../line-item/steps"

// TODO: The UpdateLineItemsWorkflow are missing the following steps:
// - Confirm inventory exists (inventory module)
// - Validate shipping methods for new items (fulfillment module)
// - Refresh line item adjustments (promotion module)
// - Update payment sessions (payment module)

export const updateLineItemInCartWorkflowId = "update-line-item-in-cart"
export const updateLineItemInCartWorkflow = createWorkflow(
  updateLineItemInCartWorkflowId,
  (input: WorkflowData<UpdateLineItemInCartWorkflowInputDTO>) => {
    const pricingContext = transform({ cart: input.cart }, (data) => {
      return {
        currency_code: data.cart.currency_code,
        region_id: data.cart.region_id,
        customer_id: data.cart.customer_id,
      }
    })

    const [item] = listLineItemsStep({
      filters: input.selector,
      config: {
        select: ["id", "variant_id"],
        relations: ["tax_lines", "adjustments"],
      },
    })

    const priceSets = getVariantPriceSetsStep({
      variantIds: [item.variant_id!],
      context: pricingContext,
    })

    const lineItemUpdate = transform({ item, priceSets, input }, (data) => {
      const price = data.priceSets[data.item.variant_id!].calculated_amount

      return {
        data: {
          ...data.input.data,
          unit_price: price,
        },
        selector: {
          id: item.id,
        },
      }
    })

    const updatedLineItems = updateLineItemsStep({
      data: lineItemUpdate.data,
      selector: lineItemUpdate.selector,
    })

    return updatedLineItems
  }
)
