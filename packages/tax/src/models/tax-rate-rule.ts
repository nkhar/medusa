import { DAL } from "@medusajs/types"
import { DALUtils, createPsqlIndexStatementHelper } from "@medusajs/utils"
import {
  Cascade,
  Entity,
  ManyToOne,
  PrimaryKey,
  PrimaryKeyProp,
  Property,
  Filter,
  OptionalProps,
} from "@mikro-orm/core"
import TaxRate from "./tax-rate"

const TABLE_NAME = "tax_rate_rule"

const taxRateIdIndexName = "IDX_tax_rate_rule_tax_rate_id"

type OptionalRuleProps = "tax_rate" | DAL.SoftDeletableEntityDateColumns

@Entity({ tableName: TABLE_NAME })
@Filter(DALUtils.mikroOrmSoftDeletableFilterOptions)
export default class TaxRateRule {
  [OptionalProps]?: OptionalRuleProps

  @PrimaryKey({ columnType: "text" })
  tax_rate_id!: string

  @PrimaryKey({ columnType: "text" })
  reference_id!: string;

  [PrimaryKeyProp]?: ["tax_rate_id", "reference_id"]

  @Property({ columnType: "text" })
  reference: string

  @ManyToOne(() => TaxRate, {
    fieldName: "tax_rate_id",
    index: taxRateIdIndexName,
    cascade: [Cascade.REMOVE, Cascade.PERSIST],
  })
  tax_rate: TaxRate

  @Property({ columnType: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null = null

  @Property({
    onCreate: () => new Date(),
    columnType: "timestamptz",
    defaultRaw: "now()",
  })
  created_at: Date

  @Property({
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
    columnType: "timestamptz",
    defaultRaw: "now()",
  })
  updated_at: Date

  @Property({ columnType: "text", nullable: true })
  created_by: string | null = null

  @createPsqlIndexStatementHelper({
    tableName: TABLE_NAME,
    columns: "deleted_at",
    where: "deleted_at IS NOT NULL",
  }).MikroORMIndex()
  @Property({ columnType: "timestamptz", nullable: true })
  deleted_at: Date | null = null
}
