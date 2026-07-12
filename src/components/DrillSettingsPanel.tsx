import { drillCategories, type DrillCategory, type DrillSettings } from "../game/drill";
import type { TableRules } from "../game/rules";

type DrillSettingsPanelProps = {
  drillSettings: DrillSettings;
  rules: TableRules;
  onChange: (settings: DrillSettings) => void;
};

const categoryLabels: Record<DrillCategory, string> = {
  soft: "Soft hands",
  pair: "Pairs",
  surrender: "Surrender-eligible hands"
};

export function DrillSettingsPanel({ drillSettings, rules, onChange }: DrillSettingsPanelProps) {
  function setWeight(category: DrillCategory, value: number) {
    const clamped = Number.isNaN(value) ? 0 : Math.min(Math.max(Math.round(value), 0), 100);
    onChange({ ...drillSettings, weights: { ...drillSettings.weights, [category]: clamped } });
  }

  return (
    <section className="panel">
      <h2>Drill mode</h2>
      <p className="drill-description">
        Ignore the shoe and deal targeted hands a set percentage of the time, to drill edge cases. Whatever
        percentage is left over is dealt as a normal random hand.
      </p>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={drillSettings.enabled}
          onChange={(event) => onChange({ ...drillSettings, enabled: event.target.checked })}
        />
        Enable drill mode
      </label>

      <div className="drill-weights">
        {drillCategories.map((category) => {
          const disabled = !drillSettings.enabled || (category === "surrender" && !rules.surrenderAllowed);
          return (
            <label key={category} className="drill-weight-row">
              {categoryLabels[category]}
              <input
                type="number"
                min={0}
                max={100}
                value={drillSettings.weights[category]}
                disabled={disabled}
                onChange={(event) => setWeight(category, Number(event.target.value))}
              />
              <span>%</span>
              {category === "surrender" && !rules.surrenderAllowed && (
                <span className="drill-weight-note">Enable surrender in Settings to use this</span>
              )}
            </label>
          );
        })}
      </div>
    </section>
  );
}
