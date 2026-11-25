'use client';
import {useMemo,useState} from 'react';
import AdvancedWorkshop from './advanced-workshop';
import {analyze,demoRows,evaluateAnswer,RULE_VERSION} from './research-engine.mjs';
export type WorkspaceSection='data'|'financial'|'calibration'|'review';
function download(value:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
const sections=[{id:'data' as const,icon:'▦',label:'数据质检',hint:'导入与问题处理'},{id:'financial' as const,icon:'◷',label:'财务分析',hint:'指标、因子与同业'},{id:'calibration' as const,icon:'⌁',label:'信号校准',hint:'历史收益与风险'},{id:'review' as const,icon:'✓',label:'解释与审核',hint:'证据核验与样本验收'}];
const fmt=(n:number|null,ratio=false)=>n===null?'—':ratio?`${(n*100).toFixed(2)}%`:n.toFixed(3);
export default function ResearchLab(){
 const [section,setSection]=useState<WorkspaceSection>('data');
 const [input,setInput]=useState(JSON.stringify(demoRows,null,2));
 const [dataset,setDataset]=useState('演示财务样本');
 const [asOf,setAsOf]=useState('2026-08-12');
 const [weights,setWeights]=useState([36,28,16,20]);
 const [message,setMessage]=useState('');
 const [onlyIssues,setOnlyIssues]=useState(false);
 const [answer,setAnswer]=useState('');
 const [evidence,setEvidence]=useState('');
 const result=useMemo(()=>{try{return {rows:analyze(JSON.parse(input),asOf,weights),error:''};}catch(e){return {rows:[],error:e instanceof Error?e.message:'数据格式错误'};}},[input,asOf,weights]);
 const evaluation=evaluateAnswer(answer,evidence);
 const financialReady=result.rows.filter(r=>r.financialReady).length;
 const scored=result.rows.filter(r=>r.score!==null).length;
 const current=sections.find(s=>s.id===section)!;
 const updateData=(value:string)=>{setInput(value);setMessage('');};
 return <main className="desk-shell">
  <aside className="desk-sidebar"><div className="desk-brand"><span>PY</span><div><strong>量化研究工作台</strong><small>RESEARCH WORKSPACE</small></div></div><p className="nav-caption">研究驾驶舱</p><nav aria-label="研究流程">{sections.map((s,i)=><button key={s.id} className={section===s.id?'selected':''} aria-current={section===s.id?'page':undefined} onClick={()=>setSection(s.id)}><span className="nav-icon">{s.icon}</span><span><b>{s.label}</b><small>{s.hint}</small></span><em>0{i+1}</em></button>)}</nav><div className="sidebar-note"><span>当前工作区</span><strong>{dataset}</strong><p>数据仅保存在当前页面。离开前可导出研究结果。</p></div><div className="desk-version">规则计算 · 证据解释 · 人工验收</div></aside>
  <section className="desk-main"><header className="desk-topbar"><span>股票研究 / <b>{current.label}</b></span><div><span className="local-badge">本地工作区</span><button className="secondary" disabled={!!result.error} onClick={()=>download({asOf,weights,ruleVersion:RULE_VERSION,results:result.rows},'research-analysis.json')}>导出分析</button></div></header>
   <div className="research-lab desk-content"><div className="page-heading"><div><span className="eyebrow">FINANCIAL RESEARCH</span><h1>{current.label}</h1><p>{section==='data'?'先确认数据可用，再进入分析。缺失、异常与待补字段分开处理。':section==='financial'?'从原始财务指标到分层比较，每项结果保留计算口径。':section==='calibration'?'用实际导入的历史信号与收益，检验风险和交易成本。':'让分析结论对应原始证据，再完成四维人工验收。'}</p></div><label className="date-control">分析时点<input type="date" aria-label="分析时点" value={asOf} onChange={e=>setAsOf(e.target.value)}/></label></div>
   {message&&<div hidden={section!=='data'} className="notice" role="status">{message}</div>}{result.error&&<div className="notice error" role="alert">{result.error}</div>}
   <div hidden={section!=='data'}>
    <div className="summary-strip"><div><span>导入记录</span><b>{result.rows.length}<small> 条</small></b></div><div><span>财务字段通过</span><b>{financialReady}<small> 条</small></b></div><div><span>可计算完整评分</span><b>{scored}<small> 条</small></b></div><div><span>财务待复核</span><b className={result.rows.length-financialReady?'amber':''}>{result.rows.length-financialReady}<small> 条</small></b></div></div>
    <article className="panel import-panel"><div><span className="section-kicker">DATA SOURCE</span><h2>导入研究数据</h2><p>JSON数组，最多5000条、2MB。保留原始缺失值，不自动补零。</p><strong className="dataset-label">{dataset}</strong></div><div className="import-actions"><label className="upload-control">选择 JSON 文件<input aria-label="导入JSON文件" type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>2_000_000)throw Error('文件超过2MB，当前数据未变更');const text=await file.text();const parsed=JSON.parse(text);if(!Array.isArray(parsed)||!parsed.length||parsed.length>5000||parsed.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw Error('需要1至5000条对象记录');setInput(JSON.stringify(parsed,null,2));setDataset(file.name);setMessage('文件已导入，请核对分析时点、单位和来源。');}catch(error){setMessage(error instanceof Error?error.message:'文件读取失败');}finally{e.target.value='';}}}/></label><button onClick={()=>download(demoRows,'research-template.json')}>下载字段示例</button></div></article>
    <details className="panel source-editor"><summary>查看或编辑原始 JSON</summary><textarea aria-label="研究数据JSON" value={input} onChange={e=>{setDataset('手动编辑数据');updateData(e.target.value);}} spellCheck={false}/><div className="button-row"><button onClick={()=>{setInput(JSON.stringify(demoRows,null,2));setDataset('演示财务样本');setAsOf('2026-08-12');}}>恢复演示样本（替换当前数据）</button></div></details>
    <article className="panel"><div className="panel-heading"><div><h2>记录与质量结果</h2><p>完整度仅统计8个数值字段，不代表数据可信概率。</p></div><label className="check-label"><input type="checkbox" checked={onlyIssues} onChange={e=>setOnlyIssues(e.target.checked)}/>仅看待处理</label></div><div className="table-scroll"><table><thead><tr>{['标的 / 报告期','财务口径','字段完整度','状态','问题与来源'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{result.rows.filter(r=>!onlyIssues||r.issues.length).map(r=><tr key={r.index}><td><strong>{r.name||r.code}</strong><small>{r.code} · {r.period}</small></td><td>{r.evidence.currency??'币种缺失'} / {r.evidence.unit??'单位缺失'}<small>{r.evidence.basis??'口径缺失'}</small></td><td>{r.completeness}%</td><td><span className={`status-pill ${r.financialReady?'neutral':'warn'}`}>{r.status}</span></td><td><span>{r.issues.join('；')||'字段检查通过'}</span><details className="row-evidence"><summary>来源与提示</summary><p>{r.evidence.source}</p><p>可获得日期：{r.evidence.asOf}；披露日期：{r.evidence.publicationDate??'未提供'}</p>{r.warnings.map(x=><p key={x}>{x}</p>)}</details></td></tr>)}</tbody></table>{!result.rows.length&&<p className="empty-state">导入数据后显示质检结果。</p>}</div></article>
   </div>
   <div hidden={section!=='financial'}>
    <article className="panel"><div className="panel-heading"><div><h2>财务指标与因子评分</h2><p>现金利润比仅适用于正净利润。缺少行情或事件字段时，仍可查看已具备条件的财务比率。</p></div><span className="muted-badge">{RULE_VERSION}</span></div><div className="table-scroll"><table><thead><tr>{['标的 / 报告期','净利率','现金利润比','负债率','完整评分'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{result.rows.map(r=><tr key={r.index}><td><strong>{r.name||r.code}</strong><small>{r.code} · {r.period}</small></td><td>{fmt(r.margin,true)}</td><td>{fmt(r.cash)}</td><td>{fmt(r.leverage,true)}</td><td>{r.score??'待补字段'}{r.dataIssues.length>0&&<small className="amber">财务数据需复核</small>}</td></tr>)}</tbody></table></div><details className="factor-settings"><summary>因子权重与计算规则</summary><div className="weight-grid">{['质量','趋势','事件','风险保护'].map((label,i)=><label key={label}>{label}<b>{weights[i]}</b><input aria-label={`${label}权重`} type="range" min="0" max="100" value={weights[i]} onChange={e=>setWeights(weights.map((v,j)=>i===j?Number(e.target.value):v))}/></label>)}</div><p>四项权重按总和归一化。质量=净利率×200+现金利润比×30；趋势=50+20日收益×200；风险保护=100−负债率×70−max(0,PE−20)。因子限制在0–100；亏损时现金覆盖贡献为0。这是未经预测能力验证的启发式规则。</p></details></article>
   </div>
   <div hidden={section!=='review'}><div className="review-intro-grid"><article className="panel"><h2>待评估回答</h2><p>手动粘贴或由模型基于证据生成。</p><textarea aria-label="待评估回答" value={answer} onChange={e=>setAnswer(e.target.value)}/></article><article className="panel"><h2>原始证据与来源</h2><p>保留原文、来源与定位，审核时逐条引用。</p><textarea aria-label="原始证据与来源" value={evidence} onChange={e=>setEvidence(e.target.value)}/></article></div><div className={`notice ${evaluation.flags.length?'warning':''}`}><strong>{evaluation.verdict}</strong>{evaluation.flags.map(x=><span key={x}> · {x}</span>)}</div></div>
   <AdvancedWorkshop section={section} onDatasetChange={setDataset} input={input} setInput={updateData} asOf={asOf} weights={weights} answer={answer} setAnswer={setAnswer} evidence={evidence} setEvidence={setEvidence}/>
   <footer className="workspace-footer">确定性规则负责计算，模型负责解释。导入数据与审核内容保存在页面内存，刷新前请导出。</footer>
   </div>
  </section>
 </main>;
}
