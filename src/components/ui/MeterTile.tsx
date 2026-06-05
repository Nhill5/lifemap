import { Ring } from './Ring'

export interface MeterData {
  id: string
  bucket: string       // accent slot name e.g. 'fitness'
  label: string
  value: string        // display string e.g. "90 / 190g"
  pct: number          // 0–100
}

export function MeterTile({ m }: { m: MeterData }) {
  const color = `var(--${m.bucket})`
  return (
    <div className="meter">
      <Ring pct={m.pct} color={color} />
      <div className="info">
        <span className="v">{m.value}</span>
        <span className="k">{m.label}</span>
      </div>
    </div>
  )
}
