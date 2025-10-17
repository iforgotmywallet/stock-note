"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs"
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react"

interface InvestmentDebateProps {
  bullAnalysis: string
  bearAnalysis: string
  judgeDecision: string
  className?: string
}

export function InvestmentDebate({ bullAnalysis, bearAnalysis, judgeDecision, className }: InvestmentDebateProps) {
  const [activeDebateTab, setActiveDebateTab] = React.useState("bull")

  const formatAnalysis = (text: string) => {
    // Split into paragraphs and format
    const paragraphs = text.split('\n\n').filter(p => p.trim())
    
    return paragraphs.map((paragraph, index) => {
      // Handle headers
      if (paragraph.startsWith('###')) {
        return (
          <h3 key={index} className="text-lg font-semibold mt-4 mb-2">
            {paragraph.replace(/^###\s*/, '')}
          </h3>
        )
      }
      
      return (
        <p key={index} className="text-sm mb-3 leading-relaxed">
          {paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
        </p>
      )
    })
  }

  return (
    <div className={className}>
      <Tabs value={activeDebateTab} onValueChange={setActiveDebateTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bull" className="flex items-center gap-2">
            <IconTrendingUp className="size-4 text-green-500" />
            Bull Case
          </TabsTrigger>
          <TabsTrigger value="bear" className="flex items-center gap-2">
            <IconTrendingDown className="size-4 text-red-500" />
            Bear Case
          </TabsTrigger>
          <TabsTrigger value="judge" className="flex items-center gap-2">
            <IconMinus className="size-4 text-blue-500" />
            Final Decision
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bull" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <IconTrendingUp className="size-5" />
                Bull Analysis
              </CardTitle>
              <CardDescription>
                Optimistic perspective on PayPal's investment potential
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {formatAnalysis(bullAnalysis)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bear" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <IconTrendingDown className="size-5" />
                Bear Analysis
              </CardTitle>
              <CardDescription>
                Cautious perspective highlighting risks and challenges
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {formatAnalysis(bearAnalysis)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="judge" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <IconMinus className="size-5" />
                Judge Decision
              </CardTitle>
              <CardDescription>
                Final recommendation based on comprehensive analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {formatAnalysis(judgeDecision)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}