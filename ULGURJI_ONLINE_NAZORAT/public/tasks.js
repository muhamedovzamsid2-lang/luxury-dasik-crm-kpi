(()=>{
  const $=id=>document.getElementById(id);
  const token=()=>localStorage.getItem('uog_token')||'';
  const today=()=>new Date().toISOString().slice(0,10);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const statusText=s=>({ASSIGNED:'Янги',IN_PROGRESS:'Жараёнда',COMPLETED:'Бажарилди',NOT_COMPLETED:'Бажарилмади'})[s]||s;
  const statusClass=s=>s==='COMPLETED'?'ts-c':s==='NOT_COMPLETED'?'ts-n':s==='IN_PROGRESS'?'ts-p':'ts-a';

  async function api(url,opts={}){
    const headers={Authorization:'Bearer '+token(),...(opts.headers||{})};
    if(opts.body && !headers['Content-Type']) headers['Content-Type']='application/json';
    const r=await fetch(url,{...opts,headers,cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok) throw Error(d.error||'SERVER_ERROR');
    return d;
  }

  async function readFiles(files){
    const out=[];
    for(const f of Array.from(files||[])){
      if(f.size>6*1024*1024) throw Error('Ҳар бир файл 6 МБдан ошмаслиги керак');
      out.push(await new Promise((resolve,reject)=>{
        const r=new FileReader();
        r.onload=()=>resolve({name:f.name,type:f.type,data:r.result});
        r.onerror=reject;
        r.readAsDataURL(f);
      }));
    }
    return out;
  }

  function ensureStyles(){
    if($('taskStyles')) return;
    const s=document.createElement('style');
    s.id='taskStyles';
    s.textContent=`
      .task-card{border:1px solid #e3e9f2;border-radius:16px;padding:15px;margin:10px 0;background:#fff;box-shadow:0 4px 14px rgba(15,23,42,.04)}
      .task-head{display:flex;gap:10px;align-items:flex-start}.task-title{font-weight:850;flex:1;font-size:15px}.task-status{padding:5px 9px;border-radius:999px;font-size:10px;font-weight:850;white-space:nowrap}
      .ts-a{background:#eef2ff;color:#4338ca}.ts-p{background:#fff7ed;color:#c2410c}.ts-c{background:#ecfdf5;color:#047857}.ts-n{background:#fff1f2;color:#be123c}
      .task-result{margin-top:10px;padding:10px;border-radius:11px;background:#f8fafc;font-size:12px;line-height:1.5}.task-files{margin-top:9px;font-size:11px;color:#5b6a83}.task-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
      .task-form-grid{display:grid;grid-template-columns:1fr 1fr 160px;gap:9px}.task-preview{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.task-preview-item{width:88px;border:1px solid #e2e8f0;border-radius:10px;padding:5px;background:#fff;font-size:10px;overflow:hidden}.task-preview-item img{display:block;width:100%;height:58px;object-fit:cover;border-radius:7px}.task-preview-name{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}
      .task-modal{position:fixed;inset:0;background:rgba(15,23,42,.65);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px}.task-modal.hidden{display:none}.task-modal-box{width:min(680px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 25px 70px rgba(0,0,0,.3)}.task-modal-head{padding:16px 18px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:10px}.task-modal-body{padding:18px}.task-modal-foot{padding:14px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.task-modal textarea{width:100%;min-height:130px;border:1px solid #dbe2ea;border-radius:12px;padding:11px;resize:vertical}.task-file-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid #edf2f7;font-size:12px}.task-file-row:last-child{border-bottom:0}.task-detail-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}.task-detail-meta>div{background:#f8fafc;border-radius:10px;padding:10px}.task-detail-meta small{display:block;color:#64748b}.task-detail-meta b{display:block;margin-top:3px}
      @media(max-width:700px){.task-form-grid{grid-template-columns:1fr}.task-detail-meta{grid-template-columns:1fr}.task-modal{padding:8px}}
    `;
    document.head.appendChild(s);
  }

  function modal(){
    let m=$('taskModal');
    if(m) return m;
    m=document.createElement('div');
    m.id='taskModal';m.className='task-modal hidden';
    m.innerHTML='<div class="task-modal-box" onclick="event.stopPropagation()"><div class="task-modal-head"><strong id="taskModalTitle">Топшириқ</strong><button class="btn secondary sm" type="button" onclick="closeTaskModal()">×</button></div><div id="taskModalBody" class="task-modal-body"></div><div id="taskModalFoot" class="task-modal-foot"></div></div>';
    m.addEventListener('click',e=>{if(e.target===m) closeModal()});
    document.body.appendChild(m);return m;
  }
  function closeModal(){const m=$('taskModal');if(m)m.classList.add('hidden')}
  window.closeTaskModal=closeModal;

  function renderPreview(files,target){
    const box=$(target);if(!box)return;
    box.innerHTML='';
    for(const f of Array.from(files||[])){
      const d=document.createElement('div');d.className='task-preview-item';
      if(f.type&&f.type.startsWith('image/')){const img=document.createElement('img');img.src=URL.createObjectURL(f);d.appendChild(img)}
      else d.innerHTML='<div style="height:58px;display:grid;place-items:center;background:#f8fafc;border-radius:7px">📎</div>';
      const n=document.createElement('span');n.className='task-preview-name';n.textContent=f.name;d.appendChild(n);box.appendChild(d);
    }
  }

  async function openTask(id){
    try{
      const d=await api('/api/tasks/'+id),t=d.task;
      modal();$('taskModalTitle').textContent=t.title;
      $('taskModalBody').innerHTML=`<div class="muted">${esc(t.description||'Қўшимча топшириқ')}</div><div class="task-detail-meta"><div><small>Сана</small><b>${esc(t.work_date)}</b></div><div><small>Ҳолат</small><b>${statusText(t.status)}</b></div><div><small>Ижрочи</small><b>${esc(t.employee_name||'—')}</b></div><div><small>Ҳудуд</small><b>${esc([t.region,t.district].filter(Boolean).join(' / ')||'—')}</b></div></div>${t.result_text?`<div class="task-result"><b>Натижа:</b><br>${esc(t.result_text)}</div>`:''}<div style="margin-top:12px"><b>Бириктирилган файллар</b><div id="taskFilesDetail"></div></div>`;
      const list=$('taskFilesDetail');
      list.innerHTML=(d.files||[]).map(f=>`<div class="task-file-row"><span>📎 ${esc(f.filename)} <small>(${Math.ceil((f.size||0)/1024)} КБ)</small></span><button class="btn secondary sm" type="button" onclick="openTaskFile(${id},${f.id})">Кўриш</button></div>`).join('')||'<div class="muted" style="margin-top:8px">Файл йўқ</div>';
      $('taskModalFoot').innerHTML='<button class="btn secondary" type="button" onclick="closeTaskModal()">Ёпиш</button>';
      $('taskModal').classList.remove('hidden');
    }catch(e){alert('Топшириқ маълумотини очиб бўлмади: '+e.message)}
  }
  window.openTaskDetail=openTask;

  window.openTaskFile=async(taskId,fileId)=>{
    try{
      const r=await fetch('/api/tasks/'+taskId+'/files?file='+fileId,{headers:{Authorization:'Bearer '+token()},cache:'no-store'});
      if(!r.ok) throw Error('FILE_OPEN_ERROR');
      const b=await r.blob(),u=URL.createObjectURL(b),w=window.open(u,'_blank');
      if(!w) location.href=u;
      setTimeout(()=>URL.revokeObjectURL(u),60000);
    }catch(e){alert('Файлни очиб бўлмади')}
  };

  async function openStatusForm(id,status){
    modal();
    const labels={COMPLETED:'Бажарилган ишни якунлаш',NOT_COMPLETED:'Бажарилмаган иш сабабини киритиш',IN_PROGRESS:'Жараён ҳақида маълумот киритиш'};
    $('taskModalTitle').textContent=labels[status]||'Топшириқ ҳолати';
    $('taskModalBody').innerHTML=`<label class="field-label">ТАФСИЛОТ</label><textarea id="taskResultText" placeholder="Нима бажарилди ёки нима сабабдан бажарилмади — аниқ ёзинг..."></textarea><div style="margin-top:12px"><label class="field-label">ФОТО / ФАЙЛ</label><input id="taskResultFiles" type="file" accept="image/*,.pdf,.doc,.docx" multiple><div id="taskResultPreview" class="task-preview"></div></div>`;
    const input=$('taskResultFiles');input.addEventListener('change',()=>renderPreview(input.files,'taskResultPreview'));
    $('taskModalFoot').innerHTML=`<button class="btn secondary" type="button" onclick="closeTaskModal()">Бекор қилиш</button><button class="btn primary" type="button" onclick="submitTaskStatus(${id},'${status}')">Сақлаш</button>`;
    $('taskModal').classList.remove('hidden');
  }
  window.taskSet=(id,status)=>openStatusForm(id,status);
  window.submitTaskStatus=async(id,status)=>{
    const text=$('taskResultText').value.trim();
    if((status==='COMPLETED'||status==='NOT_COMPLETED')&&!text){alert('Аниқ тафсилот киритиш керак');return}
    try{
      const attachments=await readFiles($('taskResultFiles')?.files);
      await api('/api/tasks/'+id,{method:'POST',body:JSON.stringify({status,result_text:text,attachments})});
      closeModal();await loadEmployeeTasks();
      if(typeof loadAdminTasks==='function') await loadAdminTasks();
    }catch(e){alert('Сақлашда хатолик: '+e.message)}
  };

  async function loadEmployeeTasks(){
    const box=$('employeeTasksList');if(!box)return;
    try{
      const d=await api('/api/tasks?date='+today());
      box.innerHTML=(d.items||[]).map(t=>`<div class="task-card"><div class="task-head"><div class="task-title">${esc(t.title)}</div><span class="task-status ${statusClass(t.status)}">${statusText(t.status)}</span></div><div class="muted">${esc(t.description||'Қўшимча топшириқ')} • ${esc(t.work_date)}</div>${t.files_count?`<div class="task-files">📎 ${t.files_count} та бириктирилган файл</div>`:''}${t.result_text?`<div class="task-result"><b>Ижрочи тафсилоти:</b><br>${esc(t.result_text)}</div>`:''}<div class="task-actions"><button class="btn secondary sm" onclick="openTaskDetail(${t.id})">👁 Кўриш</button>${t.status!=='COMPLETED'?`<button class="btn primary sm" onclick="taskSet(${t.id},'COMPLETED')">✓ Бажарилди</button><button class="btn secondary sm" onclick="taskSet(${t.id},'IN_PROGRESS')">⏳ Жараёнда</button><button class="btn danger sm" onclick="taskSet(${t.id},'NOT_COMPLETED')">✕ Бажарилмади</button>`:''}</div></div>`).join('')||'<div class="empty">Бугун учун қўшимча топшириқ йўқ.</div>';
    }catch(e){box.innerHTML='<div class="bad">Қўшимча топшириқлар юкланмади</div>'}
  }
  window.loadEmployeeTasks=loadEmployeeTasks;

  async function loadAdminTasks(){
    const box=$('adminTasksList');if(!box)return;
    try{
      const d=await api('/api/tasks?date='+($('taskAdminDate')?.value||today())),c={ASSIGNED:0,IN_PROGRESS:0,COMPLETED:0,NOT_COMPLETED:0};
      (d.items||[]).forEach(t=>c[t.status]++);
      box.innerHTML=`<div class="kpi-grid"><div class="card metric-card"><div class="kpi-label">Янги</div><div class="metric-value kpi-blue">${c.ASSIGNED}</div></div><div class="card metric-card"><div class="kpi-label">Жараёнда</div><div class="metric-value kpi-amber">${c.IN_PROGRESS}</div></div><div class="card metric-card"><div class="kpi-label">Бажарилди</div><div class="metric-value kpi-green">${c.COMPLETED}</div></div><div class="card metric-card"><div class="kpi-label">Бажарилмади</div><div class="metric-value kpi-red">${c.NOT_COMPLETED}</div></div></div>`+(d.items||[]).map(t=>`<div class="task-card"><div class="task-head"><div class="task-title">${esc(t.title)}<div class="muted">Ижрочи: ${esc(t.employee_name||'—')} • ${esc([t.region,t.district].filter(Boolean).join(' / '))}</div></div><span class="task-status ${statusClass(t.status)}">${statusText(t.status)}</span></div><div class="muted">${esc(t.description||'')} • ${esc(t.work_date)}</div><div class="task-result"><b>Якуний натижа:</b> ${esc(t.result_text||'Ҳали киритилмаган')}${t.completed_at?`<br><span class="muted">Якунланган: ${esc(t.completed_at)}</span>`:''}</div><div class="task-actions"><button class="btn secondary sm" onclick="openTaskDetail(${t.id})">👁 Тўлиқ кўриш${t.files_count?' ('+t.files_count+')':''}</button></div></div>`).join('')||'<div class="empty">Танланган санада топшириқ йўқ.</div>';
    }catch(e){box.innerHTML='<div class="bad">Топшириқлар юкланмади</div>'}
  }
  window.loadAdminTasks=loadAdminTasks;

  async function createDailyTask(){
    const title=$('taskTitle')?.value.trim(),description=$('taskDescription')?.value.trim(),work_date=$('taskDate')?.value||today(),employee_id=Number($('taskEmployee')?.value);
    if(!title||!employee_id)return alert('Ижрочи ва топшириқ матни керак');
    try{
      const attachments=await readFiles($('taskFiles')?.files);
      await api('/api/tasks',{method:'POST',body:JSON.stringify({title,description,work_date,employee_id,attachments})});
      $('taskTitle').value='';$('taskDescription').value='';$('taskFiles').value='';$('taskPreview').innerHTML='';
      alert('Топшириқ ходимга юборилди');await loadAdminTasks();
    }catch(e){alert('Юборишда хатолик: '+e.message)}
  }
  window.createDailyTask=createDailyTask;

  function inject(){
    ensureStyles();
    const emp=$('employee');
    if(emp&&!$('employeeTasksCard')){
      const c=document.createElement('div');c.id='employeeTasksCard';c.className='card section-gap';
      c.innerHTML='<div class="section-title"><div><div class="eyebrow">ҚЎШИМЧА ТОПШИРИҚЛАР</div><h3>Бугунги раҳбар топшириқлари</h3><p class="muted" style="margin:0">Топшириқни жойида бажаринг, натижа ва фото нусхаларини шу ердан киритинг.</p></div><button class="btn secondary sm" onclick="loadEmployeeTasks()">↻</button></div><div id="employeeTasksList"></div>';
      emp.appendChild(c);
    }
    const admin=$('admin');
    if(admin&&!$('taskTab')){
      const nav=admin.querySelector('.tabs');
      if(nav){const b=document.createElement('button');b.id='taskTab';b.className='tabbtn';b.textContent='📝 Қўшимча топшириқлар';b.onclick=()=>{admin.querySelectorAll('.tabpanel').forEach(x=>x.classList.add('hidden'));$('adminTasksPanel').classList.remove('hidden');nav.querySelectorAll('.tabbtn').forEach(x=>x.classList.remove('active'));b.classList.add('active');loadAdminTasks()};nav.appendChild(b)}
      const panel=document.createElement('div');panel.id='adminTasksPanel';panel.className='tabpanel hidden';
      panel.innerHTML=`<div class="card"><div class="section-title"><div><div class="eyebrow">ТОПШИРИҚ БОШҚАРУ</div><h3>Кунлик қўшимча топшириқ киритиш</h3><p class="muted" style="margin:0">Ижрочини танланг, вазифа ва талабларни ёзинг, фото ёки ҳужжат бириктиринг.</p></div></div><div class="task-form-grid"><div><label class="field-label">ИЖРОЧИ</label><select id="taskEmployee"></select></div><div><label class="field-label">ТОПШИРИҚ</label><input id="taskTitle" placeholder="Топшириқ номи"></div><div><label class="field-label">САНА</label><input id="taskDate" type="date" value="${today()}"></div></div><textarea id="taskDescription" rows="4" style="margin-top:10px;width:100%" placeholder="Топшириқнинг аниқ тафсилоти, талаб ва муддатини ёзинг..."></textarea><div class="row" style="margin-top:10px"><input id="taskFiles" type="file" accept="image/*,.pdf,.doc,.docx" multiple style="flex:1"><button class="btn primary" onclick="createDailyTask()">📤 Юбориш</button></div><div id="taskPreview" class="task-preview"></div></div><div class="card"><div class="section-title"><div><div class="eyebrow">КУН ОХИРИ НАЗОРАТИ</div><h3>Бажарилиш натижалари</h3></div><div class="row"><input id="taskAdminDate" type="date" value="${today()}"><button class="btn secondary sm" onclick="loadAdminTasks()">↻</button></div></div><div id="adminTasksList"></div></div>`;
      admin.querySelector('.admin-main').appendChild(panel);
      const fi=$('taskFiles');if(fi)fi.addEventListener('change',()=>renderPreview(fi.files,'taskPreview'));
    }
    const s=$('taskEmployee'),es=$('employeeSelect');if(s&&es&&s.options.length<=1)s.innerHTML=es.innerHTML;
    if(emp&&!emp.classList.contains('hidden'))loadEmployeeTasks();
  }

  setInterval(inject,700);setTimeout(inject,250);
})();
