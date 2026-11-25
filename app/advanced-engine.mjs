import {isNumber as num,dateStamp,timeStamp,recordKey,hasReturnPromise,safeRatio} from './math-utils.mjs';
export const REVIEW_VERSION = 'financial-review-3.0';
export function financialTrends(rows,asOf){
  if(!Array.isArray(rows)||rows.length>5000) throw Error('财务记录必须为数组，最多5000条');
  const cutoff=dateStamp(asOf); if(!Number.isFinite(cutoff)) throw Error('分析时点无效');
  const candidates=rows.filter(r=>r&&typeof r==='object'&&typeof r.code==='string'&&/^\d{4}-Q[1-4]$/.test(r.period??'')&&Number.isFinite(dateStamp(r.asOf))&&dateStamp(r.asOf)<=cutoff);
  const counts=new Map();for(const r of candidates)counts.set(recordKey(r),(counts.get(recordKey(r))??0)+1);
  // Ambiguous revisions are never silently resolved with the first row.
  const available=candidates.filter(r=>counts.get(recordKey(r))===1);
  return candidates.map(r=>{
    const match=/^(\d{4})-(Q[1-4])$/.exec(r.period);
    const comparable=!!(r.currency&&r.unit&&r.basis)&&counts.get(recordKey(r))===1;
    const previous=comparable?available.find(p=>p.code===r.code&&p.period===`${Number(match[1])-1}-${match[2]}`&&p.currency===r.currency&&p.unit===r.unit&&p.basis===r.basis):null;
    const yoy=f=>previous&&num(r[f])&&num(previous[f])&&previous[f]>0?safeRatio(r[f]-previous[f],previous[f]):null;
    const peers=available.filter(p=>comparable&&p.code!==r.code&&r.industry&&p.industry===r.industry&&p.period===r.period&&p.currency===r.currency&&p.unit===r.unit&&p.basis===r.basis&&num(p.netProfit)&&num(p.revenue)&&p.revenue>0).map(p=>p.netProfit/p.revenue).filter(Number.isFinite).sort((a,b)=>a-b);
    const median=peers.length>=3?(peers[Math.floor((peers.length-1)/2)]+peers[Math.ceil((peers.length-1)/2)])/2:null;
    const profit=yoy('netProfit'),cash=yoy('operatingCash');
    const warnings=[];
    if(counts.get(recordKey(r))>1)warnings.push('存在重复版本，暂停同比与同业比较');
    if(!previous)warnings.push('缺少口径一致的上年同期记录');
    else if(['revenue','netProfit','operatingCash'].some(f=>!num(previous[f])||previous[f]<=0))warnings.push('部分同比基期非正或缺失，不计算常规增长率');
    if(profit!==null&&cash!==null&&profit>0&&cash<0)warnings.push('利润增长而经营现金流下降，需核验应收、存货及非经常损益');
    return {code:r.code,period:r.period,revenueYoY:yoy('revenue'),profitYoY:profit,cashYoY:cash,peerMarginMedian:median,peerCount:peers.length,warning:warnings.join('；'),evidence:{asOf:r.asOf,source:typeof r.source==='string'?r.source:'未提供来源',basis:typeof r.basis==='string'?r.basis:'未提供统计口径'}};
  });
}
export function resolveRecord(rows,index,replacement,reason,asOf,validate){
  if(!reason.trim())throw Error('必须填写处理原因');
  if(!Array.isArray(rows)||!Number.isInteger(index)||index<0||index>=rows.length)throw Error('记录不存在');
  if(!replacement||typeof replacement!=='object'||Array.isArray(replacement))throw Error('修正值必须为对象');
  const updated=rows.map((r,i)=>i===index?replacement:r), checks=validate(updated,asOf);
  const blocking=checks[index].dataIssues??checks[index].issues;
  if(blocking.length)throw Error(`修正后财务数据仍有问题：${blocking.join('；')}`);
  return {rows:updated,audit:{recordIndex:index,before:rows[index],after:replacement,reason,remainingScoreIssues:checks[index].scoreIssues??[],at:new Date().toISOString(),ruleVersion:REVIEW_VERSION}};
}
export function validateReview(review,answer,evidence){
  const issues=[];
  if(!answer.trim()||!evidence.trim())issues.push('回答与证据不能为空');
  if(!review.reviewer?.trim())issues.push('请填写审核人');
  if(!review.claims?.length)issues.push('至少添加一条验收答案断言并绑定证据');
  for(const c of review.claims??[]){
    if(!c.claim?.trim()||!c.source?.trim()||!c.quote?.trim()||c.result!=='supported')issues.push('每条断言必须有来源、证据摘录并确认支持');
    if(c.quote?.trim()&&!evidence.includes(c.quote.trim()))issues.push('证据摘录须能在原始证据文本中找到');
    if(c.claim?.trim()&&!review.corrected?.includes(c.claim.trim()))issues.push('断言须对应修改后的验收答案原文');
  }
  for(const key of ['factuality','calculation','reasoning','risk'])if(review.dimensions?.[key]!=='pass')issues.push('四个评价维度均需人工确认通过');
  if(!review.corrected?.trim())issues.push('需填写验收答案');
  if(hasReturnPromise(review.corrected??''))issues.push('验收答案含收益保证，请修订');
  if(!/风险|不确定|可能|亏损/.test(review.corrected??''))issues.push('验收答案缺少风险提示');
  return [...new Set(issues)];
}
export function makeReviewSample(review,answer,evidence){
  if(!['pending','returned','approved'].includes(review.status))throw Error('审核状态无效');
  const issues=validateReview(review,answer,evidence);
  if(review.status==='approved'&&issues.length)throw Error(issues.join('；'));
  return {input:answer,evidence,review,issues,version:REVIEW_VERSION,accepted:review.status==='approved'&&!issues.length,exportedAt:new Date().toISOString()};
}
const dates=[];for(let i=0;dates.length<65;i++){const d=new Date(Date.UTC(2026,0,5+i));if(![0,6].includes(d.getUTCDay()))dates.push(d.toISOString().slice(0,10));}
export const demoHistory=dates.map((date,i)=>({date,signalAsOf:new Date(dateStamp(date)-86400000).toISOString().slice(0,10),score:45+(i*13)%55,assetReturn:Math.sin(i*1.7)*.015+.0005,benchmarkReturn:Math.cos(i*1.1)*.008+.0002}));
export function backtest(rows,{threshold=70,costBps=10,minSamples=30,periodsPerYear=252}={}){
  if(!Number.isInteger(minSamples)||minSamples<2)throw Error('最少样本参数须为不小于2的整数');
  if(!Array.isArray(rows)||rows.length<minSamples)throw Error(`样本不足，至少${minSamples}期`);
  if(rows.length>10000)throw Error('最多10000期');
  if(!num(costBps)||costBps<0||costBps>1000||!num(threshold)||threshold<0||threshold>100||!Number.isInteger(periodsPerYear)||periodsPerYear<2||periodsPerYear>366)throw Error('成本、阈值或年化周期超出范围');
  const codes=new Set(rows.map(r=>r?.code).filter(Boolean)),benchmarks=new Set(rows.map(r=>r?.benchmarkCode).filter(Boolean));
  if(codes.size>1||benchmarks.size>1)throw Error('一次校准只支持单标的及单一基准，不可混合多只股票');
  let equity=1,benchmark=1,peak=1,drawdown=0,held=0,wins=0,active=0,cost=0,costAmount=0,last=-Infinity,maxGap=0;
  const returns=[],curve=[],warnings=[];
  for(const r of rows){
    const stamp=dateStamp(r?.date),signal=timeStamp(r?.signalAsOf);
    if(!Number.isFinite(stamp)||stamp<=last)throw Error('日期须有效、唯一且升序');
    if(!Number.isFinite(signal)||signal>=stamp)throw Error('信号必须在收益发生前可得');
    if(Number.isFinite(last))maxGap=Math.max(maxGap,(stamp-last)/86400000);last=stamp;
    if(r.tradeStatus&&!['交易','正常交易','交易中','normal','trading'].includes(r.tradeStatus))throw Error('包含停牌或不可成交记录；当前引擎不模拟不可成交，请先核验执行条件');
    if(!num(r.score)||r.score<0||r.score>100||!num(r.assetReturn)||!num(r.benchmarkReturn)||r.assetReturn<=-1||r.benchmarkReturn<=-1||r.assetReturn>1||r.benchmarkReturn>1)throw Error('收益需为(-1,1]内小数，分数需为0至100');
    const position=r.score>=threshold?1:0,fee=Math.abs(position-held)*costBps/10000;
    costAmount+=equity*fee;cost+=fee;
    // Trade at the start of the period: apply the proportional fee BEFORE return.
    const net=(1-fee)*(1+position*r.assetReturn)-1;
    held=position;if(position){active++;if(net>0)wins++;}
    equity*=1+net;benchmark*=1+r.benchmarkReturn;if(!Number.isFinite(equity)||!Number.isFinite(benchmark)||equity<=0||benchmark<=0)throw Error('净值超出可计算范围，请检查收益单位或样本范围');peak=Math.max(peak,equity);drawdown=Math.min(drawdown,equity/peak-1);
    returns.push(net);curve.push({date:r.date,equity,benchmark,position,net,fee});
  }
  if(held){
    const fee=costBps/10000;costAmount+=equity*fee;equity*=1-fee;cost+=fee;
    const end=curve[curve.length-1],wasWin=end.net>0;end.net=(1+end.net)*(1-fee)-1;end.equity=equity;end.exitFee=fee;
    if(wasWin&&end.net<=0)wins--;returns[returns.length-1]=end.net;drawdown=Math.min(drawdown,equity/peak-1);
  }
  const avg=returns.reduce((a,b)=>a+b,0)/returns.length,variance=returns.reduce((s,r)=>s+(r-avg)**2,0)/(returns.length-1),vol=Math.sqrt(variance);
  const sorted=[...returns].sort((a,b)=>a-b),quantile=sorted[Math.max(0,Math.ceil(.05*sorted.length)-1)];
  if(rows.length<252)warnings.push('不足252期，年化和尾部风险估计仅作小样本诊断');
  if(maxGap>7)warnings.push('收益日期间隔较大，请确认每期均为连续交易期，年化频率未自动推断');
  return {samples:rows.length,active,hitRate:active?wins/active:null,totalReturn:equity-1,benchmarkReturn:benchmark-1,excessReturn:equity-benchmark,relativeExcess:equity/benchmark-1,maxDrawdown:drawdown,annualizedVol:vol*Math.sqrt(periodsPerYear),sharpe:vol>1e-12?avg/vol*Math.sqrt(periodsPerYear):null,historicalVaR95:Math.max(0,-quantile),transactionCostSum:cost,transactionCostAmount:costAmount,periodsPerYear,warnings,curve,assumptions:`每年${periodsPerYear}期；期初依据信号持有单标的或现金，按持仓变化先扣比例成本，再计本期收益，末期平仓。基准为不扣费买入持有。零现金收益、无风险利率为0；日终净值计算回撤，5%最近秩分位计算历史VaR。不是滚动训练或因果验证。`};
}
