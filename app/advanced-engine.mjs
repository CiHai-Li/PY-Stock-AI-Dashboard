export const REVIEW_VERSION = 'financial-review-2.0';
const num=x=>typeof x==='number'&&Number.isFinite(x);
export function financialTrends(rows,asOf){
 if(!Array.isArray(rows)) throw Error('财务记录必须为数组');
 const available=rows.filter(r=>r&&Number.isFinite(Date.parse(r.asOf))&&Date.parse(r.asOf)<=Date.parse(asOf));
 return available.map(r=>{
 const match=/^(\d{4})-(Q[1-4])$/.exec(r.period??'');
 const comparable=r.currency&&r.unit&&r.basis;
 const previous=match&&comparable?available.find(p=>p.code===r.code&&p.period===`${Number(match[1])-1}-${match[2]}`&&p.currency===r.currency&&p.unit===r.unit&&p.basis===r.basis):null;
 const yoy=f=>previous&&num(r[f])&&num(previous[f])&&previous[f]>0?(r[f]-previous[f])/previous[f]:null;
 const peers=available.filter(p=>comparable&&p.code!==r.code&&p.industry&&p.industry===r.industry&&p.period===r.period&&p.currency===r.currency&&p.unit===r.unit&&p.basis===r.basis&&num(p.netProfit)&&num(p.revenue)&&p.revenue>0).map(p=>p.netProfit/p.revenue).sort((a,b)=>a-b);
 const median=peers.length>=3?(peers[Math.floor((peers.length-1)/2)]+peers[Math.ceil((peers.length-1)/2)])/2:null;
 const profit=yoy('netProfit'),cash=yoy('operatingCash');
 return {code:r.code,period:r.period,revenueYoY:yoy('revenue'),profitYoY:profit,cashYoY:cash,peerMarginMedian:median,peerCount:peers.length,warning:profit!==null&&cash!==null&&profit>0&&cash<0?'利润增长而经营现金流下降，需核验应收、存货及非经常损益':'',evidence:{asOf:r.asOf,source:r.source??'未提供来源',basis:r.basis??'未提供统计口径'}};
 });
}
export function resolveRecord(rows,index,replacement,reason,asOf,validate){
 if(!reason.trim())throw Error('必须填写处理原因');
 if(!Number.isInteger(index)||index<0||index>=rows.length)throw Error('记录不存在');
 if(!replacement||typeof replacement!=='object'||Array.isArray(replacement))throw Error('修正值必须为对象');
 const updated=rows.map((r,i)=>i===index?replacement:r);const checks=validate(updated,asOf);
 if(checks[index].issues.length)throw Error(`修正后仍有问题：${checks[index].issues.join('；')}`);
 return {rows:updated,audit:{recordIndex:index,before:rows[index],after:replacement,reason,at:new Date().toISOString(),ruleVersion:REVIEW_VERSION}};
}
export function validateReview(review,answer,evidence){
 const issues=[];
 if(!answer.trim()||!evidence.trim())issues.push('回答与证据不能为空');
 if(!review.reviewer?.trim())issues.push('请填写审核人');
 if(!review.claims?.length)issues.push('至少添加一条断言并绑定证据');
 for(const claim of review.claims??[])if(!claim.claim?.trim()||!claim.source?.trim()||!claim.quote?.trim()||claim.result!=='supported')issues.push('每条断言必须有来源、证据摘录并确认支持');
 for(const key of ['factuality','calculation','reasoning','risk'])if(review.dimensions?.[key]!=='pass')issues.push('四个评价维度均需人工确认通过');
 if(!review.corrected?.trim())issues.push('需填写验收答案');
 if(/保证收益|稳赚|保本保收益|必涨/.test(review.corrected??''))issues.push('验收答案含收益保证，请修订');
 if(!/风险|不确定|可能|亏损/.test(review.corrected??''))issues.push('验收答案缺少风险提示');
 return [...new Set(issues)];
}
export function makeReviewSample(review,answer,evidence){
 const issues=validateReview(review,answer,evidence);
 if(review.status==='approved'&&issues.length)throw Error(issues.join('；'));
 return {input:answer,evidence,review,issues,version:REVIEW_VERSION,accepted:review.status==='approved'&&!issues.length,exportedAt:new Date().toISOString()};
}
export const demoHistory=Array.from({length:65},(_,i)=>{const d=new Date(Date.UTC(2026,0,1+i));return {date:d.toISOString().slice(0,10),signalAsOf:new Date(d.getTime()-86400000).toISOString().slice(0,10),score:45+(i*13)%55,assetReturn:Math.sin(i*1.7)*.015+.0005,benchmarkReturn:Math.cos(i*1.1)*.008+.0002};});
export function backtest(rows,{threshold=70,costBps=10,minSamples=30}={}){
 if(!Array.isArray(rows)||rows.length<minSamples)throw Error(`样本不足，至少${minSamples}期`);
 if(rows.length>10000)throw Error('最多10000期');
 if(!num(costBps)||costBps<0||costBps>1000||!num(threshold)||threshold<0||threshold>100)throw Error('成本或阈值超出范围');
 let equity=1,benchmark=1,peak=1,drawdown=0,held=0,wins=0,active=0,cost=0;const returns=[],curve=[];let last='';
 for(const r of rows){
 if(!r||!/^\d{4}-\d{2}-\d{2}$/.test(r.date??'')||!Number.isFinite(Date.parse(r.date))||r.date<=last)throw Error('日期须有效、唯一且升序');
 if(!Number.isFinite(Date.parse(r.signalAsOf))||Date.parse(r.signalAsOf)>=Date.parse(r.date))throw Error('信号必须在收益发生前可得');
 if(!num(r.score)||r.score<0||r.score>100||!num(r.assetReturn)||!num(r.benchmarkReturn)||r.assetReturn<=-1||r.benchmarkReturn<=-1||r.assetReturn>1||r.benchmarkReturn>1)throw Error('收益需为(-1,1]内小数，分数需为0至100');
 last=r.date;const position=r.score>=threshold?1:0;const fee=Math.abs(position-held)*costBps/10000;const net=position*r.assetReturn-fee;if(net<=-1)throw Error('成本导致资金耗尽');cost+=fee;held=position;if(position){active++;if(net>0)wins++;}equity*=1+net;benchmark*=1+r.benchmarkReturn;peak=Math.max(peak,equity);drawdown=Math.min(drawdown,equity/peak-1);returns.push(net);curve.push({date:r.date,equity,benchmark,position,net});
 }
 // Liquidate at the end so transaction costs include closing an open position.
 if(held){const fee=costBps/10000;equity*=1-fee;cost+=fee;const end=curve[curve.length-1];const wasWin=end.net>0;end.net=(1+end.net)*(1-fee)-1;if(wasWin&&end.net<=0)wins--;end.equity=equity;returns[returns.length-1]=end.net;drawdown=Math.min(drawdown,equity/peak-1);}
 const avg=returns.reduce((a,b)=>a+b,0)/returns.length;const variance=returns.reduce((s,r)=>s+(r-avg)**2,0)/(returns.length-1);const vol=Math.sqrt(variance);const sorted=[...returns].sort((a,b)=>a-b);const quantile=sorted[Math.max(0,Math.ceil(.05*sorted.length)-1)];
 return {samples:rows.length,active,hitRate:active?wins/active:null,totalReturn:equity-1,benchmarkReturn:benchmark-1,excessReturn:equity-benchmark,maxDrawdown:drawdown,annualizedVol:vol*Math.sqrt(252),sharpe:vol?avg/vol*Math.sqrt(252):null,historicalVaR95:Math.max(0,-quantile),transactionCostSum:cost,curve,assumptions:'日频、收盘前已知信号、单标的多头或现金、零现金收益、夏普无风险利率为0；包含双边换仓成本。不是滚动训练或因果验证。'};
}
