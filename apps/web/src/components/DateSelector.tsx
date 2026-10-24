import { PILOT_PERIOD } from '../config'

interface DateSelectorProps {
  value: string
  isDefault: boolean
  onChange: (value: string) => void
}

export function DateSelector({
  value,
  isDefault,
  onChange,
}: DateSelectorProps) {
  function handleChange(nextDate: string) {
    const isWithinPilotPeriod =
      nextDate >= PILOT_PERIOD.minDecisionDate &&
      nextDate <= PILOT_PERIOD.maxDecisionDate

    if (nextDate === '' || isWithinPilotPeriod) {
      onChange(nextDate)
    }
  }

  return (
    <label className="date-select">
      <span>Decision date</span>
      <input
        type="date"
        value={value}
        min={PILOT_PERIOD.minDecisionDate}
        max={PILOT_PERIOD.maxDecisionDate}
        onChange={(event) => handleChange(event.target.value)}
        aria-describedby="date-scope-note"
      />
      <small id="date-scope-note" className="date-scope-note">
        {PILOT_PERIOD.label} only. The current pilot covers this month.
      </small>
      {isDefault && (
        <small className="default-date-note">
          Default view: January's highest-error day
        </small>
      )}
    </label>
  )
}
