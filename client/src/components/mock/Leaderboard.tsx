/**
 * Leaderboard component displaying top tippers
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "@/types/mock";

type LeaderboardRow = {
  user: User;
  totalReceived: number;
};

type Props = {
  rows: LeaderboardRow[];
};

export default function Leaderboard({ rows }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.user.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Badge variant={i === 0 ? "default" : "secondary"} className="w-8 h-8 flex items-center justify-center">
                  {i + 1}
                </Badge>
                <div>
                  <div className="font-medium">{r.user.displayName}</div>
                  <div className="text-sm text-muted-foreground">@{r.user.handle}</div>
                </div>
              </div>
              <div className="font-semibold text-primary">
                {r.totalReceived} VERY
              </div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="text-center text-muted-foreground py-4">
              No tips yet. Be the first!
            </li>
          )}
        </ol>
      </CardContent>
    </Card>
  );
}

