import {
  Context,
  DAL,
  ITaxModuleService,
  InternalModuleDeclaration,
  ModuleJoinerConfig,
  ModulesSdkTypes,
  TaxTypes,
} from "@medusajs/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  ModulesSdkUtils,
  isDefined,
  promiseAll,
} from "@medusajs/utils"
import { TaxRate, TaxRegion, TaxRateRule } from "@models"
import { entityNameToLinkableKeysMap, joinerConfig } from "../joiner-config"
import { TaxRegionDTO } from "@medusajs/types"

type InjectedDependencies = {
  baseRepository: DAL.RepositoryService
  taxRateService: ModulesSdkTypes.InternalModuleService<any>
  taxRegionService: ModulesSdkTypes.InternalModuleService<any>
  taxRateRuleService: ModulesSdkTypes.InternalModuleService<any>
}

const generateForModels = [TaxRegion, TaxRateRule]

export default class TaxModuleService<
    TTaxRate extends TaxRate = TaxRate,
    TTaxRegion extends TaxRegion = TaxRegion,
    TTaxRateRule extends TaxRateRule = TaxRateRule
  >
  extends ModulesSdkUtils.abstractModuleServiceFactory<
    InjectedDependencies,
    TaxTypes.TaxRateDTO,
    {
      TaxRegion: { dto: TaxTypes.TaxRegionDTO }
      TaxRateRule: { dto: TaxTypes.TaxRateRuleDTO }
    }
  >(TaxRate, generateForModels, entityNameToLinkableKeysMap)
  implements ITaxModuleService
{
  protected baseRepository_: DAL.RepositoryService
  protected taxRateService_: ModulesSdkTypes.InternalModuleService<TTaxRate>
  protected taxRegionService_: ModulesSdkTypes.InternalModuleService<TTaxRegion>
  protected taxRateRuleService_: ModulesSdkTypes.InternalModuleService<TTaxRateRule>

  constructor(
    {
      baseRepository,
      taxRateService,
      taxRegionService,
      taxRateRuleService,
    }: InjectedDependencies,
    protected readonly moduleDeclaration: InternalModuleDeclaration
  ) {
    // @ts-ignore
    super(...arguments)

    this.baseRepository_ = baseRepository
    this.taxRateService_ = taxRateService
    this.taxRegionService_ = taxRegionService
    this.taxRateRuleService_ = taxRateRuleService
  }

  __joinerConfig(): ModuleJoinerConfig {
    return joinerConfig
  }

  async create(
    data: TaxTypes.CreateTaxRateDTO[],
    sharedContext?: Context
  ): Promise<TaxTypes.TaxRateDTO[]>

  async create(
    data: TaxTypes.CreateTaxRateDTO,
    sharedContext?: Context
  ): Promise<TaxTypes.TaxRateDTO>

  @InjectManager("baseRepository_")
  async create(
    data: TaxTypes.CreateTaxRateDTO[] | TaxTypes.CreateTaxRateDTO,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<TaxTypes.TaxRateDTO[] | TaxTypes.TaxRateDTO> {
    const input = Array.isArray(data) ? data : [data]
    const rates = await this.create_(input, sharedContext)
    return Array.isArray(data) ? rates : rates[0]
  }

  @InjectTransactionManager("baseRepository_")
  protected async create_(
    data: TaxTypes.CreateTaxRateDTO[],
    @MedusaContext() sharedContext: Context = {}
  ) {
    const [rules, rateData] = data.reduce(
      (acc, region) => {
        const { rules, ...rest } = region
        acc[0].push(rules)
        acc[1].push(rest)
        return acc
      },
      [[], []] as [
        (Omit<TaxTypes.CreateTaxRateRuleDTO, "tax_rate_id">[] | undefined)[],
        Partial<TaxTypes.CreateTaxRegionDTO>[]
      ]
    )

    const rates = await this.taxRateService_.create(rateData, sharedContext)
    const rulesToCreate = rates
      .reduce((acc, rate, i) => {
        const rateRules = rules[i]
        if (isDefined(rateRules)) {
          acc.push(
            rateRules.map((r) => {
              return {
                ...r,
                tax_rate_id: rate.id,
              }
            })
          )
        }
        return acc
      }, [] as TaxTypes.CreateTaxRateRuleDTO[][])
      .flat()

    if (rulesToCreate.length > 0) {
      await this.taxRateRuleService_.create(rulesToCreate, sharedContext)
    }

    return await this.baseRepository_.serialize<TaxTypes.TaxRateDTO>(rates, {
      populate: true,
    })
  }

  createTaxRegions(
    data: TaxTypes.CreateTaxRegionDTO,
    sharedContext?: Context
  ): Promise<TaxRegionDTO>

  createTaxRegions(
    data: TaxTypes.CreateTaxRegionDTO[],
    sharedContext?: Context
  ): Promise<TaxRegionDTO[]>

  @InjectManager("baseRepository_")
  async createTaxRegions(
    data: TaxTypes.CreateTaxRegionDTO | TaxTypes.CreateTaxRegionDTO[],
    @MedusaContext() sharedContext: Context = {}
  ) {
    const input = Array.isArray(data) ? data : [data]
    await this.verifyProvinceToCountryMatch(input, sharedContext)
    const [defaultRates, regionData] = input.reduce(
      (acc, region) => {
        const { default_tax_rate, ...rest } = region
        if (!default_tax_rate) {
          acc[0].push(null)
        } else {
          acc[0].push({
            ...default_tax_rate,
            is_default: true,
            created_by: region.created_by,
          })
        }
        acc[1].push(rest)
        return acc
      },
      [[], []] as [
        (Omit<TaxTypes.CreateTaxRateDTO, "tax_region_id"> | null)[],
        Partial<TaxTypes.CreateTaxRegionDTO>[]
      ]
    )

    const regions = await this.taxRegionService_.create(
      regionData,
      sharedContext
    )

    const rates = regions
      .map((region, i) => {
        if (!defaultRates[i]) {
          return false
        }
        return {
          ...defaultRates[i],
          tax_region_id: region.id,
        }
      })
      .filter(Boolean) as TaxTypes.CreateTaxRateDTO[]

    if (rates.length !== 0) {
      await this.create(rates, sharedContext)
    }

    const result = await this.baseRepository_.serialize<
      TaxTypes.TaxRegionDTO[]
    >(regions, {
      populate: true,
    })

    return Array.isArray(data) ? result : result[0]
  }

  createTaxRateRules(
    data: TaxTypes.CreateTaxRateRuleDTO,
    sharedContext?: Context
  ): Promise<TaxTypes.TaxRateRuleDTO>
  createTaxRateRules(
    data: TaxTypes.CreateTaxRateRuleDTO[],
    sharedContext?: Context
  ): Promise<TaxTypes.TaxRateRuleDTO[]>

  @InjectManager("baseRepository_")
  async createTaxRateRules(
    data: TaxTypes.CreateTaxRateRuleDTO | TaxTypes.CreateTaxRateRuleDTO[],
    @MedusaContext() sharedContext: Context = {}
  ) {
    const input = Array.isArray(data) ? data : [data]
    const rules = await this.taxRateRuleService_.create(input, sharedContext)
    const result = await this.baseRepository_.serialize<
      TaxTypes.TaxRateRuleDTO[]
    >(rules, {
      populate: true,
    })
    return Array.isArray(data) ? result : result[0]
  }

  @InjectTransactionManager("baseRepository_")
  async createTaxRateRules_(
    data: TaxTypes.CreateTaxRateRuleDTO[],
    @MedusaContext() sharedContext: Context = {}
  ) {
    return await this.taxRateRuleService_.create(data, sharedContext)
  }

  @InjectManager("baseRepository_")
  async getTaxLines(
    items: (TaxTypes.TaxableItemDTO | TaxTypes.TaxableShippingDTO)[],
    calculationContext: TaxTypes.TaxCalculationContext,
    @MedusaContext() sharedContext: Context = {}
  ): Promise<(TaxTypes.ItemTaxLineDTO | TaxTypes.ShippingTaxLineDTO)[]> {
    const regions = await this.taxRegionService_.list(
      {
        $or: [
          {
            country_code: calculationContext.address.country_code,
            province_code: null,
          },
          {
            country_code: calculationContext.address.country_code,
            province_code: calculationContext.address.province_code,
          },
        ],
      },
      {},
      sharedContext
    )

    const toReturn = await promiseAll(
      items.map(async (item) => {
        const regionIds = regions.map((r) => r.id)
        const rateQuery = this.getTaxRateQueryForItem(item, regionIds)
        const rates = await this.taxRateService_.list(
          rateQuery,
          {
            relations: ["tax_region", "rules"],
          },
          sharedContext
        )

        return await this.getTaxRatesForItem(item, rates)
      })
    )

    return toReturn.flat()
  }

  private async verifyProvinceToCountryMatch(
    regionsToVerify: TaxTypes.CreateTaxRegionDTO[],
    sharedContext: Context = {}
  ) {
    const parentIds = regionsToVerify.map((i) => i.parent_id).filter(isDefined)
    if (parentIds.length > 0) {
      const parentRegions = await this.taxRegionService_.list(
        { id: { $in: parentIds } },
        { select: ["id", "country_code"] },
        sharedContext
      )

      for (const region of regionsToVerify) {
        if (isDefined(region.parent_id)) {
          const parentRegion = parentRegions.find(
            (r) => r.id === region.parent_id
          )
          if (!isDefined(parentRegion)) {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              `Province region must belong to a parent region. You are trying to create a province region with (country: ${region.country_code}, province: ${region.province_code}) but parent does not exist`
            )
          }

          if (parentRegion.country_code !== region.country_code) {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              `Province region must belong to a parent region with the same country code. You are trying to create a province region with (country: ${region.country_code}, province: ${region.province_code}) but parent expects (country: ${parentRegion.country_code})`
            )
          }
        }
      }
    }
  }

  private async getTaxRatesForItem(
    item: TaxTypes.TaxableItemDTO | TaxTypes.TaxableShippingDTO,
    rates: TTaxRate[]
  ): Promise<(TaxTypes.ItemTaxLineDTO | TaxTypes.ShippingTaxLineDTO)[]> {
    if (!rates.length) {
      return []
    }

    const prioritizedRates = this.prioritizeRates(rates, item)
    const rate = prioritizedRates[0]

    const ratesToReturn = [this.buildRateForItem(rate, item)]

    // If the rate can be combined we need to find the rate's
    // parent region and add that rate too. If not we can return now.
    if (!(rate.is_combinable && rate.tax_region.parent_id)) {
      return ratesToReturn
    }

    // First parent region rate in prioritized rates
    // will be the most granular rate.
    const parentRate = prioritizedRates.find(
      (r) => r.tax_region.id === rate.tax_region.parent_id
    )

    if (parentRate) {
      ratesToReturn.push(this.buildRateForItem(parentRate, item))
    }

    return ratesToReturn
  }

  private buildRateForItem(
    rate: TTaxRate,
    item: TaxTypes.TaxableItemDTO | TaxTypes.TaxableShippingDTO
  ): TaxTypes.ItemTaxLineDTO | TaxTypes.ShippingTaxLineDTO {
    const isShipping = "shipping_option_id" in item
    const toReturn = {
      rate_id: rate.id,
      rate: rate.rate,
      code: rate.code,
      name: rate.name,
    }

    if (isShipping) {
      return {
        ...toReturn,
        shipping_line_id: item.id,
      }
    }

    return {
      ...toReturn,
      line_item_id: item.id,
    }
  }

  private getTaxRateQueryForItem(
    item: TaxTypes.TaxableItemDTO | TaxTypes.TaxableShippingDTO,
    regionIds: string[]
  ) {
    const isShipping = "shipping_option_id" in item
    let ruleQuery = isShipping
      ? [
          {
            reference: "shipping_option",
            reference_id: item.shipping_option_id,
          },
        ]
      : [
          {
            reference: "product",
            reference_id: item.product_id,
          },
          {
            reference: "product_type",
            reference_id: item.product_type_id,
          },
        ]

    return {
      $and: [
        { tax_region_id: regionIds },
        { $or: [{ is_default: true }, { rules: { $or: ruleQuery } }] },
      ],
    }
  }

  private checkRuleMatches(
    rate: TTaxRate,
    item: TaxTypes.TaxableItemDTO | TaxTypes.TaxableShippingDTO
  ) {
    if (rate.rules.length === 0) {
      return {
        isProductMatch: false,
        isProductTypeMatch: false,
        isShippingMatch: false,
      }
    }

    let isProductMatch = false
    const isShipping = "shipping_option_id" in item
    const matchingRules = rate.rules.filter((rule) => {
      if (isShipping) {
        return (
          rule.reference === "shipping" &&
          rule.reference_id === item.shipping_option_id
        )
      }
      return (
        (rule.reference === "product" &&
          rule.reference_id === item.product_id) ||
        (rule.reference === "product_type" &&
          rule.reference_id === item.product_type_id)
      )
    })

    if (matchingRules.some((rule) => rule.reference === "product")) {
      isProductMatch = true
    }

    return {
      isProductMatch,
      isProductTypeMatch: matchingRules.length > 0,
      isShippingMatch: isShipping && matchingRules.length > 0,
    }
  }

  private prioritizeRates(
    rates: TTaxRate[],
    item: TaxTypes.TaxableItemDTO | TaxTypes.TaxableShippingDTO
  ) {
    const decoratedRates: (TTaxRate & {
      priority_score: number
    })[] = rates.map((rate) => {
      const { isProductMatch, isProductTypeMatch, isShippingMatch } =
        this.checkRuleMatches(rate, item)

      const isProvince = rate.tax_region.province_code !== null
      const isDefault = rate.is_default

      const decoratedRate = {
        ...rate,
        priority_score: 7,
      }

      if ((isShippingMatch || isProductMatch) && isProvince) {
        decoratedRate.priority_score = 1
      } else if (isProductTypeMatch && isProvince) {
        decoratedRate.priority_score = 2
      } else if (isDefault && isProvince) {
        decoratedRate.priority_score = 3
      } else if ((isShippingMatch || isProductMatch) && !isProvince) {
        decoratedRate.priority_score = 4
      } else if (isProductTypeMatch && !isProvince) {
        decoratedRate.priority_score = 5
      } else if (isDefault && !isProvince) {
        decoratedRate.priority_score = 6
      }
      return decoratedRate
    })

    return decoratedRates.sort(
      (a, b) => (a as any).priority_score - (b as any).priority_score
    )
  }
}
