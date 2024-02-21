import { CartDTO, CartLineItemDTO } from "./common"

export interface CreateCartCreateLineItemDTO {
  quantity: number
  variant_id: string
  title?: string

  subtitle?: string
  thumbnail?: string

  product_id?: string
  product_title?: string
  product_description?: string
  product_subtitle?: string
  product_type?: string
  product_collection?: string
  product_handle?: string

  variant_sku?: string
  variant_barcode?: string
  variant_title?: string
  variant_option_values?: Record<string, unknown>

  requires_shipping?: boolean
  is_discountable?: boolean
  is_tax_inclusive?: boolean
  is_giftcard?: boolean

  compare_at_unit_price?: number
  unit_price?: number | string

  metadata?: Record<string, unknown>
}

export interface UpdateLineItemWorkflowInputDTO {
  update: {
    quantity: number
    metadata?: Record<string, unknown>
  }
  item: CartLineItemDTO
  cart: CartDTO
}

export interface CreateCartAddressDTO {
  first_name?: string
  last_name?: string
  phone?: string
  company?: string
  address_1?: string
  address_2?: string
  city?: string
  country_code?: string
  province?: string
  postal_code?: string
  metadata?: Record<string, unknown>
}

export interface CreateCartWorkflowInputDTO {
  region_id?: string
  customer_id?: string
  sales_channel_id?: string
  email?: string
  currency_code?: string
  shipping_address_id?: string
  billing_address_id?: string
  shipping_address?: CreateCartAddressDTO | string
  billing_address?: CreateCartAddressDTO | string
  metadata?: Record<string, unknown>

  items?: CreateCartCreateLineItemDTO[]
}

export interface AddToCartWorkflowInputDTO {
  items: CreateCartCreateLineItemDTO[]
  cart: CartDTO
}
