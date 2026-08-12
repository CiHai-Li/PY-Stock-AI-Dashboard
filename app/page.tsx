"use client";

import { useMemo, useState } from "react";

type Stock = {
  code: string; name: string; market: string; price: number; change: number;
  quality: number; trend: number; event: number; risk: number; confidence: number;
  action: "关注" | "观察" | "回避"; evidence: string[];
};

const stocks: Stock[] = [
  { code: "600519", name: "贵州茅台", market: "A股", price: 1458.2, change: 1.26, quality: 86, trend: 72, event: 65, risk: 18, confidence: 84, action: "关注", evidence: ["近三期经营现金流保持正值", "20日均线重新上穿60日均线", "数据完整度 96%，无降级数据源"] },
  { code: "00700", name: "腾讯控股", market: "港股", price: 612.5, change: -0.41, quality: 82, trend: 68, event: 76, risk: 24, confidence: 80, action: "关注", evidence: ["盈利质量处于行业前25%", "新闻事件已合并为3个独立主题", "港股行情更新于16:08"] },
  { code: "300750", name: "宁德时代", market: "A股", price: 312.8, change: 2.08, quality: 78, trend: 74, event: 58, risk: 36, confidence: 73, action: "观察", evidence: ["趋势信号较强但波动率升高", "行业价格竞争仍是主要风险", "建议等待回撤后的风险收益改善"] },
  { code: "AAPL", name: "Apple", market: "美股", price: 231.9, change: -1.12, quality: 88, trend: 52, event: 61, risk: 31, confidence: 76, action: "观察", evidence: ["基本面质量稳定", "短期趋势尚未转强", "美元利率变化可能压制估值"] },
  { code: "601012", name: "隆基绿能", market: "A股", price: 17.42, change: -2.31, quality: 49, trend: 38, event: 44, risk: 72, confidence: 78, action: "回避", evidence: ["盈利质量低于行业中位数", "价格仍处于下降趋势", "供给压力与库存风险尚未解除"] },
];

const score = (stock: Stock) => Math.round(stock.quality * .36 + stock.trend * .28 + stock.event * .16 + (100 - stock.risk) * .2);

