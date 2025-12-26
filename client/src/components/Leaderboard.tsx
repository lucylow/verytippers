import React, { useEffect, useState } from 'react'
import { api_getLeaderboard } from '@/lib/mockApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Leaderboard() {
  const [items, setItems] = useState<{username:string;total:number}[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const rows = await api_getLeaderboard()
      setItems(rows as any)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 3000) // poll every 3s
    return () => clearInterval(t)
  }, [])

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🏆'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return '⭐'
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            Loading leaderboard...
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No tips yet. Be the first!
          </div>
        ) : (
          <ol className="space-y-3">
            {items.slice(0, 10).map((it, idx) => (
              <li 
                key={it.username} 
                className={cn(
                  "flex justify-between items-center p-2 rounded-lg transition-colors",
                  idx < 3 && "bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getRankBadge(idx + 1)}</span>
                  <div>
                    <div className="font-medium">{it.username}</div>
                    <div className="text-xs text-muted-foreground">Rank #{idx + 1}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-mono font-semibold">{it.total} VERY</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

