"use strict";
const element=(id)=>document.getElementById(id),params=new URLSearchParams(location.search);
let objectURL=null,controller=null,requestTicket=0;
const query=(params.get("q")||"").trim(),id=params.get("id")||"",sourceId=params.get("source")||"";
const page=Math.min(100,Math.max(1,Number(params.get("page"))||1));
async function originalLink(){
  try{const response=await fetch(new URL("/api/catalog",globalThis.ExamConfig.apiBase),{credentials:"omit",cache:"no-store"});if(!response.ok)return;const catalog=await response.json(),source=catalog.sources.find((item)=>item.id===sourceId);if(!source)return;const url=new URL(source.pdfUrl);if(url.protocol!=="https:"||url.hostname!=="wdown.ebsi.co.kr")return;element("viewer-original").href=source.pdfUrl+"#page="+page;element("viewer-original").hidden=false;}catch{}
}
async function loadPdf(){
  controller?.abort();controller=new AbortController();const ticket=++requestTicket;
  element("viewer-title").textContent="검색어 위치를 표시하고 있습니다.";element("viewer-status").textContent="공식 문제지를 불러오고 있습니다. 잠시만 기다려 주세요.";element("viewer-retry").hidden=true;element("pdf-frame").hidden=true;element("viewer-open").hidden=true;element("viewer-download").hidden=true;
  if(!/^[a-f0-9]{16}$/.test(id)||!query||query.length>200){element("viewer-title").textContent="PDF 주소를 확인해 주세요.";element("viewer-status").textContent="기출 검색 결과에서 ‘단어 표시 PDF’를 다시 눌러 주세요.";return;}
  const url=new URL("/api/highlighted-pdf",globalThis.ExamConfig.apiBase);url.search=new URLSearchParams({id,q:query,mode:params.get("mode")==="phrase"?"phrase":"all"});
  try{
    const response=await fetch(url,{credentials:"omit",cache:"no-store",signal:controller.signal,headers:{Accept:"application/pdf"}});
    if(!response.ok){let message="PDF를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";try{message=(await response.json()).error||message;}catch{}throw new Error(message);}
    if(!response.headers.get("Content-Type")?.includes("application/pdf"))throw new Error("PDF 응답을 확인하지 못했습니다. 다시 시도해 주세요.");
    const bytes=await response.arrayBuffer();if(ticket!==requestTicket)return;
    if(new TextDecoder().decode(new Uint8Array(bytes,0,Math.min(5,bytes.byteLength)))!=="%PDF-")throw new Error("올바른 PDF를 받지 못했습니다. 다시 시도해 주세요.");
    if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));
    const pdf=objectURL+"#page="+page;element("pdf-frame").src=pdf;element("pdf-frame").hidden=false;element("viewer-open").href=pdf;element("viewer-open").hidden=false;element("viewer-download").href=objectURL;element("viewer-download").download="exam-highlighted.pdf";element("viewer-download").hidden=false;
    const count=Number(response.headers.get("X-Highlight-Count"));element("viewer-title").textContent="‘"+query+"’ 위치 표시 PDF";element("viewer-status").textContent=(count?"문제지 전체에서 "+count+"곳을 노란색으로 표시했습니다. ":"검색어 위치를 노란색으로 표시했습니다. ")+"아래에 PDF가 보이지 않으면 ‘새 창으로 열기’를 눌러 주세요.";
  }catch(error){if(error.name==="AbortError"||ticket!==requestTicket)return;element("viewer-title").textContent="표시 PDF를 열지 못했어요.";element("viewer-status").textContent=error.message;element("viewer-retry").hidden=false;}
}
element("viewer-retry").addEventListener("click",loadPdf);
window.addEventListener("pagehide",()=>{controller?.abort();if(objectURL)URL.revokeObjectURL(objectURL);});
originalLink();loadPdf();
