import {
  CreateLineItemForCartDTO,
  UpdateLineItemWorkflowInputDTO
} from "@medusajs/types"
import {
  WorkflowData,
  createWorkflow,
  transform,
} from "@medusajs/workflows-sdk"
import {
  addToCartStep,
  getVariantPriceSetsStep
} from "../steps"
import { prepareLineItemData } from "../utils/prepare-line-item-data"

export const updateLineItemsInCartWorkflowId = "update-line-items-in-cart"
export const updateLineItemsInCartWorkflow = createWorkflow(
  updateLineItemsInCartWorkflowId,
  (input: WorkflowData<UpdateLineItemWorkflowInputDTO>) => {
    // TODO: Needs to be more flexible
    const pricingContext = transform({ cart: input.cart }, (data) => {
      return {
        currency_code: data.cart.currency_code,
        region_id: data.cart.region_id,
        quantity: data.update.quantity,
      }
    })

    const priceSets = getVariantPriceSetsStep({
      variantIds: [input.item.variant_id],
      // @ts-ignore
      context: pricingContext,
    })

    const lineItems = transform(
      { priceSets, input, variants, cart: input.cart },
      (data) => {
        const items = (data.input.items ?? []).map((item) => {
          const variant = data.variants.find((v) => v.id === item.variant_id)!

          return prepareLineItemData({
            variant: variant,
            unitPrice: data.priceSets[item.variant_id].calculated_amount,
            quantity: item.quantity,
            metadata: item?.metadata ?? {},
            cartId: data.cart.id,
          }) as CreateLineItemForCartDTO
        })

        return items
      }
    )

    const items = addToCartStep({ items: lineItems })

    return items
  }
)
