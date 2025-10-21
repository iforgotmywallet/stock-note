export interface StockData {
  session_id: string;
  ticker: string;
  date: string;
  analysis: {
    market_report: string;
    sentiment_report: string;
    news_report: string;
    fundamentals_report: string;
    investment_debate: {
      bull_analysis: string;
      bear_analysis: string;
      judge_decision: string;
    };
    risk_assessment: {
      risky_analysis: string;
      safe_analysis: string;
      neutral_analysis: string;
      judge_decision: string;
    };
    trader_plan: string;
    final_recommendation: string;
    recommendation_type: 'BUY' | 'SELL' | 'HOLD' | 'BUY or HOLD' | 'SELL or HOLD';
  };
}