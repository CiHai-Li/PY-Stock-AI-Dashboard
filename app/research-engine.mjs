import {isNumber, dateStamp, timeStamp, recordKey, hasReturnPromise, safeRatio} from './math-utils.mjs';
export const RULE_VERSION = 'financial-quality-2.0';
export const demoRows = [
  {code:'DEMO-A', name:'示例消费企业', period:'2026-Q2', revenue:120, netProfit:24, operatingCash:30, assets:300, liabilities:100, pe:22, return20d:.08, eventScore:65, asOf:'2026-08-12'},
  {code:'DEMO-B', name:'示例制造企业', period:'2026-Q2', revenue:90, netProfit:12, operatingCash:8, assets:200, liabilities:130, pe:38, return20d:-.04, eventScore:40, asOf:'2026-08-12'},
  {code:'DEMO-C', name:'待核验示例', period:'2026-Q2', revenue:0, netProfit:-3, operatingCash:-5, assets:100, liabilities:120, pe:null, return20d:.02, eventScore:50, asOf:'2026-08-12'}
].map(row=>({...row,currency:'CNY',unit:'亿元',basis:'半年累计',source:'虚构演示数据'}));
const financialFields = ['revenue','netProfit','operatingCash','assets','liabilities'];
const scoringFields = ['pe','return20d','eventScore'];
const fields = [...financialFields,...scoringFields];
const clamp = x => Math.max(0, Math.min(100, x));
export function analyze(rows, asOf, weights = [36,28,16,20]) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 5000) throw Error('请输入1至5000条记录');
  const cutoff = dateStamp(asOf);
  if (!Number.isFinite(cutoff)) throw Error('分析时点必须为有效的YYYY-MM-DD日期');
  if (!Array.isArray(weights) || weights.length!==4 || weights.some(w=>!isNumber(w)||w<0||w>100) || weights.reduce((a,b)=>a+b,0)<=0) throw Error('四项权重须在0至100之间，且总和大于0');
  const counts = new Map();
  for (const row of rows) {
    if (!row || typeof row!=='object' || Array.isArray(row)) throw Error('每条记录必须为数据对象');
    const key=recordKey(row); counts.set(key,(counts.get(key)??0)+1);
  }
  return rows.map((row,index)=>{
    const dataIssues=[], scoreIssues=[], warnings=[];
    const valid = f=>isNumber(row[f]);
    if (typeof row.code!=='string'||!row.code.trim()||!/^\d{4}-Q[1-4]$/.test(row.period??'')) dataIssues.push('缺失证券代码或报告期格式错误');
    if (counts.get(recordKey(row))>1) dataIssues.push('证券、报告期及口径重复，请明确版本');
    const missing=financialFields.filter(f=>!valid(f));
    if(missing.length) dataIssues.push(`缺失或无效财务字段：${missing.join(', ')}`);
    const missingScore=scoringFields.filter(f=>!valid(f));
    if(missingScore.length) scoreIssues.push(`缺失或无效评分字段：${missingScore.join(', ')}`);
    if(['currency','unit','basis'].some(f=>typeof row[f]!=='string'||!row[f].trim())) dataIssues.push('需明确币种、金额单位及统计口径');
    const stamp=dateStamp(row.asOf);
    if(!Number.isFinite(stamp)) dataIssues.push('数据可获得日期无效');
    else if(stamp>cutoff) dataIssues.push('数据晚于分析时点，存在未来信息');
    else if((cutoff-stamp)/86400000>120) warnings.push('数据快照超过120天，评分前请复核更新');
    if(row.publicationDate!=null){
      const pub=timeStamp(row.publicationDate);
      if(!Number.isFinite(pub)||pub>cutoff+86399999||(Number.isFinite(stamp)&&pub>stamp+86399999)) dataIssues.push('披露日期无效或晚于可获得日期');
    } else warnings.push('未提供披露日期，不用于历史点时信号验证');
    if(valid('assets')&&row.assets<=0) dataIssues.push('资产必须大于0');
    if(valid('liabilities')&&(row.liabilities<0||(valid('assets')&&row.liabilities>row.assets))) dataIssues.push('负债口径或资不抵债需复核');
    if(valid('equity')&&valid('assets')&&valid('liabilities')){
      const tolerance=row.unit==='亿元'?.0002:row.unit==='万元'?2:row.unit==='元'?20000:null;
      if(tolerance!==null&&Math.abs(row.assets-row.liabilities-row.equity)>tolerance) dataIssues.push('资产、负债与权益不平衡，请核验口径与舍入');
    }
    if(valid('revenue')&&row.revenue<=0) dataIssues.push('营收非正，利润率不可用');
    if(valid('pe')&&row.pe<=0) scoreIssues.push('PE非正，不适用常规估值比较');
    if(valid('eventScore')&&(row.eventScore<0||row.eventScore>100)) scoreIssues.push('事件评分超出0至100');
    if(valid('return20d')&&(row.return20d<=-1||row.return20d>1)) scoreIssues.push('20日收益超出(-1,1]，请复核单位与极端值');
    const margin=valid('netProfit')&&valid('revenue')&&row.revenue>0?safeRatio(row.netProfit,row.revenue):null;
    const cash=valid('operatingCash')&&valid('netProfit')&&row.netProfit>0?safeRatio(row.operatingCash,row.netProfit):null;
    const leverage=valid('liabilities')&&valid('assets')&&row.assets>0?safeRatio(row.liabilities,row.assets):null;
    if(valid('netProfit')&&row.netProfit<=0) warnings.push('净利润非正，现金利润比不适用；评分中的现金覆盖贡献设为0');
    if(valid('revenue')&&row.revenue>0&&valid('netProfit')&&margin===null)dataIssues.push('净利率计算超出数值范围');
    if(valid('netProfit')&&row.netProfit>0&&valid('operatingCash')&&cash===null)dataIssues.push('现金利润比计算超出数值范围');
    const issues=[...dataIssues,...scoreIssues];
    const factors=issues.length?null:[clamp(margin*200+(cash===null?0:cash*30)),clamp(50+row.return20d*200),row.eventScore,clamp(100-leverage*70-Math.max(0,row.pe-20))];
    const total=weights.reduce((a,b)=>a+b,0);
    const score=factors?Math.round(factors.reduce((s,f,i)=>s+f*weights[i]/total,0)):null;
    return {index,code:row.code??`row-${index+1}`,name:typeof row.name==='string'?row.name:'',period:typeof row.period==='string'?row.period:'未提供',dataIssues,scoreIssues,issues,warnings,financialReady:!dataIssues.length,completeness:Math.round(fields.filter(valid).length/fields.length*100),margin,cash,leverage,factors,score,status:score!==null?'可计算':dataIssues.length?'待复核':'待补评分字段',evidence:{source:typeof row.source==='string'?row.source:'未提供来源',asOf:typeof row.asOf==='string'?row.asOf:'无效日期',publicationDate:typeof row.publicationDate==='string'?row.publicationDate:null,currency:typeof row.currency==='string'?row.currency:null,unit:typeof row.unit==='string'?row.unit:null,basis:typeof row.basis==='string'?row.basis:null,analysisDate:asOf,ruleVersion:RULE_VERSION}};
  });
}
export function evaluateAnswer(answer,evidence) {
  const flags=[];
  if(!answer.trim()) flags.push('回答为空');
  if(hasReturnPromise(answer)) flags.push('存在收益保证或确定性承诺');
  if(!/风险|不确定|可能|亏损/.test(answer)) flags.push('缺少风险或不确定性说明');
  if(!evidence.trim()) flags.push('缺少证据，事实准确性不可判定');
  return {flags,verdict:flags.length?'待人工复核':'规则初筛通过，仍需专家核验',factuality:'需人工逐项对照来源',ruleVersion:RULE_VERSION};
}
