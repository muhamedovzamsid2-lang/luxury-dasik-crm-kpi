(()=>{
  const form=document.getElementById('loginForm');
  if(!form||form.dataset.loginFix==='1')return;
  form.dataset.loginFix='1';
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=document.getElementById('loginBtn'),msg=document.getElementById('loginMsg');
    const login=(document.getElementById('loginUser')?.value||'').trim();
    const password=document.getElementById('loginPass')?.value||'';
    if(!login||!password){if(msg)msg.textContent='Логин ва парольни киритинг';return false}
    if(btn)btn.disabled=true;
    if(msg)msg.textContent='Кириш текширилмоқда...';
    try{
      const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({login,password}),cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw Error(d.error||('HTTP_'+r.status));
      if(!d.token)throw Error('TOKEN_NOT_RECEIVED');
      localStorage.setItem('uog_token',d.token);
      if(msg)msg.textContent='Кириш муваффақиятли. Юкланмоқда...';
      location.reload();
    }catch(err){
      if(msg)msg.textContent=err.message==='LOGIN_FAILED'?'Логин ёки пароль хато':'Киришда хатолик. Қайта уриниб кўринг';
    }finally{if(btn)btn.disabled=false}
    return false;
  });
})();
