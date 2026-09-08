window.loginApp = window.loginApp || async function () {
  var user = document.getElementById('loginUser');
  var pass = document.getElementById('loginPass');
  var msg = document.getElementById('loginMsg');
  if (!user || !pass || !user.value.trim() || !pass.value) {
    if (msg) msg.textContent = 'Логин ва паролни киритинг';
    return;
  }
  try {
    var r = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, cache:'no-store', body:JSON.stringify({login:user.value.trim(), password:pass.value}) });
    var d = await r.json().catch(function(){return {};});
    if (!r.ok || !d.token) throw new Error(d.error === 'LOGIN_FAILED' ? 'Логин ёки парол хато' : (d.error || 'Киришда хатолик'));
    localStorage.setItem('uog_token', d.token);
    location.reload();
  } catch (e) {
    if (msg) msg.textContent = e.message || 'Киришда хатолик';
  }
};
window.login = window.loginApp;
window.logout = function(){ localStorage.removeItem('uog_token'); location.reload(); };
document.addEventListener('DOMContentLoaded', function(){
  var f=document.getElementById('loginForm');
  var b=document.getElementById('loginBtn');
  if(f) f.addEventListener('submit', function(e){e.preventDefault();window.loginApp();});
  if(b) b.addEventListener('click', function(e){e.preventDefault();window.loginApp();});
});
