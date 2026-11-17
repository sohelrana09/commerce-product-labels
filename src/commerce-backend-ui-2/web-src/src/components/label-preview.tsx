import { Checkbox } from "@react-spectrum/s2/Checkbox";
import { NumberField } from "@react-spectrum/s2/NumberField";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@react-spectrum/s2/SegmentedControl";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Text } from "@react-spectrum/s2/Text";
import { TextArea } from "@react-spectrum/s2/TextArea";
import { TextField } from "@react-spectrum/s2/TextField";
import { useMemo } from "react";

import { labelsFor } from "#engine";

// The storefront kit's own stylesheet, so the preview matches what shoppers see.
import "../../../../../storefront/styles/product-labels.css";

import { sampleToProduct } from "../lib/rules.ts";

import type {
  Label,
  LabelRule,
  Placement,
  SampleProduct,
} from "../lib/types.ts";

const tile = style({
  aspectRatio: "square",
  backgroundColor: "gray-100",
  borderColor: "gray-300",
  borderRadius: "lg",
  borderStyle: "solid",
  borderWidth: 1,
  overflow: "hidden",
  position: "relative",
  width: "full",
});

const tileCaption = style({
  alignItems: "center",
  color: "gray-600",
  display: "flex",
  font: "body-sm",
  height: "full",
  justifyContent: "center",
});

/** Draws labels with the storefront kit's markup and CSS. */
export function LabelBadges({ labels }: { labels: Label[] }) {
  const corners = new Map<string, Label[]>();
  for (const label of labels) {
    corners.set(label.position, [
      ...(corners.get(label.position) ?? []),
      label,
    ]);
  }
  if (!labels.length) {
    return null;
  }
  return (
    <div className="product-labels">
      {[...corners.entries()].map(([position, items]) => (
        <div
          className={`product-labels__corner product-labels__corner--${position}`}
          key={position}>
          {items.map((label) => (
            <span
              className={`product-label product-label--${label.shape}`}
              key={label.code}
              style={
                {
                  "--product-label-background": label.background,
                  "--product-label-color": label.color,
                } as React.CSSProperties
              }>
              {label.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export type LabelPreviewProps = {
  rules: LabelRule[];
  sample: SampleProduct;
  onSampleChange: (sample: SampleProduct) => void;
  placement: Placement;
  onPlacementChange: (placement: Placement) => void;
  maxPerPosition?: number;
  /** Shown under the tile, e.g. why a rule doesn't match. */
  note?: string;
  /** Preview a draft regardless of its dates (the editor); the list preview uses today. */
  ignoreDates?: boolean;
};

function optional(value: number): number {
  return Number.isNaN(value) ? 0 : value;
}

/**
 * A product tile with the labels the rules give a sample product, run through the same engine
 * as the storefront. With `ignoreDates`, a draft previews even while switched off or scheduled.
 */
export function LabelPreview({
  rules,
  sample,
  onSampleChange,
  placement,
  onPlacementChange,
  maxPerPosition,
  note,
  ignoreDates = false,
}: LabelPreviewProps) {
  const labels = useMemo(
    () =>
      labelsFor(
        sampleToProduct(sample),
        ignoreDates
          ? rules.map((rule) => ({
              ...rule,
              activeFrom: undefined,
              activeTo: undefined,
              enabled: true,
            }))
          : rules,
        { maxPerPosition, placement },
      ) as Label[],
    [rules, sample, placement, maxPerPosition, ignoreDates],
  );
  const set = (patch: Partial<SampleProduct>) =>
    onSampleChange({ ...sample, ...patch });

  return (
    <div
      className={style({
        display: "grid",
        gap: 24,
        gridTemplateColumns: {
          default: "1fr",
          lg: "minmax(220px, 320px) 1fr",
        },
      })}>
      <div
        className={style({ display: "flex", flexDirection: "column", gap: 8 })}>
        <SegmentedControl
          aria-label="Where the product is shown"
          onSelectionChange={(key) => onPlacementChange(key as Placement)}
          selectedKey={placement}>
          <SegmentedControlItem id="listing">Product list</SegmentedControlItem>
          <SegmentedControlItem id="product">Product page</SegmentedControlItem>
        </SegmentedControl>
        <div className={tile}>
          <div className={tileCaption}>{sample.name || "Product image"}</div>
          <LabelBadges labels={labels} />
        </div>
        <Text>
          {labels.length
            ? `${labels.length} label${labels.length === 1 ? "" : "s"} shown.`
            : "No label for this product."}
          {note ? ` ${note}` : ""}
        </Text>
      </div>

      <div
        className={style({
          display: "flex",
          flexDirection: "column",
          gap: 12,
        })}>
        <div
          className={style({
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          })}>
          <TextField
            label="Name"
            onChange={(name) => set({ name })}
            value={sample.name}
          />
          <TextField
            label="SKU"
            onChange={(sku) => set({ sku })}
            value={sample.sku}
          />
          <NumberField
            label="Regular price"
            minValue={0}
            onChange={(value) => set({ regularPrice: optional(value) })}
            value={sample.regularPrice}
          />
          <NumberField
            label="Final price"
            minValue={0}
            onChange={(value) => set({ finalPrice: optional(value) })}
            value={sample.finalPrice}
          />
          <TextField
            label="Currency"
            onChange={(currency) =>
              set({ currency: currency.toUpperCase().slice(0, 3) })
            }
            value={sample.currency}
          />
        </div>
        <div className={style({ display: "flex", gap: 16 })}>
          <Checkbox
            isSelected={sample.inStock}
            onChange={(inStock) => set({ inStock })}>
            In stock
          </Checkbox>
          <Checkbox
            isSelected={sample.lowStock}
            onChange={(lowStock) => set({ lowStock })}>
            Low stock
          </Checkbox>
        </div>
        <TextArea
          description="One attribute per line, as code=value."
          label="Attributes"
          onChange={(attributes) => set({ attributes })}
          value={sample.attributes}
        />
      </div>
    </div>
  );
}
