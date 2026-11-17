import { ActionButton } from "@react-spectrum/s2/ActionButton";
import { Button } from "@react-spectrum/s2/Button";
import { Content } from "@react-spectrum/s2/Content";
import { Heading } from "@react-spectrum/s2/Heading";
import { IllustratedMessage } from "@react-spectrum/s2/IllustratedMessage";
import { InlineAlert } from "@react-spectrum/s2/InlineAlert";
import Refresh from "@react-spectrum/s2/icons/Refresh";
import { Menu, MenuItem, MenuTrigger } from "@react-spectrum/s2/Menu";
import { ProgressCircle } from "@react-spectrum/s2/ProgressCircle";
import { StatusLight } from "@react-spectrum/s2/StatusLight";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import {
  Cell,
  Column,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@react-spectrum/s2/TableView";
import { useCallback } from "react";

import { isActive } from "#engine";

import { describeConditions, describeWhen } from "../lib/rules.ts";

import type { Key } from "react-aria-components";
import type { LabelRule } from "../lib/types.ts";

export type RulesListProps = {
  error: string | null;
  examples: LabelRule[];
  loading: boolean;
  onCreate: (template?: LabelRule) => void;
  onEdit: (code: string) => void;
  onReload: () => void;
  rules: LabelRule[];
};

/** A small copy of the label as shoppers see it. */
function Swatch({ rule }: { rule: LabelRule }) {
  return (
    <span
      className={style({
        borderRadius: "sm",
        display: "inline-block",
        font: "ui-sm",
        fontWeight: "bold",
        paddingX: 8,
        paddingY: 2,
      })}
      style={{
        background: rule.background || "#1f1f1f",
        color: rule.color || "#ffffff",
      }}>
      {rule.text}
    </span>
  );
}

function status(rule: LabelRule): {
  label: string;
  variant: "positive" | "neutral" | "notice";
} {
  if (rule.enabled === false) {
    return { label: "Off", variant: "neutral" };
  }
  if (!isActive(rule)) {
    return { label: "Scheduled or ended", variant: "notice" };
  }
  return { label: "On", variant: "positive" };
}

export function RulesList({
  rules,
  examples,
  loading,
  error,
  onReload,
  onEdit,
  onCreate,
}: RulesListProps) {
  const handleRowAction = useCallback(
    (key: Key) => onEdit(String(key)),
    [onEdit],
  );
  const handleNew = useCallback(() => onCreate(), [onCreate]);
  const handleTemplate = useCallback(
    (key: Key) => {
      const example = examples.find((rule) => rule.code === key);
      if (example) {
        onCreate(example);
      }
    },
    [examples, onCreate],
  );

  const renderEmptyState = useCallback(
    () => (
      <IllustratedMessage>
        <Heading>No labels yet</Heading>
        <Content>Add a label, or start from an example.</Content>
      </IllustratedMessage>
    ),
    [],
  );

  return (
    <main
      className={style({ display: "flex", flexDirection: "column", gap: 16 })}>
      <div className={style({ alignItems: "center", display: "flex", gap: 8 })}>
        <Heading
          level={1}
          styles={style({ flexGrow: 1, font: "heading-lg", margin: 0 })}>
          Product labels
        </Heading>
        <ActionButton
          aria-label="Reload"
          isDisabled={loading}
          onPress={onReload}>
          <Refresh />
        </ActionButton>
        <MenuTrigger>
          <Button variant="secondary">Start from example</Button>
          <Menu items={examples} onAction={handleTemplate}>
            {(example) => <MenuItem id={example.code}>{example.name}</MenuItem>}
          </Menu>
        </MenuTrigger>
        <Button onPress={handleNew} variant="accent">
          Add label
        </Button>
      </div>

      {error && (
        <InlineAlert variant="negative">
          <Heading>Couldn't load labels</Heading>
          <Content>{error}</Content>
        </InlineAlert>
      )}

      {loading ? (
        <div
          className={style({
            display: "flex",
            justifyContent: "center",
            marginTop: 32,
          })}>
          <ProgressCircle
            aria-label="Loading labels"
            isIndeterminate
            size="L"
          />
        </div>
      ) : (
        <TableView
          aria-label="Product labels"
          onAction={handleRowAction}
          selectionMode="none"
          styles={style({ minHeight: 320, width: "full" })}>
          <TableHeader>
            <Column isRowHeader>Name</Column>
            <Column>Label</Column>
            <Column>Shown when</Column>
            <Column>Dates</Column>
            <Column>Priority</Column>
            <Column>Status</Column>
          </TableHeader>
          <TableBody items={rules} renderEmptyState={renderEmptyState}>
            {(rule) => {
              const state = status(rule);
              return (
                <Row id={rule.code}>
                  <Cell>{rule.name}</Cell>
                  <Cell>
                    <Swatch rule={rule} />
                  </Cell>
                  <Cell>{describeConditions(rule)}</Cell>
                  <Cell>{describeWhen(rule)}</Cell>
                  <Cell>{String(rule.priority ?? 0)}</Cell>
                  <Cell>
                    <StatusLight size="S" variant={state.variant}>
                      {state.label}
                    </StatusLight>
                  </Cell>
                </Row>
              );
            }}
          </TableBody>
        </TableView>
      )}
    </main>
  );
}
