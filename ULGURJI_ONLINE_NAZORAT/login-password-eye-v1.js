(()=>{
'use strict';
function addEye(input){
 if(!input||input.dataset.passwordEye==='1')return;
 input.dataset.passwordEye='1';
 const wrap=document.createElement('span');
 wrap.style.cssText='position:relative;display:block;width:100%';
 input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
 input.style.paddingRight='44px';
 const btn=document.createElement('button');
 btn.type='button';btn.setAttribute('aria-label','Паролни кўрсатиш');btn.textContent='👁';
 btn.style.cssText='position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:transparent;cursor:pointer;font-size:20px;line-height:1;padding:4px;z-index:5';
 btn.addEventListener('click',()=>{const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?'🙈':'👁';btn.setAttribute('aria-label',show?'Паролни яшириш':'Паролни кўрсатиш');});
 wrap.appendChild(btn);
}
function scan(){document.querySelectorAll('input[type="password"]').forEach(addEye)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
})();
