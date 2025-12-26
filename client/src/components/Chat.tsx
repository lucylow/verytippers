import React, { useState } from 'react'
import { TipPayload } from '@/types/tip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Send } from 'lucide-react'

type ChatProps = {
  me: { id: string; username: string }
  onRequestTip: (payload: TipPayload) => void
}

export default function Chat({ me, onRequestTip }: ChatProps) {
  const [text, setText] = useState('')
  const [suggestion, setSuggestion] = useState<{amount:number;text:string}|null>(null)

  function parseTipCommand(input: string) {
    // simple parse: /tip @username 5
    const m = input.trim().match(/^\/tip\s+@?(\w+)\s+(\d+)/i)
    if (!m) return null
    return { to: m[1], amount: Number(m[2]) }
  }

  async function handleInputSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!text) return
    const parsed = parseTipCommand(text)
    if (parsed) {
      // if we already have suggestion and user typed exactly that amount, trigger
      onRequestTip({
        from: me.id,
        to: parsed.to,
        amount: parsed.amount,
        message: '',
        timestamp: Date.now()
      })
      setText('')
      setSuggestion(null)
      return
    }
    // otherwise simulate AI suggestion (mock)
    // extract mention maybe
    const atmatch = text.match(/@?(\w+)/)
    const to = atmatch ? atmatch[1] : 'alice'
    // suggest amount based on simple heuristic
    const suggestedAmount = Math.max(1, Math.floor(Math.random() * 10))
    setSuggestion({ amount: suggestedAmount, text: `Suggested: ${suggestedAmount} VERY — "Nice thread!"` })
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          VeryChat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleInputSubmit} className="space-y-3">
          <Input
            value={text}
            onChange={e=> setText(e.target.value)}
            placeholder="Type /tip @username <amount> or mention someone..."
            className="w-full"
          />
          <div className="flex gap-2">
            <Button className="flex-1" type="submit">
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // quick sample
                setText(`/tip @alice 5`)
              }}
            >
              Quick /tip @alice 5
            </Button>
          </div>
        </form>

        {suggestion && (
          <div className="p-3 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800 flex justify-between items-center">
            <div className="text-sm">{suggestion.text}</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  // accept suggestion
                  onRequestTip({
                    from: me.id,
                    to: 'alice',
                    amount: suggestion.amount,
                    message: suggestion.text.replace(/^Suggested: \d+ VERY — /, ''),
                    timestamp: Date.now()
                  })
                  setSuggestion(null)
                  setText('')
                }}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSuggestion(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

