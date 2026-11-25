export const RULE_VERSION = 'financial-quality-1.0';
export const demoRows = [
 {code:'DEMO-A',period:'2026-Q2',revenue:120,netProfit:24,operatingCash:30,assets:300,liabilities:100,pe:22,return20d:0.08,eventScore:65,asOf:'2026-08-12'},
 {code:'DEMO-B',period:'2026-Q2',revenue:90,netProfit:12,operatingCash:8,assets:200,liabilities:130,pe:38,return20d:-0.04,eventScore:40,asOf:'2026-08-12'},
 {code:'DEMO-C',period:'2026-Q2',revenue:0,netProfit:-3,operatingCash:-5,assets:100,liabilities:120,pe:null,return20d:0.02,eventScore:50,asOf:'2026-08-12'}
];
const fields=['revenue','netProfit','operatingCash','assets','liabilities','pe','return20d','eventScore'];
const clamp=x=>Math.max(0,Math.min(100,x));
export function analyze(rows, asOf, weights=[36,28,16,20]) {
 if(!Array.isArray(rows)||rows.length===0||rows.length>5000) throw Error('请输入1至5000条记录');
 if(!Number.isFinite(Date.parse(asOf))) throw Error('分析时点无效');
 if(weights.length!==4||weights.some(w=>!Number.isFinite(w)||w<0)||weights.reduce((a,b)=>a+b,0)<=0) throw Error('权重必须非负且总和大于0');
 const seen=new Set();
 return rows.map((row,index)=>{
  if(!row||typeof row!=='object'||Array.isArray(row)) throw Error(`第${index+1}条不是数据对象`);
  const issues=[]; const key=`${row.code}|${row.period}`;
  if(!row.code||!row.period) issues.push('缺失证券代码或报告期');
  if(seen.has(key)) issues.push('证券与报告期重复'); seen.add(key);
  const valid=f=>typeof row[f]==='number'&&Number.isFinite(row[f]);
  const missing=fields.filter(f=>!valid(f));
  if(missing.length) issues.push(`缺失或无效字段：${missing.join(', ')}`);
  const stamp=Date.parse(row.asOf); const age=(Date.parse(asOf)-stamp)/86400000;
  if(!Number.isFinite(stamp)) issues.push('数据日期无效');
  else if(age<0) issues.push('数据晚于分析时点，存在未来信息');
  else if(age>120) issues.push('数据超过120天，请复核更新');
  if(valid('assets')&&row.assets<=0) issues.push('资产必须大于0');
  if(valid('liabilities')&&(row.liabilities<0||row.liabilities>row.assets)) issues.push('负债口径或资不抵债需复核');
  if(valid('revenue')&&row.revenue<=0) issues.push('营收非正，利润率不可用');
  if(valid('pe')&&row.pe<=0) issues.push('PE非正，不适用常规估值比较');
  if(valid('eventScore')&&(row.eventScore<0||row.eventScore>100)) issues.push('事件评分超出0至100');
  if(valid('return20d')&&Math.abs(row.return20d)>1) issues.push('20日收益异常，请检查小数与百分数单位');
  const margin=valid('netProfit')&&row.revenue>0?row.netProfit/row.revenue:null;
  const cash=valid('operatingCash')&&row.netProfit>0?row.operatingCash/row.netProfit:null;
  const leverage=valid('liabilities')&&row.assets>0?row.liabilities/row.assets:null;
  const factors=issues.length?null:[clamp((margin??0)*200+(cash??0)*30),clamp(50+row.return20d*200),row.eventScore,clamp(100-leverage*70-Math.max(0,row.pe-20))];
  const total=weights.reduce((a,b)=>a+b,0);
  const score=factors?Math.round(factors.reduce((sum,f,i)=>sum+f*weights[i]/total,0)):null;
  return {code:row.code??`row-${index+1}`,period:row.period,issues,completeness:Math.round((fields.length-missing.length)/fields.length*100),margin,cash,leverage,factors,score,status:issues.length?'待复核':'可计算',evidence:{source:row.source??'用户导入 / 演示样本',asOf:row.asOf,analysisDate:asOf,ruleVersion:RULE_VERSION}};
 });
}
export function evaluateAnswer(answer,evidence) {
 const flags=[];
 if(!answer.trim()) flags.push('回答为空');
 if(/保证收益|稳赚|保本保收益|必涨/.test(answer)) flags.push('存在收益保证或确定性承诺');
 if(!/风险|不确定|可能|亏损/.test(answer)) flags.push('缺少风险或不确定性说明');
 if(!evidence.trim()) flags.push('缺少证据，事实准确性不可判定');
 return {flags,verdict:flags.length?'待人工复核':'规则初筛通过，仍需专家核验',factuality:'需人工逐项对照来源',ruleVersion:RULE_VERSION};
}
