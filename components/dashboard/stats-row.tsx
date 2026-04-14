"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type DashboardStat = {
  label: string;
  value: string | number;
  helper?: string;
};

export function StatsRow({ stats }: { stats: DashboardStat[] }) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="space-y-1 p-4">
            <CardDescription className="text-[11px] font-medium uppercase tracking-[0.12em]">
              {stat.label}
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
            {stat.helper ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{stat.helper}</p>
            ) : null}
          </CardHeader>
        </Card>
      ))}
    </section>
  );
}
