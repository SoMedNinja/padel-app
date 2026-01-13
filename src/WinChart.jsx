import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function WinChart({ matches }) {
  const scores = {}

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  matches.forEach(m=>{
    const matchDate = new Date(m.created_at)
    if(matchDate < thirtyDaysAgo) return
    const { team_a, team_b, sets_a, sets_b } = m
    const winner = sets_a > sets_b ? team_a : sets_b > sets_a ? team_b : null
    if(!winner) return
    winner.forEach(p=>{
      if(!scores[p]) scores[p]=0
      scores[p] += 1
    })
  })

  const data = {
    labels: Object.keys(scores),
    datasets: [{
      label: 'Vinster senaste 30 dagar',
      data: Object.values(scores),
      backgroundColor: 'rgba(211, 47, 47, 0.7)'
    }]
  }

  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true }
    }
  }

  return (
    <div style={{ marginBottom:20 }}>
      <h2>Vinster senaste 30 dagar</h2>
      <Bar data={data} options={options} />
    </div>
  )
}
