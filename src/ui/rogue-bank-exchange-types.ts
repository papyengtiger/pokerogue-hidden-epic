import type { SpeciesId } from "#enums/species-id";
import type { ExchangeCurrencyType } from "#system/bank/exchange-currency-type";

export interface RogueBankExchangeEntry {
  label: string;
  currencyType: ExchangeCurrencyType;
  useCustomAmount?: boolean;
  speciesId?: SpeciesId;
}