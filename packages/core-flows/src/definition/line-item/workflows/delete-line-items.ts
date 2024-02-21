import { WorkflowData, createWorkflow } from "@medusajs/workflows-sdk"
import { deleteLineItemsStep } from "../steps/delete-line-items"

type WorkflowInput = { ids: string[] }

// TODO: The UpdateLineItemsWorkflow are missing the following steps:
// - Refresh/delete shipping methods (fulfillment module)
// - Refresh line item adjustments (promotion module)
// - Update payment sessions (payment module)

export const deleteLineItemsWorkflowId = "delete-line-items"
export const deleteLineItemsWorkflow = createWorkflow(
  deleteLineItemsWorkflowId,
  (input: WorkflowData<WorkflowInput>): WorkflowData<void> => {
    return deleteLineItemsStep(input.ids)
  }
)
