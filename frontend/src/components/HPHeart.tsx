import React, { useEffect, useState } from "react"

type HPHeartProps = {
  currentHP: number
  maxHP: number
  hearts?: number
}

const HPHeart: React.FC<HPHeartProps> = ({ currentHP, maxHP, hearts = 5 }) => {
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    const timerOn = setTimeout(() => setPulse(true), 0)
    const timerOff = setTimeout(() => setPulse(false), 120)
    return () => {
      clearTimeout(timerOn)
      clearTimeout(timerOff)
    }
  }, [currentHP])

  const effective = Math.max(0, Math.min(maxHP, currentHP))
  const hpPerHeart = maxHP / hearts

  const heartSymbols = Array.from({ length: hearts }, (_, i) => {
    const remainingForHeart = Math.max(0, effective - i * hpPerHeart)
    if (remainingForHeart >= hpPerHeart) return "♥"
    if (remainingForHeart > 0) return "💔"
    return "♡"
  })

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        transform: pulse ? "scale(1.12)" : "scale(1)",
        transition: "transform 0.12s ease",
      }}
    >
      {heartSymbols.map((symbol, idx) => (
        <span
          key={idx}
          style={{
            fontSize: "1.9rem",
            lineHeight: 1,
            color: symbol === "♡" ? "#ddd" : "#e22c2c",
          }}
        >
          {symbol}
        </span>
      ))}
    </div>
  )
}

export default HPHeart
