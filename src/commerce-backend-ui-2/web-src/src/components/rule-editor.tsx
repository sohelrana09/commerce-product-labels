import { AlertDialog } from "@react-spectrum/s2/AlertDialog";
import { Button } from "@react-spectrum/s2/Button";
import { ButtonGroup } from "@react-spectrum/s2/ButtonGroup";
import { Checkbox } from "@react-spectrum/s2/Checkbox";
import { CheckboxGroup } from "@react-spectrum/s2/CheckboxGroup";
import { ColorField } from "@react-spectrum/s2/ColorField";
import { Content } from "@react-spectrum/s2/Content";
import { DialogTrigger } from "@react-spectrum/s2/Dialog";
import { Heading } from "@react-spectrum/s2/Heading";
import { InlineAlert } from "@react-spectrum/s2/InlineAlert";
import { NumberField } from "@react-spectrum/s2/NumberField";
import { Picker, PickerItem } from "@react-spectrum/s2/Picker";
import { Switch } from "@react-spectrum/s2/Switch";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Tab, TabList, TabPanel, Tabs } from "@react-spectrum/s2/Tabs";
import { Text } from "@react-spectrum/s2/Text";
import { TextField } from "@react-spectrum/s2/TextField";
import { useMemo, useState } from "react";

import { MAX_TEXT_LENGTH, validateRule } from "#engine";

import { ApiError } from "../hooks/use-labels-api.ts";
import {
  cleanRule,
  PLACEMENT_LABELS,
  POSITION_LABELS,
  SHAPE_LABELS,
  TOKEN_HELP,
  toCode,
} from "../lib/rules.ts";
import { ConditionsEditor } from "./conditions-editor.tsx";
import { LabelPreview } from "./label-preview.tsx";

import type { Key } from "react-aria-components";
import type {
  LabelRule,
  Lookups,
  Placement,
  Position,
  SampleProduct,
  Shape,
} from "../lib/types.ts";

export type RuleEditorProps = {
  initial: LabelRule;
  lookups: Lookups | null;
  onCancel: () => void;
  onDelete: (code: string) => Promise<void>;
  onSave: (rule: LabelRule, previousCode?: string) => Promise<void>;
  /** The saved code when editing; undefined for a new rule. */
  originalCode?: string;
  sample: SampleProduct;
  onSampleChange: (sample: SampleProduct) => void;
};

const column = style({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  paddingY: 16,
});
const grid = style({
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
});

const DATE = /^\d{4}-\d{2}-\d{2}$/u;

function dateError(value?: string): string | undefined {
  return value && !DATE.test(value) ? "Use YYYY-MM-DD" : undefined;
}

function StoreViewsField({
  lookups,
  value,
  onChange,
}: {
  lookups: Lookups | null;
  value: string[];
  onChange: (codes: string[]) => void;
}) {
  const description = "Leave empty to show the label in every store view.";
  const available = lookups?.storeViews ?? [];
  if (lookups?.unavailable || available.length === 0) {
    return (
      <TextField
        description={`${description} Enter store view codes separated by commas.`}
        label="Store views"
        onChange={(text) =>
          onChange(
            text
              .split(",")
              .map((code) => code.trim())
              .filter(Boolean),
          )
        }
        value={value.join(", ")}
      />
    );
  }
  return (
    <Picker
      description={description}
      items={available}
      label="Store views"
      onChange={(keys) => onChange([...keys].map(String))}
      selectionMode="multiple"
      value={value}>
      {(item) => (
        <PickerItem id={item.code} textValue={item.label}>
          {`${item.label} (${item.code})`}
        </PickerItem>
      )}
    </Picker>
  );
}

