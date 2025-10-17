"use client"

import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs"
import { IconShield, IconAlertTriangle, IconScale } from "@tabler/icons-react"

interface RiskAssessmentProps {
  riskyAnalysis: string
  safeAnalysis: string
  neutralAnalysis: string
  judgeDecision: string
  className?: string
}

export function RiskAssessment({ 
  riskyAnalysis, 
  safeAnalysis, 
  neutralAnalysis, 
  judgeDecision, 
  className 
}: RiskAssessmentProps) {
  const [activeRiskTab, setActiveRiskTab] = React.useState("risky")

  const formatAnalysis = (text: string) => {
    const paragraphs = text.split('\n\n').filter(p => p.trim())
    
    return paragraphs.map((paragraph, index) => {
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
      <Tabs value={activeRiskTab} onValueChange={setActiveRiskTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="risky" className="flex items-center gap-2">
            <IconAlertTriangle className="size-4 text-orange-500" />
            High Risk
          </TabsTrigger>
          <TabsTrigger value="safe" className="flex items-center gap-2">
            <IconShield className="size-4 text-green-500" />
            Safe
          </TabsTrigger>
          <TabsTrigger value="neutral" className="flex items-center gap-2">
            <IconScale className="size-4 text-blue-500" />
            Neutral
          </TabsTrigger>
          <TabsTrigger value="decision" className="flex items-center gap-2">
            <IconScale className="size-4 text-purple-500" />
            Decision
          </TabsTrigger>
        </TabsList>

        <TabsContent value="risky" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <IconAlertTriangle className="size-5" />
                High-Risk Analysis
              </CardTitle>
              <CardDescription>
                Aggressive investment perspective emphasizing high-reward potential
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {formatAnalysis(riskyAnalysis)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safe" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <IconShield className="size-5" />
                Conservative Analysis
              </CardTitle>
              <CardDescription>
                Risk-averse perspective focusing on capital preservation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {formatAnalysis(safeAnalysis)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="neutral" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <IconScale className="size-5" />
                Balanced Analysis
              </CardTitle>
              <CardDescription>
                Moderate perspective balancing risk and reward
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {formatAnalysis(neutralAnalysis)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decision" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <IconScale className="size-5" />
                Final Risk Assessment
              </CardTitle>
              <CardDescription>
                Comprehensive risk evaluation and recommendation
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