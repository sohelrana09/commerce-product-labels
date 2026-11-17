export type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";
export type Shape = "rectangle" | "pill" | "circle" | "ribbon";
export type Placement = "listing" | "product";
export type MatchMode = "all" | "any";

export type Condition = {
  field: string;
  operator: string;
  value?: string | number | boolean;
};

export type LabelRule = {
  code: string;
  name: string;
  enabled?: boolean;
  priority?: number;
  text: string;
  position?: Position;
  shape?: Shape;
  background?: string;
  color?: string;
  placements?: Placement[];
  storeViews?: string[];
  activeFrom?: string;
  activeTo?: string;
  match?: MatchMode;
  conditions?: Condition[];
  stopFurther?: boolean;
  updatedAt?: string;
};

export type StoreView = { code: string; id: number; label: string };

export type Lookups = {
  storeViews: StoreView[];
  unavailable?: boolean;
};

/** The sample product the preview runs rules against. */
export type SampleProduct = {
  name: string;
  sku: string;
  regularPrice: number;
  finalPrice: number;
  currency: string;
  inStock: boolean;
  lowStock: boolean;
  /** One `code=value` per line. */
  attributes: string;
};

export type Label = {
  code: string;
  text: string;
  position: Position;
  shape: Shape;
  background: string;
  color: string;
};
