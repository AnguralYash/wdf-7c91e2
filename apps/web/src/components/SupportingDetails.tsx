import { CheckCircle2 } from 'lucide-react'

interface SupportingDetailsProps {
  assumptions: string[]
}

export function SupportingDetails({
  assumptions,
}: SupportingDetailsProps) {
  return (
    <section className="supporting-details">
      <details className="panel">
        <summary>How this analysis works</summary>
        <div className="details-content">
          <ol>
            <li>Select the latest forecast published before 15:30 GMT.</li>
            <li>Use it for the following delivery day.</li>
            <li>Average two half-hour actuals for each hourly comparison.</li>
            <li>Calculate error as forecast minus actual generation.</li>
          </ol>
          <h3>Documented assumptions</h3>
          <ul>
            {assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
      </details>

      <details className="panel">
        <summary>Future opportunities</summary>
        <div className="details-content">
          <p>
            Adding private operational data could extend this pilot into
            purchase guidance.
          </p>
          <ul className="opportunity-list">
            <li>
              <CheckCircle2 aria-hidden="true" />
              Demand and other generation forecasts
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" />
              Existing contracts, reserves, and owned assets
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" />
              Market prices and cost-aware scenarios
            </li>
          </ul>
        </div>
      </details>
    </section>
  )
}
