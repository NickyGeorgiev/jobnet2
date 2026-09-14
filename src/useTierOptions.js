import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// Единствен източник на истината за цените на нивата на обявите
// (Silver/Gold/Platinum/Diamond) — чете directno от таблицата
// product_prices вместо hardcoded числа на няколко места (JS файлове
// + SQL RPC), за да не могат цените да се разминат едни с други.
//
// Иконите са чисто визуални (не са "пари"), затова остават тук като
// малка локална карта — няма смисъл да заемат колона в базата.
export const TIER_ICONS = { silver: '✦', gold: '✦', platinum: '❖', diamond: '💎' }

// tierOptions === null, докато зарежда за първи път.
// tierOptions === [] само ако наистина няма нито един ред в базата
// (или заявката гръмне) — компонентите, които го ползват, трябва да
// имат готовност за това (напр. да не позволяват плащане, докато
// зареди).
export function useTierOptions() {
  const [tierOptions, setTierOptions] = useState(null)

  useEffect(() => {
    let cancelled = false

    supabase
      .from('product_prices')
      .select('tier, rank, credits, price_eur, label, stripe_price_id')
      .eq('product_type', 'job_tier')
      .order('rank', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return

        if (error || !data) {
          console.error('Грешка при зареждане на цените за нива:', error)
          setTierOptions([])
          return
        }

        setTierOptions(
          data.map((row) => ({
            value: row.tier,
            label: row.label,
            icon: TIER_ICONS[row.tier] || '✦',
            rank: row.rank,
            price: row.credits, // цена в State Credits (токени)
            priceEur: row.price_eur, // цена в евро — за информация в UI
            priceId: row.stripe_price_id,
          }))
        )
      })

    return () => {
      cancelled = true
    }
  }, [])

  return tierOptions
}
