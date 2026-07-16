import type { StrategyHelpMode } from "../persistence/preferences";

type StrategyHelpSettingsPanelProps = {
  value: StrategyHelpMode;
  onChange: (mode: StrategyHelpMode) => void;
};

const options: { value: StrategyHelpMode; label: string; description: string }[] = [
  { value: "off", label: "Off", description: "Hide the contextual strategy recommendation while you play." },
  { value: "afterAnswer", label: "After answer", description: "Reveal the recommended play once you've made your decision." },
  { value: "always", label: "Always visible", description: "Show the recommended play before you choose an action." }
];

export function StrategyHelpSettingsPanel({ value, onChange }: StrategyHelpSettingsPanelProps) {
  const activeOption = options.find((option) => option.value === value);

  return (
    <section className="panel">
      <h2>Strategy help</h2>
      <div className="settings-grid">
        <label>
          Strategy help
          <select value={value} onChange={(event) => onChange(event.target.value as StrategyHelpMode)}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {activeOption && <p className="drill-description">{activeOption.description}</p>}
    </section>
  );
}
