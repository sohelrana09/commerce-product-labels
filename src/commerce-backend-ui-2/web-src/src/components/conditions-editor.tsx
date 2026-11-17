import { ActionButton } from "@react-spectrum/s2/ActionButton";
import { Button } from "@react-spectrum/s2/Button";
import Delete from "@react-spectrum/s2/icons/Delete";
import { NumberField } from "@react-spectrum/s2/NumberField";
import { Picker, PickerItem } from "@react-spectrum/s2/Picker";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Text } from "@react-spectrum/s2/Text";
import { TextField } from "@react-spectrum/s2/TextField";

import { ATTRIBUTE_PREFIX } from "#engine";

import {
  attributeCode,
  FIELD_LABELS,
  fieldKey,
  fieldTypeOf,
  needsValue,
  newCondition,
  OPERATOR_LABELS,
  operatorsFor,
} from "../lib/rules.ts";

import type { Key } from "react-aria-components";
import type { Condition, MatchMode } from "../lib/types.ts";

export type ConditionsEditorProps = {
  conditions: Condition[];
  match: MatchMode;
  onChange: (conditions: Condition[]) => void;
  onMatchChange: (match: MatchMode) => void;
};

const row = style({
  alignItems: "end",
  display: "grid",
  gap: 12,
  gridTemplateColumns: {
    default: "1fr",
    md: "minmax(160px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(140px, 1fr) auto",
  },
});

function defaultValue(key: string): Condition["value"] {
  const type = fieldTypeOf(key);
  if (type === "boolean") {
    return true;
  }
  return type === "number" ? 0 : "";
}

function ConditionRow({
  condition,
  index,
  onChange,
  onRemove,
}: {
  condition: Condition;
  index: number;
  onChange: (condition: Condition) => void;
  onRemove: () => void;
}) {
  const key = fieldKey(condition.field);
  const type = fieldTypeOf(key);
  const operators = operatorsFor(key);

  const changeField = (next: Key | null) => {
    const nextKey = String(next);
    const field = nextKey === "attribute" ? `${ATTRIBUTE_PREFIX}` : nextKey;
    onChange({
      field,
      operator: operatorsFor(nextKey)[0],
      value: defaultValue(nextKey),
    });
  };

  return (
    <div className={row}>
      <Picker
        aria-label={`Condition ${index + 1} field`}
        label={index === 0 ? "Field" : undefined}
        onSelectionChange={changeField}
        selectedKey={key}>
        {Object.entries(FIELD_LABELS).map(([id, label]) => (
          <PickerItem id={id} key={id}>
            {label}
          </PickerItem>
        ))}
      </Picker>
      {key === "attribute" ? (
        <TextField
          aria-label={`Condition ${index + 1} attribute code`}
          label={index === 0 ? "Attribute code" : undefined}
          onChange={(code) =>
            onChange({
              ...condition,
              field: `${ATTRIBUTE_PREFIX}${code.trim().toLowerCase()}`,
            })
          }
          placeholder="e.g. brand"
          value={attributeCode(condition.field)}
        />
      ) : (
        <div />
      )}
      <Picker
        aria-label={`Condition ${index + 1} operator`}
        label={index === 0 ? "Operator" : undefined}
        onSelectionChange={(operator) =>
          onChange({ ...condition, operator: String(operator) })
        }
        selectedKey={condition.operator}>
        {operators.map((id) => (
          <PickerItem id={id} key={id}>
            {OPERATOR_LABELS[id] ?? id}
          </PickerItem>
        ))}
      </Picker>
      {needsValue(condition.operator) && type === "number" && (
        <NumberField
          aria-label={`Condition ${index + 1} value`}
          label={index === 0 ? "Value" : undefined}
          onChange={(value) =>
            onChange({ ...condition, value: Number.isNaN(value) ? 0 : value })
          }
          value={Number(condition.value ?? 0)}
        />
      )}
      {needsValue(condition.operator) && type === "boolean" && (
        <Picker
          aria-label={`Condition ${index + 1} value`}
          label={index === 0 ? "Value" : undefined}
          onSelectionChange={(value) =>
            onChange({ ...condition, value: value === "yes" })
          }
          selectedKey={condition.value === false ? "no" : "yes"}>
          <PickerItem id="yes">Yes</PickerItem>
          <PickerItem id="no">No</PickerItem>
        </Picker>
      )}
      {needsValue(condition.operator) && type === "text" && (
        <TextField
          aria-label={`Condition ${index + 1} value`}
          label={index === 0 ? "Value" : undefined}
          onChange={(value) => onChange({ ...condition, value })}
          placeholder={
            condition.operator.endsWith("in") ? "comma-separated" : undefined
          }
          value={String(condition.value ?? "")}
        />
      )}
      {!needsValue(condition.operator) && <div />}
      <ActionButton
        aria-label={`Remove condition ${index + 1}`}
        isQuiet
        onPress={onRemove}>
        <Delete />
      </ActionButton>
    </div>
  );
}

export function ConditionsEditor({
  conditions,
  match,
  onChange,
  onMatchChange,
}: ConditionsEditorProps) {
  const update = (index: number, condition: Condition) =>
    onChange(conditions.map((c, i) => (i === index ? condition : c)));
  const remove = (index: number) =>
    onChange(conditions.filter((_, i) => i !== index));

  return (
    <div
      className={style({ display: "flex", flexDirection: "column", gap: 12 })}>
      {conditions.length > 1 && (
        <Picker
          label="Show the label when"
          onSelectionChange={(key) => onMatchChange(String(key) as MatchMode)}
          selectedKey={match}
          styles={style({ maxWidth: 320 })}>
          <PickerItem id="all">All conditions are true</PickerItem>
          <PickerItem id="any">Any condition is true</PickerItem>
        </Picker>
      )}
      {conditions.length === 0 && (
        <Text>No conditions: every product gets this label.</Text>
      )}
      {conditions.map((condition, index) => (
        <ConditionRow
          condition={condition}
          index={index}
          key={index}
          onChange={(next) => update(index, next)}
          onRemove={() => remove(index)}
        />
      ))}
      <div>
        <Button
          onPress={() => onChange([...conditions, newCondition()])}
          variant="secondary">
          Add condition
        </Button>
      </div>
      <Text>
        Attribute conditions read the product attributes your storefront loads
        (Catalog Service attributes visible on the storefront). Text comparisons
        ignore case.
      </Text>
    </div>
  );
}