export function RuleEditor({
  initial,
  originalCode,
  lookups,
  onSave,
  onDelete,
  onCancel,
  sample,
  onSampleChange,
}: RuleEditorProps) {
  const [rule, setRule] = useState<LabelRule>(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [placement, setPlacement] = useState<Placement>("listing");
  const isNew = originalCode === undefined;
  const set = (patch: Partial<LabelRule>) =>
    setRule((current) => ({ ...current, ...patch }));
  const previewRules = useMemo(() => [cleanRule(rule)], [rule]);
  const problems = useMemo(() => validateRule(cleanRule(rule)), [rule]);

  const handleSave = async () => {
    const local = validateRule(cleanRule(rule));
    if (local.length) {
      setErrors(local);
      return;
    }
    setSaving(true);
    setErrors([]);
    try {
      await onSave(cleanRule(rule), originalCode);
    } catch (error) {
      setErrors(
        error instanceof ApiError && error.errors.length
          ? error.errors
          : [(error as Error).message],
      );
    } finally {
      setSaving(false);
    }
  };

  const placements = rule.placements ?? [];
  const previewNote =
    placements.length && !placements.includes(placement)
      ? "This label isn't shown here."
      : undefined;

  return (
    <main
      className={style({ display: "flex", flexDirection: "column", gap: 8 })}>
      <div className={style({ alignItems: "center", display: "flex", gap: 8 })}>
        <Heading level={1} styles={style({ flexGrow: 1 })}>
          {isNew ? "New label" : rule.name || originalCode}
        </Heading>
        <ButtonGroup>
          {!isNew && (
            <DialogTrigger>
              <Button variant="negative">Delete</Button>
              <AlertDialog
                onPrimaryAction={() => onDelete(originalCode)}
                primaryActionLabel="Delete"
                secondaryActionLabel="Cancel"
                title="Delete this label?"
                variant="destructive">
                “{rule.name}” disappears from the storefront once browsers and
                the CDN refresh the label rules (a few minutes).
              </AlertDialog>
            </DialogTrigger>
          )}
          <Button onPress={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button
            isDisabled={!(rule.code && rule.name && rule.text)}
            isPending={saving}
            onPress={handleSave}
            variant="accent">
            Save
          </Button>
        </ButtonGroup>
      </div>

      {errors.length > 0 && (
        <InlineAlert variant="negative">
          <Heading>The label wasn't saved</Heading>
          <Content>
            {errors.map((message) => (
              <div key={message}>{message}</div>
            ))}
          </Content>
        </InlineAlert>
      )}

      <Tabs aria-label="Label settings">
        <TabList>
          <Tab id="label">Label</Tab>
          <Tab id="conditions">Conditions</Tab>
          <Tab id="where">Where & when</Tab>
        </TabList>

        <TabPanel id="label">
          <div className={column}>
            <Switch
              isSelected={rule.enabled !== false}
              onChange={(enabled) => set({ enabled })}>
              Show this label
            </Switch>
            <div className={grid}>
              <TextField
                description="Only you see this, in the Admin."
                isRequired
                label="Name"
                onChange={(name) =>
                  set({
                    code:
                      isNew &&
                      !originalCode &&
                      (!rule.code || rule.code === toCode(rule.name))
                        ? toCode(name)
                        : rule.code,
                    name,
                  })
                }
                value={rule.name}
              />
              <TextField
                description="Unique; a-z, 0-9, - and _. Also a CSS class: product-label--<code>."
                isRequired
                label="Code"
                onChange={(code) => set({ code: toCode(code) })}
                value={rule.code}
              />
              <NumberField
                description="Lower numbers come first."
                label="Priority"
                onChange={(value) =>
                  set({ priority: Number.isNaN(value) ? 0 : value })
                }
                value={rule.priority ?? 0}
              />
            </div>
            <TextField
              description={`What shoppers see, up to ${MAX_TEXT_LENGTH} characters. ${TOKEN_HELP}`}
              isRequired
              label="Text"
              maxLength={MAX_TEXT_LENGTH}
              onChange={(text) => set({ text })}
              value={rule.text}
            />
            <div className={grid}>
              <Picker
                label="Position"
                onSelectionChange={(key: Key | null) =>
                  set({ position: String(key) as Position })
                }
                selectedKey={rule.position ?? "top-left"}>
                {Object.entries(POSITION_LABELS).map(([id, label]) => (
                  <PickerItem id={id} key={id}>
                    {label}
                  </PickerItem>
                ))}
              </Picker>
              <Picker
                label="Shape"
                onSelectionChange={(key: Key | null) =>
                  set({ shape: String(key) as Shape })
                }
                selectedKey={rule.shape ?? "rectangle"}>
                {Object.entries(SHAPE_LABELS).map(([id, label]) => (
                  <PickerItem id={id} key={id}>
                    {label}
                  </PickerItem>
                ))}
              </Picker>
              <ColorField
                label="Background"
                onChange={(color) =>
                  set({ background: color ? color.toString("hex") : "" })
                }
                value={rule.background || "#1f1f1f"}
              />
              <ColorField
                label="Text color"
                onChange={(color) =>
                  set({ color: color ? color.toString("hex") : "" })
                }
                value={rule.color || "#ffffff"}
              />
            </div>
            <Checkbox
              isSelected={rule.stopFurther === true}
              onChange={(stopFurther) => set({ stopFurther })}>
              When this label shows, skip labels with a higher priority number
            </Checkbox>
          </div>
        </TabPanel>

        <TabPanel id="conditions">
          <div className={column}>
            <ConditionsEditor
              conditions={rule.conditions ?? []}
              match={rule.match ?? "all"}
              onChange={(conditions) => set({ conditions })}
              onMatchChange={(match) => set({ match })}
            />
          </div>
        </TabPanel>

        <TabPanel id="where">
          <div className={column}>
            <CheckboxGroup
              description="Pick at least one."
              label="Show on"
              onChange={(values) => set({ placements: values as Placement[] })}
              value={placements}>
              {Object.entries(PLACEMENT_LABELS).map(([id, label]) => (
                <Checkbox key={id} value={id}>
                  {label}
                </Checkbox>
              ))}
            </CheckboxGroup>
            <StoreViewsField
              lookups={lookups}
              onChange={(storeViews) => set({ storeViews })}
              value={rule.storeViews ?? []}
            />
            <div className={grid}>
              <TextField
                description="YYYY-MM-DD, in the shopper's time zone. Empty: no start date."
                errorMessage={dateError(rule.activeFrom)}
                isInvalid={Boolean(dateError(rule.activeFrom))}
                label="Show from"
                onChange={(activeFrom) =>
                  set({ activeFrom: activeFrom.trim() })
                }
                placeholder="2026-11-27"
                value={rule.activeFrom ?? ""}
              />
              <TextField
                description="Shown through the end of this day. Empty: no end date."
                errorMessage={dateError(rule.activeTo)}
                isInvalid={Boolean(dateError(rule.activeTo))}
                label="Show until"
                onChange={(activeTo) => set({ activeTo: activeTo.trim() })}
                placeholder="2026-12-01"
                value={rule.activeTo ?? ""}
              />
            </div>
          </div>
        </TabPanel>
      </Tabs>

      <Heading level={2} styles={style({ font: "heading-sm", marginTop: 16 })}>
        Preview
      </Heading>
      {problems.length > 0 && rule.text && (
        <Text>Fix before saving: {problems.join("; ")}.</Text>
      )}
      <LabelPreview
        ignoreDates
        note={previewNote}
        onPlacementChange={setPlacement}
        onSampleChange={onSampleChange}
        placement={placement}
        rules={previewRules}
        sample={sample}
      />
    </main>
  );
}
