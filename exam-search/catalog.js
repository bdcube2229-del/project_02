"use strict";
globalThis.ExamCatalog=Object.freeze({
  papers(sources,filters={}){
    const unique=new Map();
    for(const source of sources){
      if(filters.grade&&Number(filters.grade)!==source.grade)continue;
      if(filters.year&&Number(filters.year)!==source.year)continue;
      if(filters.month&&Number(filters.month)!==source.month)continue;
      if(filters.subject&&filters.subject!==source.subject)continue;
      if(filters.kind&&filters.kind!==source.kind)continue;
      if(filters.detail){
        if(filters.detail==="공통"){if(source.grade!==3||!["국어","수학"].includes(source.subject))continue;}
        else if(filters.detail!==source.detail)continue;
      }
      const key=source.pdfUrl.split("#")[0];if(!unique.has(key))unique.set(key,source);
    }
    return [...unique.values()];
  },
  groups(papers,sort="newest"){
    const groups=new Map(),direction=sort==="oldest"?1:-1;
    const subjects=["국어","영어","수학","사회","과학","한국사"];
    for(const source of papers){const key=[source.grade,source.year,source.month,source.kind].join(":");if(!groups.has(key))groups.set(key,{key,grade:source.grade,year:source.year,month:source.month,kind:source.kind,examTitle:source.examTitle,institution:source.institution,papers:[]});groups.get(key).papers.push(source);}
    for(const group of groups.values())group.papers.sort((a,b)=>subjects.indexOf(a.subject)-subjects.indexOf(b.subject)||a.detail.localeCompare(b.detail,"ko"));
    return [...groups.values()].sort((a,b)=>a.grade-b.grade||direction*(a.year-b.year)||direction*(a.month-b.month)||a.kind.localeCompare(b.kind,"ko"));
  }
});
