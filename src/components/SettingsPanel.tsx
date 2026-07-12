import type { TableRules } from "../game/rules";

type SettingsPanelProps = {
  rules: TableRules;
  onChange: (rules: TableRules) => void;
};

export function SettingsPanel({ rules, onChange }: SettingsPanelProps) {
  return (
    <section className="panel">
      <h2>Settings</h2>
      <div className="settings-grid">
        <label>
          Decks
          <select
            value={rules.deckCount}
            onChange={(event) => onChange({ ...rules, deckCount: Number(event.target.value) as TableRules["deckCount"] })}
          >
            {[1, 2, 4, 6, 8].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>

        <label>
          Dealer soft 17
          <select
            value={rules.dealerHitsSoft17 ? "hit" : "stand"}
            onChange={(event) => onChange({ ...rules, dealerHitsSoft17: event.target.value === "hit" })}
          >
            <option value="stand">Dealer stands</option>
            <option value="hit">Dealer hits</option>
          </select>
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={rules.dealerPeeksForBlackjack}
            onChange={(event) => onChange({ ...rules, dealerPeeksForBlackjack: event.target.checked })}
          />
          Dealer peeks for blackjack
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={rules.surrenderAllowed}
            onChange={(event) => onChange({ ...rules, surrenderAllowed: event.target.checked })}
          />
          Surrender allowed
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={rules.doubleAfterSplit}
            onChange={(event) => onChange({ ...rules, doubleAfterSplit: event.target.checked })}
          />
          Double after split
        </label>
      </div>
    </section>
  );
}
