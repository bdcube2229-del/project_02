"use strict";
const apiURL=(path)=>new URL(path,globalThis.ExamConfig.apiBase).href;
function viewerURL(row){const api=new URL(row.questionPdfUrl||row.highlightUrl,globalThis.ExamConfig.apiBase);const local=new URL("./viewer.html",location.href);for(const key of ["id","q","mode"])local.searchParams.set(key,api.searchParams.get(key)||"");local.searchParams.set("type",row.questionPdfUrl?"question":"highlight");local.searchParams.set("page",row.questionPdfUrl?"1":api.hash.replace("#page=","")||String(row.page));local.searchParams.set("originalPage",String(row.page));local.searchParams.set("source",row.sourceId);local.searchParams.set("question",String(row.question));return local.href;}
const $=(id)=>document.getElementById(id);
const fields=["grade","subject","detail","year","month","kind","sort"];
let archive=null,activeRequest=null,requestNumber=0,lastResult=null,catalogDetails=[];
const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
const format=(value)=>Number(value).toLocaleString("ko-KR");
function state(){return {q:$("query").value.trim(),mode:document.querySelector('input[name="mode"]:checked').value,...Object.fromEntries(fields.map((id)=>[id,$(id).value]))};}
function options(id,values,empty){const select=$(id),previous=select.value;select.replaceChildren();const first=make("option","",empty);first.value="";select.append(first);for(const value of values){const option=make("option","",id==="year"?value+"년":id==="month"?value+"월":id==="grade"?"고"+value:value);option.value=String(value);select.append(option);}select.value=values.map(String).includes(previous)?previous:"";}
function updateDetails(){if(!archive)return;const subject=$("subject").value,grade=$("grade").value;const sources=archive.sources.filter((s)=>s.subject===subject&&(!grade||s.grade===Number(grade)));const details=subject?[...new Set(sources.map((s)=>s.detail))]:[];if((subject==="국어"||subject==="수학")&&sources.some((s)=>s.grade===3))details.unshift("공통");options("detail",details,"전체 세부 과목");$("detail").disabled=!subject;}
function setHeading(query,total){$("results-title").replaceChildren(document.createTextNode(query?"문항 검색 결과 ":"모의고사 자료실 "));if(total!==undefined)$("results-title").append(make("span","",format(total)));}
function showState(title,description,action){const card=make("div","state-card");card.append(make("div","state-symbol","⌕"),make("h3","",title),make("p","",description));if(action){const button=make("button","secondary",action.label);button.type="button";button.addEventListener("click",action.run);card.append(button);}$("results").replaceChildren(card);$("pagination").replaceChildren();}
function renderBrowse(values){
  const papers=globalThis.ExamCatalog.papers(archive.sources,values),groups=globalThis.ExamCatalog.groups(papers,values.sort);
  lastResult={type:"catalog",results:papers,total:papers.length,groupCount:groups.length,page:1,totalPages:1};catalogDetails=[];
  $("results-eyebrow").textContent="EXAM ARCHIVE";$("browse-return").hidden=true;setHeading("");
  $("reading-note").textContent="월별 항목을 펼쳐 과목별 문제지와 정답·해설을 열어보세요. 같은 PDF는 한 번씩만 표시합니다.";
  $("result-summary").textContent=groups.length?`${format(groups.length)}회 시험 · ${format(papers.length)}개 문제지` :"현재 조건에 맞는 문제지가 없습니다.";
  $("pagination").replaceChildren();$("results").setAttribute("aria-busy","false");$("print").disabled=!papers.length;
  if(!papers.length){showState("조건에 맞는 문제지가 없어요.","학년·연도·월·과목 조건을 넓혀보세요.",{label:"검색 조건 초기화",run:reset});return;}
  const fragment=document.createDocumentFragment();let currentCategory="",section=null;
  for(const group of groups){
    const category=group.grade+":"+group.year;
    if(category!==currentCategory){currentCategory=category;section=make("section","archive-category");section.append(make("h3","category-title",`고${group.grade} · ${group.year}년`));fragment.append(section);}
    const details=make("details","exam-group"),summary=make("summary","exam-group-heading");details.open=catalogDetails.length===0;
    summary.append(make("strong","exam-month",group.month+"월"),make("span","exam-kind",group.kind),make("span","exam-file-count",group.papers.length+"개 문제지"));details.append(summary);
    const body=make("div","exam-group-body");let subject="",links=null;
    for(const paper of group.papers){
      if(subject!==paper.subject){subject=paper.subject;const row=make("div","paper-subject");row.append(make("h4","",subject));links=make("div","paper-links");row.append(links);body.append(row);}
      const item=make("div","paper-item"),link=make("a","paper-link",(paper.detail===paper.subject?paper.subject:paper.detail)+" PDF ↗");link.href=paper.pdfUrl;link.target="_blank";link.rel="noopener noreferrer";link.setAttribute("aria-label",`${group.examTitle} ${paper.detail} 전체 문제지 PDF`);item.append(link);
      if(paper.explanationUrl){const answers=make("a","paper-answer","정답·해설(전체) ↗");answers.href=paper.explanationUrl;answers.target="_blank";answers.rel="noopener noreferrer";item.append(answers);}
      links.append(item);
    }
    body.append(make("p","exam-source",group.institution+" 출제 · EBSi 배포"));details.append(body);section.append(details);catalogDetails.push(details);
  }
  $("results").replaceChildren(fragment);
}
function renderRows(data){
  const fragment=document.createDocumentFragment();
  for(const row of data.results){
    const card=make("article","result-card"),body=make("div"),top=make("div","result-top");
    top.append(make("span","subject-tag",row.subject),make("span","grade-tag","고"+row.grade));
    if(row.detail!==row.subject)top.append(make("span","detail-tag",row.detail));
    body.append(top);const title=make("h3","",row.examTitle+" · ");title.append(make("span","question-number",row.question+"번"));
    body.append(title,make("p","result-meta",`${row.institution} 출제 · EBSi 배포 · 원문 ${row.page}쪽`));
    if(row.sharedPassage)body.append(make("p","shared-tag",row.sharedPassage));
    const actions=make("div","result-actions");
    const questionView=!!row.questionPdfUrl;
    if(questionView||row.highlightUrl){
      const highlight=make("a",row.highlightUrl?"pdf-link highlight-link":"pdf-link",questionView?"문항 PDF 보기 ↗":"단어 표시 PDF ↗");highlight.href=viewerURL(row);highlight.target="_blank";highlight.rel="noopener noreferrer";
      highlight.setAttribute("aria-label",`${row.examTitle} ${row.subject} ${row.question}번 문항과 공통 지문 PDF 새 창`);
      highlight.title=questionView?"해당 문항과 필요한 공통 지문만 보여줍니다.":"검색어 위치를 노란색으로 표시합니다.";actions.append(highlight);
    }
    const link=make("a",questionView||row.highlightUrl?"explanation-link":"pdf-link","전체 원문 PDF ↗");link.href=row.pdfUrl;link.target="_blank";link.rel="noopener noreferrer";link.setAttribute("aria-label",`${row.examTitle} ${row.subject} 전체 원문 PDF 새 창`);actions.append(link);
    if(row.explanationUrl){const explanation=make("a","explanation-link","정답·해설(전체) ↗");explanation.href=row.explanationUrl;explanation.target="_blank";explanation.rel="noopener noreferrer";actions.append(explanation);}
    card.append(body,actions);fragment.append(card);
  }
  $("results").replaceChildren(fragment);
}
function renderPages(data){const container=$("pagination");container.replaceChildren();if(!data.total)return;const previous=make("button","","← 이전"),next=make("button","","다음 →");previous.type=next.type="button";previous.disabled=data.page<=1;next.disabled=data.page>=data.totalPages;previous.addEventListener("click",()=>search(data.page-1,true));next.addEventListener("click",()=>search(data.page+1,true));container.append(previous,make("span","",`${data.page} / ${format(data.totalPages)} 페이지`),next);}
async function getJSON(url,signal){const response=await fetch(apiURL(url),{signal,cache:"no-store",credentials:"omit",headers:{Accept:"application/json"}});let data;try{data=await response.json();}catch{throw new Error("서버 응답을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.");}if(!response.ok)throw new Error(data.error||"자료를 불러오지 못했습니다.");return data;}
async function search(page=1,scroll=false){if(!archive)return;activeRequest?.abort();activeRequest=new AbortController();const ticket=++requestNumber,values=state(),params=new URLSearchParams();for(const [key,value] of Object.entries(values))if(value)params.set(key,value);params.set("page",String(page));history.replaceState(null,"",location.pathname+"?"+params.toString());if(!values.q){renderBrowse(values);return;}$("results-eyebrow").textContent="QUESTION SEARCH";$("browse-return").hidden=false;$("reading-note").textContent="검색어와 일치하는 문항만 표시합니다. 문항 PDF에는 해당 문항과 필요한 공통 지문이 포함되며, 영어 검색어는 노란색으로 표시됩니다.";$("results").setAttribute("aria-busy","true");$("result-summary").textContent="조건에 맞는 문항을 찾고 있습니다.";$("print").disabled=true;setHeading(values.q);showState("기출을 검색하고 있습니다.","수록된 공식 문제지에서 단어와 지문을 확인합니다.");try{const data=await getJSON("/api/search?"+params,activeRequest.signal);if(ticket!==requestNumber)return;lastResult={...data,type:"search"};setHeading(data.query,data.total);$("result-summary").textContent=data.total?`${data.query?'“'+data.query+'” · ':""}전체 ${format(data.total)}문항 중 ${format((data.page-1)*data.pageSize+1)}–${format((data.page-1)*data.pageSize+data.results.length)}번 결과`:"현재 수록 자료와 검색 조건에서 일치하는 문항이 없습니다.";if(data.results.length)renderRows(data);else showState("일치하는 문항을 찾지 못했어요.","검색어를 짧게 줄이거나 과목·연도 조건을 넓혀보세요. 그림 속 글자와 수식은 검색되지 않을 수 있습니다.",{label:"검색 조건 초기화",run:reset});renderPages(data);$("print").disabled=!data.results.length;if(scroll)$("results-title").scrollIntoView({behavior:"smooth",block:"start"});}catch(error){if(error.name==="AbortError"||ticket!==requestNumber)return;lastResult=null;$("result-summary").textContent="검색을 완료하지 못했습니다.";showState("검색 연결을 확인해 주세요.",error.message,{label:"다시 검색",run:()=>search(page)});}finally{if(ticket===requestNumber)$("results").setAttribute("aria-busy","false");}}
function reset(){$("query").value="";for(const id of fields)$(id).value=id==="sort"?"newest":"";document.querySelector('input[name="mode"][value="all"]').checked=true;updateDetails();search();}
function renderCatalog(){const years=archive.years.slice().sort((a,b)=>a-b);$("coverage-title").textContent=years.join(" · ")+"년 · "+archive.grades.map((g)=>"고"+g).join("·");$("coverage-summary").textContent=`검증한 ${format(archive.questionCount)}문항 · ${format(archive.sourceCount)}개 문제지`;$("catalog-stats").textContent=`현재 ${format(archive.sourceCount)}개 문제지의 ${format(archive.questionCount)}문항을 검색할 수 있습니다. 수록 연도는 학년도가 아닌 실제 시험 시행 연도입니다.`;$("limitations").replaceChildren(...archive.limitations.map((text)=>make("li","",text)));const exams=new Map();for(const source of archive.sources){const key=source.examTitle;if(!exams.has(key))exams.set(key,{year:source.year,month:source.month,grade:source.grade,count:0});exams.get(key).count++;}$("source-list").replaceChildren(...[...exams.entries()].sort((a,b)=>b[1].year-a[1].year||b[1].month-a[1].month||a[1].grade-b[1].grade).map(([title,exam])=>{const row=make("div","source-row");row.append(make("span","",title),make("span","",exam.count+"개 문제지"));return row;}));options("grade",archive.grades,"전체 학년");options("subject",archive.subjects,"전체 과목");options("year",archive.years,"전체 연도");options("month",[...new Set(archive.sources.map((source)=>source.month))].sort((a,b)=>a-b),"전체 월");options("kind",archive.kinds,"전체 시험");}
async function initialize(){try{archive=await getJSON("/api/catalog");renderCatalog();const saved=new URLSearchParams(location.search);$("query").value=(saved.get("q")||"").slice(0,200);for(const id of ["grade","subject","year","month","kind","sort"]){const value=saved.get(id);if(value&&[...$(id).options].some((option)=>option.value===value))$(id).value=value;}updateDetails();const detail=saved.get("detail");if(detail&&[...$("detail").options].some((option)=>option.value===detail))$("detail").value=detail;document.querySelector(`input[name="mode"][value="${saved.get("mode")==="phrase"?"phrase":"all"}"]`).checked=true;await search(Math.max(1,Number(saved.get("page"))||1));}catch(error){$("results").setAttribute("aria-busy","false");$("result-summary").textContent="자료 목록을 불러오지 못했습니다.";$("coverage-title").textContent="연결을 확인해 주세요.";$("coverage-summary").textContent="다시 시도 버튼으로 자료를 불러올 수 있습니다.";showState("자료에 연결하지 못했어요.",error.message,{label:"다시 시도",run:initialize});}}
$("browse-return").addEventListener("click",()=>{$("query").value="";search();});
$("query").addEventListener("input",()=>{if(!$("query").value.trim()&&lastResult?.type!=="catalog")search();});
$("query").addEventListener("search",()=>{if(!$("query").value.trim())search();});
$("search-form").addEventListener("submit",(event)=>{event.preventDefault();search();});
for(const id of fields)$(id).addEventListener("change",()=>{if(id==="subject"||id==="grade")updateDetails();search();});
for(const input of document.querySelectorAll('input[name="mode"]'))input.addEventListener("change",()=>search());
$("reset").addEventListener("click",reset);
for(const id of ["coverage-open","coverage-more"])$(id).addEventListener("click",()=>$("coverage-dialog").showModal());
$("coverage-close").addEventListener("click",()=>$("coverage-dialog").close());
$("coverage-dialog").addEventListener("click",(event)=>{if(event.target===$("coverage-dialog")){const box=event.target.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)event.target.close();}});
$("print").addEventListener("click",()=>{
  if(!lastResult?.results.length)return;
  let note=document.querySelector(".print-query");if(!note){note=make("p","print-query");$("results-title").parentElement.append(note);}
  const values=state(),browse=lastResult.type==="catalog";
  note.textContent=`${browse?"모의고사 자료실":"검색어: "+lastResult.query} · ${values.grade?"고"+values.grade:"전체 학년"} · ${values.subject||"전체 과목"} · ${values.year?values.year+"년":"전체 연도"} · ${values.month?values.month+"월":"전체 월"} · ${browse?lastResult.groupCount+"회 시험 / "+lastResult.results.length+"개 문제지":lastResult.page+"/"+lastResult.totalPages+"페이지 / "+lastResult.results.length+"문항"}`;
  const open=catalogDetails.map((details)=>details.open);if(browse)catalogDetails.forEach((details)=>details.open=true);
  try{window.print();}finally{if(browse)catalogDetails.forEach((details,index)=>details.open=open[index]);}
});
initialize();
