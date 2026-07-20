export type ListFormat =
  | 'date'
  | 'currency'
  | 'number'
  | 'pourcentage'
  | 'image'
  | 'badge'
  | 'boolean';

export interface ListHeaderBooleanConfig {
  type?: 'check' | 'badge';
  trueLabel?: string;
  falseLabel?: string;
  trueBadgeClass?: string;
  falseBadgeClass?: string;
}

export interface ListHeaderCurrencyConfig {
  code?: string;
  digitsInfo?: string;
}

export interface ListHeaderModel {
  label: string;
  field: string[];
  format?: ListFormat;
  staticClass?: string;
  dynamicClass?: string;
  boolean?: ListHeaderBooleanConfig;
  currency?: ListHeaderCurrencyConfig;
  size?: string;
  valueLabels?: Record<string, string>;
}

export interface ListCell {
  value: string | null;
  size: string;
  format?: ListFormat;
  allClasses: string;
  booleanLabel?: string;
  booleanBadgeClass?: string;
  booleanType: 'check' | 'badge';
  currencyCode: string;
  currencyDigitsInfo: string;
}

export interface ListAction {
  name: string;
  callback: (line: unknown) => void;
}

export interface OverviewItem {
  label: string;
  value: number;
  value_data?: { currency?: string };
}

export interface ListResponseConfig {
  dataKey?: string;
  countKey?: string;
}

export interface ListAddButtonLink {
  url: string;
  fragment?: string;
}

export interface ListDetailLink {
  link: string;
  field: string;
  fragment?: string;
}

export interface ListRowSelect {
  callback: (line: unknown) => void;
}
