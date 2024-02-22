import { MikroOrmBigNumberProperty } from "../big-number-field"
import { BigNumberRawValue } from "@medusajs/types"
import { BigNumber } from "../../../totals/big-number"

describe("@MikroOrmBigNumberProperty", () => {
  it("should correctly assign and update BigNumber values", () => {
    class TestAmount {
      @MikroOrmBigNumberProperty()
      amount: BigNumber | number

      raw_amount: BigNumberRawValue
    }

    const testAmount = new TestAmount()

    expect(testAmount.amount).toBeUndefined()
    expect(testAmount.raw_amount).toBeUndefined()

    testAmount.amount = 100

    expect(testAmount.amount).toEqual(100)
    expect((testAmount as any).amount_).toEqual(100)
    expect(testAmount.raw_amount).toEqual({
      value: "100.00000000000000000",
      precision: 20,
    })

    // Update the amount

    testAmount.amount = 200

    expect(testAmount.amount).toEqual(200)
    expect((testAmount as any).amount_).toEqual(200)
    expect(testAmount.raw_amount).toEqual({
      value: "200.00000000000000000",
      precision: 20,
    })

    // Update with big number

    testAmount.amount = new BigNumber(300, { precision: 5 })

    expect(testAmount.amount).toEqual(300)
    expect((testAmount as any).amount_).toEqual(300)
    expect(testAmount.raw_amount).toEqual({ value: "300.00", precision: 5 })
  })
})
