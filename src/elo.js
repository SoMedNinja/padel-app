const BASE_ELO = 1000
const K = 32

export function calculateElo(matches) {
  const ratings = {}

  const getRating = (p) => ratings[p] ?? BASE_ELO

  matches.forEach(m => {
    const teamA = m.team_a
    const teamB = m.team_b
    const winner =
      m.sets_a > m.sets_b ? teamA :
      m.sets_b > m.sets_a ? teamB :
      null

    if (!winner) return

    const ratingA =
      teamA.reduce((s, p) => s + getRating(p), 0) / teamA.length
    const ratingB =
      teamB.reduce((s, p) => s + getRating(p), 0) / teamB.length

    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
    const scoreA = winner === teamA ? 1 : 0
    const delta = Math.round(K * (scoreA - expectedA))

    teamA.forEach(p => ratings[p] = getRating(p) + delta)
    teamB.forEach(p => ratings[p] = getRating(p) - delta)
  })

  return ratings
}
