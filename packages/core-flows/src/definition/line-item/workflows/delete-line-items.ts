import { WorkflowData, createWorkflow } from "@medusajs/workflows-sdk"
import { deleteLineItemsStep } from "../steps/delete-line-items"

type WorkflowInput = { ids: string[] }

export const deleteLineItemsWorkflowId = "delete-line-items"
export const deleteLineItemsWorkflow = createWorkflow(
  deleteLineItemsWorkflowId,
  (input: WorkflowData<WorkflowInput>): WorkflowData<void> => {
    return deleteLineItemsStep(input.ids)
  }
)