function MiniTrend({ down = false }: { down?: boolean }) {
  const points = down ? "0,9 18,7 35,12 52,10 70,18 88,16 106,25" : "0,24 18,20 35,22 52,13 70,16 88,8 106,5";
  return <svg viewBox="0 0 106 30" aria-hidden="true"><polyline points={points} fill="none" stroke={down ? "#f06c72" : "#34b683"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Home() {
  const [selectedCode, setSelectedCode] = useState("600519");
  const [tab, setTab] = useState<"research" | "calibration" | "portfolio">("research");
  const selected = stocks.find((stock) => stock.code === selectedCode) ?? stocks[0];
  const sorted = useMemo(() => [...stocks].sort((a, b) => score(b) - score(a)), []);
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span>PY</span><div><b>PY股票AI操作盘</b><small>STOCK AI DESK</small></div></div>
      <nav aria-label="主导航">
        <button className={tab === "research" ? "active" : ""} onClick={() => setTab("research")}><span>⌂</span>研究驾驶舱</button>
        <button className={tab === "calibration" ? "active" : ""} onClick={() => setTab("calibration")}><span>◎</span>信号校准</button>
        <button className={tab === "portfolio" ? "active" : ""} onClick={() => setTab("portfolio")}><span>◫</span>组合风险</button>
      </nav>
      <div className="principle"><span>设计原则</span><b>先给证据，再给结论</b><p>评分由确定性规则计算，AI 只负责解释。</p></div>
      <div className="version"><i /> 演示数据 · v1.0</div>
    </aside>
    <section className="workspace">
      <header><div><span>股票研究决策助手</span><b>数据截至 2026-08-12 16:10</b></div><div className="header-actions"><button>导出研究纪要</button><span>示</span></div></header>
      <div className="content">
        {tab === "research" && <>
          <section className="hero"><div><span className="eyebrow">今日研究摘要</span><h1>把 AI 的“判断”，变成可以核验的研究结论</h1><p>统一数据口径、确定性评分、来源证据和历史校准，让每个信号都能说明“为什么”。</p></div><div className="hero-score"><span>研究覆盖</span><b>5</b><small>只核心标的</small></div></section>
          <section className="kpis">
            <article><span>高质量信号</span><b>2</b><small className="good">↑ 置信度 ≥ 80%</small></article>
            <article><span>数据健康度</span><b>94<em>%</em></b><small>3 个数据源均正常</small></article>
            <article><span>近90日命中率</span><b>61.8<em>%</em></b><small className="good">相对基准 +7.3%</small></article>
            <article><span>组合风险</span><b className="medium">中低</b><small>行业集中度 26%</small></article>
          </section>
          <section className="main-grid">
            <article className="panel watchlist"><div className="panel-title"><div><h2>研究标的</h2><p>按可验证综合评分排序</p></div><span>5 只</span></div>
              <div className="stock-list">{sorted.map(stock => <button key={stock.code} className={selected.code === stock.code ? "selected" : ""} onClick={() => setSelectedCode(stock.code)}><span className={`market m-${stock.market}`}>{stock.market}</span><div className="stock-name"><b>{stock.name}</b><small>{stock.code}</small></div><div className="stock-price"><b>{stock.price}</b><small className={stock.change >= 0 ? "up" : "down"}>{stock.change >= 0 ? "+" : ""}{stock.change}%</small></div><MiniTrend down={stock.change < 0} /><strong>{score(stock)}</strong></button>)}</div>
            </article>
            <article className="panel decision"><div className="panel-title"><div><span className={`action a-${selected.action}`}>{selected.action}</span><h2>{selected.name} <small>{selected.code} · {selected.market}</small></h2></div><div className="big-score"><b>{score(selected)}</b><span>/ 100</span></div></div>
              <div className="conclusion"><span>可验证结论</span><h3>{selected.action === "关注" ? "基本面与趋势形成共振，可纳入候选池" : selected.action === "回避" ? "质量与趋势同时偏弱，暂不进入候选池" : "核心证据尚未形成一致，继续等待确认"}</h3><p>该结论由四项确定性因子计算，AI 不直接修改评分，仅将结构化证据转化为可读说明。</p></div>
              <div className="factor-grid">{[["质量", selected.quality], ["趋势", selected.trend], ["事件", selected.event], ["风险保护", 100-selected.risk]].map(([label,value]) => <div key={String(label)}><span>{label}</span><b>{value}</b><i><em style={{width: `${value}%`}} /></i></div>)}</div>
              <div className="evidence"><div className="evidence-head"><h3>证据链</h3><span>数据可信度 {selected.confidence}%</span></div>{selected.evidence.map((item,index)=><div key={item}><span>{index+1}</span><p>{item}</p><em>已核验</em></div>)}</div>
            </article>
          </section>
          <section className="bottom-grid"><article className="panel calibration-card"><div className="panel-title"><div><h2>历史信号校准</h2><p>评分不是感觉，而是可复盘的概率分层</p></div><button onClick={() => setTab("calibration")}>查看完整回测 →</button></div><div className="bars">{[["80–100",68,"+12.4%"],["60–79",57,"+5.1%"],["40–59",49,"-0.8%"],["0–39",36,"-9.3%"]].map(item=><div key={item[0]}><span>{item[0]}</span><i><em style={{width:`${item[1]}%`}} /></i><b>{item[1]}% 命中</b><small>{item[2]}</small></div>)}</div></article><article className="panel quality-card"><div className="panel-title"><div><h2>数据质量</h2><p>每个结论都显示数据边界</p></div><span className="healthy">健康</span></div>{[["行情数据","实时","100%"],["财务数据","2026 Q2","96%"],["新闻事件","近7日","88%"]].map(item=><div className="source" key={item[0]}><i /><b>{item[0]}</b><span>{item[1]}</span><em>{item[2]}</em></div>)}</article></section>
        </>}
        {tab === "calibration" && <Calibration />}
        {tab === "portfolio" && <Portfolio />}
      </div>
    </section>
  </main>;
}

function Calibration() {
  return <section className="subpage"><span className="eyebrow">模型验证</span><h1>信号校准中心</h1><p className="lead">用滚动窗口回测检查评分、命中率与收益是否一致，避免“高置信度”只是语言标签。</p><div className="calibration-grid"><article className="panel"><h2>90日滚动表现</h2><div className="chart-area"><div className="chart-line" /><div className="chart-baseline" /><span>策略累计收益 12.4%</span><small>沪深300同期 5.1%</small></div></article><article className="panel metrics"><h2>验证指标</h2>{[["年化收益","18.6%"],["最大回撤","-8.2%"],["夏普比率","1.34"],["换手成本","0.7%"]].map(item=><div key={item[0]}><span>{item[0]}</span><b>{item[1]}</b></div>)}</article></div><article className="panel methodology"><h2>校准方法</h2><div>{["严格按历史时点取数，避免未来数据泄漏","使用滚动训练/测试窗口，避免一次性回测过拟合","计入手续费、滑点与无法成交场景","按市场阶段拆分牛市、震荡与下跌表现"].map((x,i)=><p key={x}><span>{i+1}</span>{x}</p>)}</div></article></section>;
}

function Portfolio() {
  return <section className="subpage"><span className="eyebrow">组合视角</span><h1>组合风险工作台</h1><p className="lead">单股结论进入组合后，继续检查集中度、相关性与最大潜在损失。</p><section className="portfolio-kpis"><article><span>组合风险等级</span><b>中低</b></article><article><span>预估年化波动</span><b>16.2%</b></article><article><span>单日 95% VaR</span><b>-2.1%</b></article></section><div className="calibration-grid"><article className="panel allocation"><h2>行业配置</h2>{[["消费",26],["科技",24],["新能源",18],["金融",14],["现金",18]].map(item=><div key={item[0]}><span>{item[0]}</span><i><em style={{width:`${item[1]}%`}} /></i><b>{item[1]}%</b></div>)}</article><article className="panel risk-list"><h2>主要风险</h2><p><span>01</span><b>成长风格相关性偏高</b><small>腾讯、宁德时代在风险偏好下降时可能同步回撤。</small></p><p><span>02</span><b>新能源行业波动较大</b><small>建议将单一行业敞口控制在20%以内。</small></p><p><span>03</span><b>现金缓冲充足</b><small>18%现金可用于控制回撤并等待新信号。</small></p></article></div></section>;
}
