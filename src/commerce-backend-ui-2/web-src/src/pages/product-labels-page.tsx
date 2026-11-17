import { ActionButton } from "@react-spectrum/s2/ActionButton";
import { Content } from "@react-spectrum/s2/Content";
import { Divider } from "@react-spectrum/s2/Divider";
import { Heading } from "@react-spectrum/s2/Heading";
import { InlineAlert } from "@react-spectrum/s2/InlineAlert";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Text } from "@react-spectrum/s2/Text";
import { ToggleButton } from "@react-spectrum/s2/ToggleButton";
import { useCallback, useEffect, useState } from "react";

import { LabelPreview } from "../components/label-preview.tsx";
import { RuleEditor } from "../components/rule-editor.tsx";
import { RulesList } from "../components/rules-list.tsx";
import { useLabelsApi } from "../hooks/use-labels-api.ts";
import { DEFAULT_SAMPLE, editableCopy, emptyRule } from "../lib/rules.ts";

import type {
  LabelRule,
  Lookups,
  Placement,
  SampleProduct,
} from "../lib/types.ts";

type View = "rules" | "preview";
type Editing = { rule: LabelRule; originalCode?: string } | null;

export function ProductLabelsPage() {
  const api = useLabelsApi();
  const [view, setView] = useState<View>("rules");
  const [rules, setRules] = useState<LabelRule[]>([]);
  const [examples, setExamples] = useState<LabelRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [sample, setSample] = useState<SampleProduct>(DEFAULT_SAMPLE);
  const [placement, setPlacement] = useState<Placement>("listing");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listRules();
      setRules(data.rules);
      setExamples(data.examples);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    load();
    api
      .lookups()
      .then(setLookups, () =>
        setLookups({ storeViews: [], unavailable: true }),
      );
  }, [api, load]);

  const handleEdit = useCallback(
    (code: string) => {
      const rule = rules.find((r) => r.code === code);
      if (rule) {
        setEditing({ originalCode: code, rule: editableCopy(rule) });
      }
    },
    [rules],
  );

  const handleCreate = useCallback((template?: LabelRule) => {
    setEditing({
      rule: template
        ? { ...editableCopy(template), enabled: false }
        : emptyRule(),
    });
  }, []);

  const handleSave = async (rule: LabelRule, previousCode?: string) => {
    await api.saveRule(rule, previousCode);
    setEditing(null);
    setNotice(
      `Saved “${rule.name}”. Shoppers see the change within a few minutes, once cached label rules expire.`,
    );
    await load();
  };

  const handleDelete = async (code: string) => {
    await api.deleteRule(code);
    setEditing(null);
    setNotice("Label deleted.");
    await load();
  };

  const page = style({
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 24,
  });

  if (editing) {
    return (
      <div className={page}>
        <RuleEditor
          initial={editing.rule}
          key={editing.originalCode ?? "new"}
          lookups={lookups}
          onCancel={() => setEditing(null)}
          onDelete={handleDelete}
          onSampleChange={setSample}
          onSave={handleSave}
          originalCode={editing.originalCode}
          sample={sample}
        />
      </div>
    );
  }

  return (
    <div className={page}>
      <div className={style({ display: "flex", gap: 8 })}>
        <ToggleButton
          isSelected={view === "rules"}
          onChange={() => setView("rules")}>
          Labels
        </ToggleButton>
        <ToggleButton
          isSelected={view === "preview"}
          onChange={() => setView("preview")}>
          Test a product
        </ToggleButton>
      </div>
      <Divider />

      {notice && (
        <InlineAlert variant="positive">
          <Heading>Done</Heading>
          <Content>
            <div
              className={style({
                alignItems: "center",
                display: "flex",
                gap: 8,
                justifyContent: "space-between",
              })}>
              <Text>{notice}</Text>
              <ActionButton isQuiet onPress={() => setNotice(null)}>
                Dismiss
              </ActionButton>
            </div>
          </Content>
        </InlineAlert>
      )}

      {view === "rules" ? (
        <RulesList
          error={error}
          examples={examples}
          loading={loading}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onReload={load}
          rules={rules}
        />
      ) : (
        <main
          className={style({
            display: "flex",
            flexDirection: "column",
            gap: 16,
          })}>
          <Heading level={1} styles={style({ font: "heading-lg", margin: 0 })}>
            Test a product
          </Heading>
          <Text>
            Describe a product to see which saved labels it gets today, with the
            same rules engine the storefront uses.
          </Text>
          <LabelPreview
            onPlacementChange={setPlacement}
            onSampleChange={setSample}
            placement={placement}
            rules={rules}
            sample={sample}
          />
        </main>
      )}
    </div>
  );
}
