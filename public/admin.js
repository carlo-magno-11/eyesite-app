const SU='https://xhvpvpvtkdgnnxdwdrkn.supabase.co',SK='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhodnB2cHZ0a2Rnbm54ZHdkcmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODk5MTEsImV4cCI6MjEwMjY2NTkxMX0.zsEMmjhbln24S25FnbKvlkic2djzON8QoXNLO8CtXA0';
const {createClient}=supabase,db=createClient(SU,SK);
let props=[],pendientes=[],editId=null,viewId=null,ns=nS(),es=null;
function nS(){return{tipo:'terreno',unidad:'m²',estado:'activa',fotos:[],pdfs:[],kmz_kml:[],videos:[],ubicaciones:[],fn:[],pn:[],kn:[],vn:[],portadaFile:null};}

/* ── AUTH ── */
async function doLogin(){
  const e=document.getElementById('le').value.trim(),p=document.getElementById('lp').value;
  document.getElementById('lerr').textContent='';
  if(!e||!p){document.getElementById('lerr').textContent='Ingresa correo y contraseña';return;}
  const{data,error}=await db.auth.signInWithPassword({email:e,password:p});
  if(error){document.getElementById('lerr').textContent='Credenciales incorrectas: '+error.message;return;}
  startApp(data.user);
}
function startApp(u){
  document.getElementById('lw').style.display='none';
  document.getElementById('app').classList.add('on');
  document.getElementById('ue').textContent=u.email;
  buildF('nf',ns);
  loadAll();
}

/* ── LOAD ALL (única) ── */
async function loadAll(){
  const{data:d1}=await db.from('propiedades').select('*').order('created_at',{ascending:false});
  let d2=[];
  const{data:dj}=await db.from('solicitudes_propiedades').select('*, propiedades(*)').order('created_at',{ascending:false});
  if(dj&&dj.length!==undefined){d2=dj;}
  else{
    const{data:ds}=await db.from('solicitudes_propiedades').select('*').order('created_at',{ascending:false});
    d2=ds||[];
  }
  props=d1||[];pendientes=d2||[];
  renderDash();renderProps(props);renderPend(pendientes);updBadge();
}

/* ── HELPERS ── */
function fmt(n){return '$'+Number(n||0).toLocaleString('es-MX');}
function esc(s){return String(s??'').replace(/"/g,'"').replace(/</g,'<').replace(/>/g,'>');}
function trunc(s,n){s=String(s||'');return s.length>n?s.slice(0,n)+'…':s;}
function parseFotos(f){
  if(!f)return[];
  if(Array.isArray(f))return f.filter(u=>u&&!u.startsWith('file://'));
  if(typeof f==='string'){
    try{const a=JSON.parse(f);return Array.isArray(a)?a.filter(u=>u&&!u.startsWith('file://')):[];}
    catch(e){return f.split(',').map(x=>x.trim()).filter(u=>u&&!u.startsWith('file://'));}
  }
  return[];
}
function calcRend(actual,mercado){
  if(!actual||!mercado)return null;
  return Math.round(((mercado-actual)/actual)*100);
}

/* ── DASHBOARD ── */
function renderDash(){
  const activas=props.filter(p=>p.estado==='activa').length;
  const cats=new Set(props.map(p=>p.tipo).filter(Boolean)).size;
  const rends=props.map(p=>parseFloat(p.rendimiento)).filter(n=>!isNaN(n));
  const avg=rends.length?Math.round(rends.reduce((a,b)=>a+b,0)/rends.length):0;
  document.getElementById('st').textContent=activas;
  document.getElementById('sp').textContent=pendientes.length;
  document.getElementById('stip').textContent=cats;
  document.getElementById('savg').textContent=avg+'%';
  const tb=document.getElementById('dtb');
  const recientes=props.slice(0,5);
  if(!recientes.length){tb.innerHTML='<tr><td colspan="6"><div class="empty2"><div class="emi">📭</div><div class="emt">Sin propiedades aún</div></div></td></tr>';return;}
  tb.innerHTML=recientes.map(p=>`<tr style="cursor:pointer" onclick="openEdit('${p.id}')">
    <td class="p">${esc(p.titulo)}</td>
    <td><span class="badge bb2">${esc(p.tipo)}</span></td>
    <td>${esc(p.municipio)}</td>
    <td>${fmt(p.precio_actual)}</td>
    <td>${p.rendimiento?'+'+p.rendimiento+'%':'—'}</td>
    <td><span class="badge ${p.estado==='activa'?'bg2':'br2'}">${p.estado==='activa'?'Activa':'Oculta'}</span></td>
  </tr>`).join('');
}

/* ── PROPIEDADES ── */
function renderProps(list){
  const tb=document.getElementById('ptb');
  if(!list.length){tb.innerHTML='<tr><td colspan="8"><div class="empty2"><div class="emi">📭</div><div class="emt">Sin propiedades</div></div></td></tr>';return;}
  tb.innerHTML=list.map(p=>{
    const fotos=parseFotos(p.fotos);
    return `<tr>
    <td>${fotos[0]?`<div style="position:relative;width:fit-content"><img class="thumb" src="${fotos[0]}" onerror="this.style.display='none'">${p.video_url?`<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:11px;background:rgba(0,0,0,.65);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center">▶️</span>`:''}</div>`:'<div class="thumb" style="display:flex;align-items:center;justify-content:center;font-size:14px">🏠</div>'}</td>
    <td class="p" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.titulo)}</td>
    <td><span class="badge bb2">${esc(p.tipo)}</span></td><td>${esc(p.municipio)}</td>
    <td>${fmt(p.precio_actual)}/${esc(p.unidad_precio||'m²')}</td>
    <td>${p.rendimiento?'+'+p.rendimiento+'%':'—'}</td>
    <td><span class="badge ${p.estado==='activa'?'bg2':'br2'}">${p.estado==='activa'?'Activa':'Oculta'}</span></td>
    <td><div class="ab">
      <button class="bs be2" onclick="editarPropiedad('${p.id}')">✏️ Editar</button>
      <button class="bs bt2" onclick="${p.estado==='activa'?`ocultarPropiedad('${p.id}')`:`activarPropiedad('${p.id}')`}">${p.estado==='activa'?'⏸ Ocultar':'▶️ Activar'}</button>
      <button class="bs bd2" onclick="confDel('${p.id}','${esc(p.titulo).replace(/'/g,"\\'")}')">🗑️</button>
    </div></td>
  </tr>`;
  }).join('');
}
function filterT(q){
  q=(q||'').toLowerCase();
  renderProps(props.filter(p=>p.titulo.toLowerCase().includes(q)||(p.municipio||'').toLowerCase().includes(q)||(p.tipo||'').toLowerCase().includes(q)));
}

/* ── POR APROBAR ── */
function renderPend(lista){
  const tb=document.getElementById('pendtb');
  if(!tb)return;
  const data=lista||pendientes||[];
  if(!data.length){tb.innerHTML='<tr><td colspan="8"><div class="empty2"><div class="emi">🎉</div><div class="emt">No hay solicitudes pendientes</div></div></td></tr>';return;}
  tb.innerHTML=data.map(p=>{
    const fotos=parseFotos(p.fotos);
    const precio=p.precio_actual||p.precio_esperado||p.precio_mercado||0;
    const usuario=p.contacto_nombre||p.usuario||'Usuario';
    return `<tr>
    <td>${fotos[0]?`<div style="position:relative;width:fit-content"><img class="thumb50" src="${fotos[0]}" onerror="this.style.display='none'">${p.video_url?`<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:14px;background:rgba(0,0,0,.65);border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center">▶️</span>`:''}</div>`:'<div class="thumb50" style="display:flex;align-items:center;justify-content:center;font-size:18px">🏠</div>'}</td>
    <td><b style="color:var(--tx)">${esc(p.titulo)}</b><br><small style="opacity:.6">${esc(trunc(p.descripcion,60))}${p.superficie?' • '+p.superficie+' '+(p.unidad_superficie||'m²'):''}</small></td>
    <td>${esc(usuario)}</td>
    <td><span class="badge bb2">${esc(p.tipo)}</span></td>
    <td>${esc(p.municipio)}</td>
    <td>${fmt(precio)}</td>
    <td>${p.created_at?new Date(p.created_at).toLocaleDateString():'—'}</td>
    <td><div class="ab">
      <button class="bs bt2" onclick="verPend('${p.id}')">👁 Ver</button>
      <button class="bs bap2" onclick="aprobarPend('${p.id}')">✅ Aprobar</button>
      <button class="bs bd2" onclick="confDelPend('${p.id}','${esc(p.titulo).replace(/'/g,"\\'")}')">🗑️</button>
    </div></td>
  </tr>`;
  }).join('');
}
function updBadge(){
  const n=(pendientes||[]).length;
  const b=document.getElementById('nb');
  b.textContent=n;b.style.display=n?'inline-block':'none';
}
function verPend(id){
  const p=(pendientes||[]).find(x=>x.id===id);
  if(!p){toast('❌ No se encontró la solicitud');return;}
  viewId=id;
  const fotos=parseFotos(p.fotos);
  const precio=p.precio_actual||p.precio_esperado||p.precio_mercado||0;
  const rend=calcRend(p.precio_actual,p.precio_mercado);
  document.getElementById('vmsub').textContent=p.titulo;
  document.getElementById('vf').innerHTML=`
    ${fotos.length?`<div class="vpsec"><h4>📸 Fotos</h4>${fotos.map(f=>`<img class="vpimg" src="${f}" onerror="this.style.display='none'">`).join('')}</div>`:''}
    <div class="vpsec"><h4>📋 Información</h4>
      <div class="vpinfo">
        <span class="vpchip">Tipo: <b>${esc(p.tipo)}</b></span>
        <span class="vpchip">Municipio: <b>${esc(p.municipio)}</b></span>
        ${p.superficie?`<span class="vpchip">Superficie: <b>${p.superficie} ${esc(p.unidad_superficie||'m²')}</b></span>`:''}
        <span class="vpchip">Precio: <b>${fmt(precio)}</b></span>
        ${p.precio_mercado?`<span class="vpchip">Mercado: <b>${fmt(p.precio_mercado)}</b></span>`:''}
        ${rend!==null?`<span class="vpchip">Rendimiento: <b>+${rend}%</b></span>`:''}
        ${p.created_at?`<span class="vpchip">Fecha: <b>${new Date(p.created_at).toLocaleDateString()}</b></span>`:''}
      </div>
    </div>
    ${p.descripcion?`<div class="vpsec"><h4>📝 Descripción</h4><div style="font-size:13px;color:var(--tx);line-height:1.6">${esc(p.descripcion)}</div></div>`:''}
    <div class="vpsec"><h4>👤 Contacto</h4>
      <div class="vpinfo">
        ${p.contacto_nombre?`<span class="vpchip">Nombre: <b>${esc(p.contacto_nombre)}</b></span>`:''}
        ${p.contacto_telefono?`<span class="vpchip">Tel: <b>${esc(p.contacto_telefono)}</b></span>`:''}
        ${p.contacto_email?`<span class="vpchip">Email: <b>${esc(p.contacto_email)}</b></span>`:''}
      </div>
    </div>`;
  document.getElementById('vmod').classList.add('on');
}
async function aprobarPend(id){
  const pid=id||viewId;
  if(!pid){toast('❌ No hay solicitud seleccionada');return;}
  const p=(pendientes||[]).find(x=>x.id===pid);
  if(!p){toast('❌ No se encontró la solicitud');return;}
  const fotos=parseFotos(p.fotos);
  const precioActual=parseFloat(p.precio_actual||p.precio_esperado||0)||0;
  const precioMercado=parseFloat(p.precio_mercado)||null;
  const rend=calcRend(precioActual,precioMercado);
  const nueva={
  titulo: p.titulo || p.title || 'Sin título',
  tipo: p.tipo || 'terreno',
  municipio: p.municipio || '',
  direccion: p.direccion || '',
  superficie: parseFloat(p.superficie)||null,
  unidad_superficie: p.unidad_superficie||'m²',
  frente: p.frente||null,
  fondo: p.fondo||null,
  precio_actual: precioActual,
  precio_mercado: precioMercado,
  precio_esperado: precioActual,
  unidad_precio: p.unidad_precio||'m²',
  rendimiento: rend,
  moneda: 'MXN',
  estado: 'activa', // <- con A
  destacada: true, // <- para que salga en OPORTUNIDADES DESTACADAS
  certeza_legal: true,
  descripcion: p.descripcion||'',
  fotos: fotos, // <- columna estándar: fotos
  videos: p.videos||p.video_links||[], // <- estándar: videos (compat video_links)
  ubicaciones: p.ubicaciones||p.maps_links||[], // <- estándar: ubicaciones (compat maps_links)
  pdfs: p.pdfs||[],
  kmz_kml: p.kmz_kml||p.kmz_files||[], // <- estándar: kmz_kml (compat kmz_files)
};

  const{error}=await db.from('propiedades').insert(nueva);
  if(error){toast('❌ Error al aprobar: '+error.message+(error.code?' ['+error.code+']':'')+(error.details?' — '+error.details:''));console.error('[aprobarPend] ERROR REAL:',error);return;}
  await db.from('solicitudes_propiedades').delete().eq('id',pid);
  closeMod('vmod');
  toast('✅ Propiedad aprobada y publicada en la app');
  await loadAll();
}
function delPend(){
  if(!viewId){toast('❌ No hay solicitud seleccionada');return;}
  confDelPend(viewId,'esta solicitud');
}
function confDelPend(id,title){
  document.getElementById('ctit').textContent='¿Eliminar solicitud?';
  document.getElementById('csub').textContent='"'+title+'" — Se eliminará permanentemente.';
  document.getElementById('cok').onclick=async()=>{
    const{error}=await db.from('solicitudes_propiedades').delete().eq('id',id);
    if(error){toast('❌ Error: '+error.message);}
    else{toast('🗑️ Solicitud eliminada');closeMod('vmod');await loadAll();}
    closeCon();
  };
  document.getElementById('cov').classList.add('on');
}

/* ── FORMULARIO ÚNICO ── */
function buildF(cid,st){
  const c=document.getElementById(cid);if(!c)return;
  const tipos={terreno:'🌿 Terreno',casa:'🏠 Casa',hacienda:'🏛️ Hacienda',rancho:'🐄 Rancho',industrial:'🏭 Industrial'};
  const unidades=['m²','ml','ha','lote'];
  const esCasa=st.tipo==='casa'||st.tipo==='hacienda';
  const detalles=st.detalles||{};
  c.innerHTML=`
  <div class="g2" style="margin-bottom:12px;">
    <div class="fg gfull"><label>Título <span>*</span></label><input class="fi2" id="${cid}_t" placeholder="Ej: Terreno 5 ha — Mérida" value="${esc(st.titulo||'')}"></div>
    <div class="fg gfull"><label>Tipo <span>*</span></label>
      <div class="tr" id="${cid}_tr">${Object.entries(tipos).map(([v,l])=>`<div class="tc ${(st.tipo||'terreno')===v?'on':''}" data-v="${v}" onclick="sTipo('${cid}','${v}')">${l}</div>`).join('')}</div>
    </div>
    <div class="fg"><label>Municipio <span>*</span></label><input class="fi2" id="${cid}_m" placeholder="Ej: Mérida" value="${esc(st.municipio||'')}"></div>
    <div class="fg"><label>Superficie</label><input class="fi2" id="${cid}_sup" type="number" placeholder="5000" value="${st.superficie||''}"></div>
    <div class="fg"><label>Unidad superficie</label>
      <select class="fsel" id="${cid}_usup">${['m²','ha','ml','lote'].map(u=>`<option value="${u}" ${(st.unidad_superficie||'m²')===u?'selected':''}>${u}</option>`).join('')}</select>
    </div>
    <div class="fg"><label>Precio actual <span>*</span></label><input class="fi2" id="${cid}_p" type="number" placeholder="0" value="${st.precio_actual||''}" oninput="autoRend('${cid}')"></div>
    <div class="fg"><label>Precio de mercado</label><input class="fi2" id="${cid}_pm" type="number" placeholder="0" value="${st.precio_mercado||''}" oninput="autoRend('${cid}')"></div>
    <div class="fg gfull"><label>Unidad de precio</label>
      <div class="ur" id="${cid}_ur">${unidades.map(u=>`<div class="ub ${(st.unidad||st.unidad_precio||'m²')===u?'on':''}" data-v="${u}" onclick="sUnidad('${cid}','${u}')">${u}</div>`).join('')}</div>
    </div>
    <div class="fg"><label>Rendimiento (%)</label><input class="fi2" id="${cid}_r" type="number" placeholder="Auto-calculado" value="${st.rendimiento||''}" readonly></div>
    <div class="fg"><label>Estado</label>
      <select class="fsel" id="${cid}_act">
        <option value="activa" ${(st.estado||'activa')==='activa'?'selected':''}>Activa — visible en app</option>
        <option value="oculta" ${st.estado==='oculta'?'selected':''}>Oculta — no visible</option>
      </select>
    </div>
    <div class="fg gfull" id="${cid}_det" style="${esCasa?'':'display:none'}">
      <div class="g2" style="margin:0">
        <div class="fg"><label>Recámaras</label><input class="fi2" id="${cid}_rec" type="number" placeholder="3" value="${detalles.recamaras||''}"></div>
        <div class="fg"><label>Baños</label><input class="fi2" id="${cid}_ban" type="number" placeholder="2" value="${detalles.banos||''}"></div>
      </div>
    </div>
    <div class="fg gfull"><label>Descripción</label><textarea class="fta" id="${cid}_d" placeholder="Describe la propiedad...">${esc(st.descripcion||'')}</textarea></div>
    <div class="fg">
      <label>Destacada</label>
      <div class="chkrow"><input type="checkbox" id="${cid}_dest" ${st.destacada?'checked':''}><span>Mostrar en oportunidades destacadas del inicio</span></div>
    </div>
    <div class="fg">
      <label>Certeza legal</label>
      <div class="chkrow"><input type="checkbox" id="${cid}_cl" ${st.certeza_legal!==false?'checked':''}><span>Esta propiedad tiene certeza legal garantizada</span></div>
    </div>
  </div>
  <div class="ups">
    <div class="upt">🖼️ FOTO PORTADA (OBLIGATORIA)</div>
    <img id="${cid}_preview_foto" src="${esc((st.fotos&&st.fotos[0])||'')}" style="width:200px;border-radius:8px;margin:8px 0;${(st.fotos&&st.fotos[0])?'':'display:none'}">
    <div class="fg">
      <label>${(st.fotos&&st.fotos[0])?'Reemplazar foto de portada':'Subir foto de portada'}</label>
      <input type="file" accept="image/*" id="${cid}_foto_portada" onchange="hPortada(this.files,'${cid}')">
    </div>
    <div class="rh" style="display:block">Esta foto SIEMPRE se ve en el Home. El video (siguiente bloque) va en SEGUNDO lugar del detalle: ninguno borra al otro.</div>
  </div>
  <div class="ups">
    <div class="upt">🎥 Video de Portada (Opcional — se guarda JUNTO con la foto)</div>
    <div class="dz" id="${cid}_dzv" style="margin-bottom:8px;">
      <input type="file" accept="video/*" onchange="hFiles(this.files,'v','${cid}')">
      <div class="dzi">🎥</div><div class="dzl"><strong>Clic o arrastra</strong> el video aquí</div>
      <div class="dzh">MP4/MOV — Máx. 50MB</div>
    </div>
    <div class="fg">
      <label>…o pega una URL de video directo (.mp4)</label>
      <input class="fi2" id="${cid}_video_url" placeholder="https://...mp4" value="${esc(st.video_url||'')}">
    </div>
    <video id="${cid}_preview_video" src="${esc(st.video_url||(st.videos&&st.videos[0])||'')}" width="200" controls style="border-radius:8px;margin-top:8px;${(st.video_url||(st.videos&&st.videos[0]))?'':'display:none'}"></video>
    <div class="fl2" id="${cid}_lvf" style="margin-top:8px;"></div>
  </div>
  <div class="ups">
    <div class="upt">🖼️ Galería (0–10 fotos) — ↑↓ ordena · ✕ borra</div>
    <div class="pgrid" id="${cid}_fg"></div>
    <div class="rh" id="${cid}_rh" style="display:none">La primera foto es la portada. Para reordenar: elimina y vuelve a subir en el orden deseado.</div>
    <div class="dz" id="${cid}_dzf" style="margin-top:8px;">
      <input type="file" accept="image/*" multiple onchange="hFiles(this.files,'f','${cid}')">
      <div class="dzi">🖼️</div><div class="dzl"><strong>Clic o arrastra</strong> fotos aquí</div>
      <div class="dzh">JPG, PNG — Máx. 30MB por foto</div>
    </div>
    <div class="fl2" id="${cid}_lf"></div>
  </div>
  <div class="ups" id="${cid}_sec_pdf">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div class="upt" style="margin-bottom:0">📄 PDFs</div>
      <button class="bs bt2" style="font-size:10px;" onclick="toggleSec('${cid}_sec_pdf_body')">+ Agregar PDF</button>
    </div>
    <div class="fl2" id="${cid}_lpdfex"></div>
    <div id="${cid}_sec_pdf_body" style="display:none;">
      <div class="dz" id="${cid}_dzpdf" style="margin-top:8px;">
        <input type="file" accept=".pdf" multiple onchange="hFiles(this.files,'pdf','${cid}')">
        <div class="dzi">📄</div><div class="dzl"><strong>Clic o arrastra</strong> PDFs aquí</div>
        <div class="dzh">Fichas técnicas, presentaciones — Máx. 20MB</div>
      </div>
      <div class="fl2" id="${cid}_lpdf"></div>
    </div>
  </div>
  <div class="ups" id="${cid}_sec_kmz">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div class="upt" style="margin-bottom:0">🗺️ KMZ / KML</div>
      <button class="bs bt2" style="font-size:10px;" onclick="toggleSec('${cid}_sec_kmz_body')">+ Agregar KMZ</button>
    </div>
    <div class="fl2" id="${cid}_lkmzex"></div>
    <div id="${cid}_sec_kmz_body" style="display:none;">
      <div class="dz" id="${cid}_dzkmz" style="margin-top:8px;">
        <input type="file" accept=".kmz,.kml" multiple onchange="hFiles(this.files,'kmz','${cid}')">
        <div class="dzi">🗺️</div><div class="dzl"><strong>Clic o arrastra</strong> KMZ/KML aquí</div>
        <div class="dzh">Archivos Google Earth georreferenciados</div>
      </div>
      <div class="fl2" id="${cid}_lkmz"></div>
    </div>
  </div>
  <div class="ups">
    <div class="upt">🎥 Links de video (YouTube / Vimeo)</div>
    <div class="lar"><input class="fi2" id="${cid}_vi" placeholder="https://youtube.com/watch?v=..."><button class="labtn" onclick="addLk('v','${cid}')">+ Agregar</button></div>
    <div id="${cid}_lv"></div>
  </div>
  <div class="ups">
    <div class="upt">📍 Links de ubicación (Google Maps)</div>
    <div class="lar"><input class="fi2" id="${cid}_mi" placeholder="https://maps.google.com/..."><button class="labtn" onclick="addLk('m','${cid}')">+ Agregar</button></div>
    <div id="${cid}_lm"></div>
  </div>`;

  if(st.fotos&&st.fotos.length){renderPG(cid,st.fotos);document.getElementById(cid+'_rh').style.display='block';}
  if(st.pdfs&&st.pdfs.length){
    st.pdfs.forEach((u,i)=>addExR(cid+'_lpdfex','📄',u,()=>{st.pdfs=st.pdfs.filter((_,j)=>j!==i);buildF(cid,st);}));
    const pdfBody=document.getElementById(cid+'_sec_pdf_body');if(pdfBody)pdfBody.style.display='block';
  }
  if(st.kmz_kml&&st.kmz_kml.length){
    st.kmz_kml.forEach((u,i)=>addExR(cid+'_lkmzex','🗺️',u,()=>{st.kmz_kml=st.kmz_kml.filter((_,j)=>j!==i);buildF(cid,st);}));
    const kmzBody=document.getElementById(cid+'_sec_kmz_body');if(kmzBody)kmzBody.style.display='block';
  }
  if(st.videos&&st.videos.length)st.videos.forEach(u=>renderLk('v',u,cid));
  if(st.ubicaciones&&st.ubicaciones.length)st.ubicaciones.forEach(u=>renderLk('m',u,cid));

  ['dzf','dzpdf','dzkmz','dzv'].forEach((dzid,i)=>{
    const type=['f','pdf','kmz','v'][i];
    const dz=document.getElementById(cid+'_'+dzid);if(!dz)return;
    dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag');});
    dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
    dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');hFiles(e.dataTransfer.files,type,cid);});
  });
}
function toggleSec(id){const el=document.getElementById(id);if(el)el.style.display=el.style.display==='none'?'block':'none';}
function autoRend(cid){
  const a=parseFloat(document.getElementById(cid+'_p')?.value)||0;
  const m=parseFloat(document.getElementById(cid+'_pm')?.value)||0;
  const r=document.getElementById(cid+'_r');
  if(r)r.value=a&&m?Math.round(((m-a)/a)*100):'';
}
function sTipo(cid,v){
  const st=cid==='ef'?es:ns;
  st.tipo=v;
  document.querySelectorAll(`#${cid}_tr .tc`).forEach(c=>c.classList.toggle('on',c.dataset.v===v));
  const det=document.getElementById(cid+'_det');
  if(det)det.style.display=(v==='casa'||v==='hacienda')?'':'none';
}
function sUnidad(cid,v){
  const st=cid==='ef'?es:ns;
  st.unidad=v;st.unidad_precio=v;
  document.querySelectorAll(`#${cid}_ur .ub`).forEach(b=>b.classList.toggle('on',b.dataset.v===v));
}
function renderPG(cid,fotos){
  const g=document.getElementById(cid+'_fg');if(!g)return;
  // V5: sincroniza el preview de portada (siempre FOTO)
  const pv=document.getElementById(cid+'_preview_foto');
  if(pv){if(fotos&&fotos[0]){pv.src=fotos[0];pv.style.display='block';}else{pv.removeAttribute('src');pv.style.display='none';}}
  g.innerHTML=fotos.map((u,i)=>`<div class="pi" data-url="${u}">
    ${i===0?'<div class="pimain">PORTADA</div>':''}
    <div class="piord">${i+1}</div>
    <img src="${u}" onerror="this.src=''">
    <button class="pidel" style="top:2px;left:2px;right:auto" title="Subir" onclick="mvF('${cid}',${i},-1)">↑</button>
    <button class="pidel" style="top:2px;left:24px;right:auto" title="Bajar" onclick="mvF('${cid}',${i},1)">↓</button>
    <button class="pidel" onclick="rmEP('${u}','${cid}')">✕</button>
  </div>`).join('');
}
function rmEP(url,cid){
  const st=cid==='ef'?es:ns;
  st.fotos=st.fotos.filter(u=>u!==url);
  renderPG(cid,st.fotos);
  if(!st.fotos.length)document.getElementById(cid+'_rh').style.display='none';
}
function mvF(cid,i,dir){
  const st=cid==='ef'?es:ns;
  const j=i+dir;
  if(!st.fotos||j<0||j>=st.fotos.length)return;
  const [x]=st.fotos.splice(i,1);
  st.fotos.splice(j,0,x);
  renderPG(cid,st.fotos);
}
function hPortada(files,cid){
  const st=cid==='ef'?es:ns;
  const file=files&&files[0];if(!file)return;
  if(file.size>30*1024*1024){toast('⚠️ La portada excede 30MB');return;}
  st.portadaFile={id:Date.now()+Math.random(),file};
  const pv=document.getElementById(cid+'_preview_foto');
  if(pv){pv.src=URL.createObjectURL(file);pv.style.display='block';}
  toast('Portada lista: se subirá al guardar ✓');
}
function addExR(containerId,icon,url,onDel){
  const name=url.split('/').pop().split('?')[0];
  const div=document.createElement('div');div.className='fir';
  div.innerHTML=`<span class="fii">${icon}</span><span class="fin">${name}</span><span class="badge bg2" style="font-size:10px">Guardado</span>`;
  const btn=document.createElement('button');btn.className='fdel';btn.textContent='✕';
  btn.onclick=onDel;div.appendChild(btn);
  document.getElementById(containerId).appendChild(div);
}
function hFiles(files,type,cid){
  const st=cid==='ef'?es:ns;
  const icons={f:'🖼️',pdf:'📄',kmz:'🗺️',v:'🎥'};
  const key=type==='f'?'fn':type==='pdf'?'pn':type==='v'?'vn':'kn';
  if(type==='f'&&(st.fotos||[]).length+(st.fn||[]).length+Array.from(files).length>10){toast('⚠️ Máximo 10 fotos en la galería');return;}
  Array.from(files).forEach(file=>{
    const id=Date.now()+Math.random();
    st[key]=[...(st[key]||[]),{id,file}];
    if(type==='f'){
      const r=new FileReader();
      r.onload=e=>{
        const g=document.getElementById(cid+'_fg');if(!g)return;
        const d=document.createElement('div');d.className='pi';d.id='np'+id;
        d.innerHTML=`<img src="${e.target.result}"><div class="piord">N</div><button class="pidel" onclick="rmNF('f','${id}','${cid}')">✕</button>`;
        g.appendChild(d);
      };r.readAsDataURL(file);
    }
    if(type==='v'){const pv=document.getElementById(cid+'_preview_video');if(pv){try{pv.src=URL.createObjectURL(file);pv.style.display='block';}catch{}}}
    const sz=(file.size/1024/1024).toFixed(1)+'MB';
    const li=document.getElementById(cid+'_l'+(type==='f'?'f':type==='v'?'vf':type));if(!li)return;
    const row=document.createElement('div');row.className='fir';row.id='fi'+id;
    row.innerHTML=`<span class="fii">${icons[type]}</span><span class="fin">${file.name}</span><span class="fis2">${sz}</span><span class="fist" id="fs${id}">⏳</span><button class="fdel" onclick="rmNF('${type}','${id}','${cid}')">✕</button>`;
    li.appendChild(row);
  });
}
function rmNF(type,id,cid){
  const st=cid==='ef'?es:ns;
  const k=type==='f'?'fn':type==='pdf'?'pn':type==='v'?'vn':'kn';
  if(st[k])st[k]=st[k].filter(f=>String(f.id)!==String(id));
  document.getElementById('fi'+id)?.remove();
  document.getElementById('np'+id)?.remove();
}
function addLk(type,cid){
  const st=cid==='ef'?es:ns;
  const inp=document.getElementById(cid+'_'+(type==='v'?'vi':'mi'));
  const url=inp?.value.trim();if(!url)return;
  const k=type==='v'?'videos':'ubicaciones';
  if(!st[k])st[k]=[];
  if(!st[k].includes(url)){st[k].push(url);renderLk(type,url,cid);}
  inp.value='';toast('Link agregado ✓');
}
function renderLk(type,url,cid){
  const icon=type==='v'?'🎥':'📍';
  const item=document.createElement('div');item.className='lirow';
  item.innerHTML=`<span class="liic">${icon}</span><span class="liurl">${url}</span><button class="lide" onclick="rmLk('${type}','${encodeURIComponent(url)}','${cid}',this.parentElement)">✕</button>`;
  document.getElementById(cid+'_l'+(type==='v'?'v':'m'))?.appendChild(item);
}
function rmLk(type,eu,cid,el){
  const st=cid==='ef'?es:ns;
  const k=type==='v'?'videos':'ubicaciones';
  if(st[k])st[k]=st[k].filter(u=>u!==decodeURIComponent(eu));
  el.remove();
}
function gFD(cid,st){
  const detalles={};
  const detEl=document.getElementById(cid+'_det');
  if(detEl&&detEl.style.display!=='none'){
    detalles.recamaras=parseInt(document.getElementById(cid+'_rec')?.value)||null;
    detalles.banos=parseInt(document.getElementById(cid+'_ban')?.value)||null;
  }
  return{
    titulo:document.getElementById(cid+'_t')?.value.trim()||'',
    tipo:st.tipo||'terreno',
    municipio:document.getElementById(cid+'_m')?.value.trim()||'',
    superficie:parseFloat(document.getElementById(cid+'_sup')?.value)||null,
    unidad_superficie:document.getElementById(cid+'_usup')?.value||'m²',
    precio_actual:parseFloat(document.getElementById(cid+'_p')?.value)||0,
    precio_mercado:parseFloat(document.getElementById(cid+'_pm')?.value)||null,
    unidad_precio:st.unidad||st.unidad_precio||'m²',
    rendimiento:parseFloat(document.getElementById(cid+'_r')?.value)||null,
    descripcion:document.getElementById(cid+'_d')?.value.trim()||'',
    estado:document.getElementById(cid+'_act')?.value||'activa',
    destacada:document.getElementById(cid+'_dest')?.checked||false,
    certeza_legal:document.getElementById(cid+'_cl')?.checked!==false,
    detalles:Object.keys(detalles).length?detalles:null,
    videos:st.videos||[],ubicaciones:st.ubicaciones||[],
  };
}

/* ── COMPRESIÓN DE FOTOS ── */
// Si la imagen >1MB, redimensiona a max 1920px y calidad 0.7 usando canvas
// Si falla la compresión, sube original
const MAX_MB=30, COMPRESS_THRESHOLD=1*1024*1024, MAX_DIM=1920, JPEG_Q=0.7;
function compressImage(file){
  return new Promise((res,rej)=>{
    if(file.size>MAX_MB*1024*1024){rej(new Error(`Imagen excede ${MAX_MB}MB`));return;}
    // Si la imagen es <=1MB, no comprimir
    if(file.size<=COMPRESS_THRESHOLD){res(file);return;}
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      let{width:w,height:h}=img;
      if(w>MAX_DIM||h>MAX_DIM){const r=Math.min(MAX_DIM/w,MAX_DIM/h);w=Math.round(w*r);h=Math.round(h*r);}
      const cv=document.createElement('canvas');cv.width=w;cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      cv.toBlob(b=>{b?res(b):rej(new Error('Error compresión'));}, 'image/jpeg', JPEG_Q);
    };
    img.onerror=()=>rej(new Error('Error leyendo imagen'));
    img.src=url;
  });
}
async function uploadAll(st){
  let fu=[...(st.fotos||[])],pu=[...(st.pdfs||[])],ku=[...(st.kmz_kml||[])],vu=[];
  let pou=null;
  if(st.portadaFile){
    try{
      const f=st.portadaFile;
      const ext=(f.file.name.split('.').pop()||'jpg').toLowerCase();
      const path=`imagenes/portada-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const{error}=await db.storage.from('eyesite-media').upload(path,f.file,{contentType:f.file.type||'image/jpeg'});
      if(!error){const{data:pub}=db.storage.from('eyesite-media').getPublicUrl(path);pou=pub.publicUrl;}
      else{toast('⚠️ Portada: '+error.message+(error.code?' ['+error.code+']':''));console.error('[uploadAll] portada ERROR REAL:',error);}
    }catch(e){console.error('[uploadAll] portada ERROR:',e);}
  }
  const imgExts=['jpg','jpeg','png','gif','bmp','tiff','webp'];
  const totalFiles=(st.fn||[]).length+(st.pn||[]).length+(st.kn||[]).length+(st.vn||[]).length;
  let uploaded=0;
  const updateProgress=()=>{
    const pct=totalFiles?Math.round((uploaded/totalFiles)*100):0;
    const pg=document.getElementById('nprog'),pf=document.getElementById('nprogf'),pl=document.getElementById('nprogl');
    if(pg&&pg.style.display!=='none'){
      if(pf)pf.style.width=Math.min(30+pct*0.5,80)+'%';
      if(pl)pl.textContent=`Subiendo archivos... ${pct}%`;
    }
  };
  for(const f of(st.fn||[])){
    try{
      const se=document.getElementById('fs'+f.id);
      if(se)se.textContent='🔄';
      let blob=f.file,ext=f.file.name.split('.').pop().toLowerCase(),ct=f.file.type;
      if(imgExts.includes(ext)){
        try{
          blob=await compressImage(f.file);
          const saved=Math.round((1-blob.size/f.file.size)*100);
          if(blob!==f.file){ext='jpg';ct='image/jpeg';}
          if(se)se.textContent=saved>0?`⚡-${saved}%`:'✅';
        }catch(ce){if(se)se.textContent='⚡orig';}
      }
      const path=`imagenes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const{error}=await db.storage.from('eyesite-media').upload(path,blob,{contentType:ct,upsert:false});
      if(!error){const{data:pub}=db.storage.from('eyesite-media').getPublicUrl(path);fu.push(pub.publicUrl);if(se)se.textContent='✅';}
      else{if(se)se.textContent='❌';}
    }catch(e){try{document.getElementById('fs'+f.id).textContent=e.message.includes('excede')?'⚠️+30MB':'❌';}catch{}}
    uploaded++;updateProgress();
  }
  for(const f of(st.pn||[])){
    try{
      const path=`pdfs/${Date.now()}-${f.file.name}`;
      const{error}=await db.storage.from('eyesite-media').upload(path,f.file,{contentType:'application/pdf'});
      if(!error){const{data:pub}=db.storage.from('eyesite-media').getPublicUrl(path);pu.push(pub.publicUrl);try{document.getElementById('fs'+f.id).textContent='✅';}catch{}}
    }catch{}
    uploaded++;updateProgress();
  }
  for(const f of(st.kn||[])){
    try{
      const path=`kmz/${Date.now()}-${f.file.name}`;
      const{error}=await db.storage.from('eyesite-media').upload(path,f.file);
      if(!error){const{data:pub}=db.storage.from('eyesite-media').getPublicUrl(path);ku.push(pub.publicUrl);try{document.getElementById('fs'+f.id).textContent='✅';}catch{}}
    }catch{}
    uploaded++;updateProgress();
  }
  for(const f of(st.vn||[])){
    try{
      const path=`videos/${Date.now()}-${f.file.name}`;
      const{error}=await db.storage.from('eyesite-media').upload(path,f.file,{contentType:f.file.type||'video/mp4'});
      if(!error){const{data:pub}=db.storage.from('eyesite-media').getPublicUrl(path);vu.push(pub.publicUrl);try{document.getElementById('fs'+f.id).textContent='✅';}catch{}}
    }catch{}
    uploaded++;updateProgress();
  }
  return{fu,pu,ku,vu,pou};
}

/* ── GUARDAR NUEVA ── */
async function saveNew(){
  const d=gFD('nf',ns);
  if(!d.titulo){toast('⚠️ El título es obligatorio');return;}
  if(!d.municipio){toast('⚠️ El municipio es obligatorio');return;}
  if(!d.precio_actual){toast('⚠️ El precio actual es obligatorio');return;}
  const btn=document.getElementById('nbtn');btn.disabled=true;btn.textContent='⏳ Guardando...';
  const pg=document.getElementById('nprog'),pf=document.getElementById('nprogf'),pl=document.getElementById('nprogl');
  pg.style.display='block';pl.textContent='Subiendo archivos... 0%';pf.style.width='5%';
  const{fu,pu,ku,vu,pou}=await uploadAll(ns);
  // V6.3: portada SIEMPRE es FOTO. Si se reemplazó, la nueva va en [0] y la vieja sale de la galería.
  const oldPortada=ns.fotos&&ns.fotos[0];
  const fotosArray=pou?[pou,...fu.filter(u=>u!==oldPortada)]:fu;
  const currentPortadaUrl=pou||fotosArray[0]||null;
  const currentVideoUrl=vu[0]||document.getElementById('nf_video_url')?.value?.trim()||null;
  const allVideos=currentVideoUrl?Array.from(new Set([...(ns.videos||[]),currentVideoUrl])):(ns.videos||[]);
  pf.style.width='80%';pl.textContent='Guardando en base de datos...';
  const{error}=await db.from('propiedades').insert({...d,fotos:fotosArray,pdfs:pu,kmz_kml:ku,estado:'activa',destacada:true,certeza_legal:true,precio_esperado:d.precio_actual,tipo_portada:currentVideoUrl?'video':'foto',portada_url:currentPortadaUrl,video_url:currentVideoUrl,videos:allVideos});
  pf.style.width='100%';
  if(error){toast('❌ Error: '+error.message+(error.code?' ['+error.code+']':'')+(error.details?' — '+error.details:''));console.error('[saveNew] ERROR REAL:',error);}
  else{
    toast('✅ Propiedad publicada y visible en la app');
    resetNew();
    await loadAll();
    setTimeout(()=>goTo('propiedades'),1000);
  }
  btn.disabled=false;btn.textContent='💾 PUBLICAR PROPIEDAD';
  setTimeout(()=>{pg.style.display='none';pf.style.width='0%';},2000);
}
function resetNew(){ns=nS();buildF('nf',ns);}

/* ── EDITAR ── */
function openEdit(id){
  const p=props.find(x=>x.id===id);if(!p)return;
  editId=id;
  es={...p,tipo:p.tipo||'terreno',unidad:p.unidad_precio||'m²',unidad_precio:p.unidad_precio||'m²',
    videos:p.videos||[],ubicaciones:p.ubicaciones||[],
    fotos:p.fotos||[],pdfs:p.pdfs||[],kmz_kml:p.kmz_kml||[],vn:[],portadaFile:null,
    detalles:p.detalles||{},
    fn:[],pn:[],kn:[]};
  document.getElementById('emsub').textContent=p.titulo;
  buildF('ef',es);
  document.getElementById('emod').classList.add('on');
}
async function saveEdit(){
  if(!editId){toast('❌ No hay propiedad seleccionada');return;}
  const d=gFD('ef',es);
  if(!d.titulo){toast('⚠️ El título es obligatorio');return;}
  if(!d.municipio){toast('⚠️ El municipio es obligatorio');return;}
  if(!d.precio_actual){toast('⚠️ El precio actual es obligatorio');return;}
  const btn=document.getElementById('esb');
  btn.disabled=true;btn.textContent='⏳ Guardando...';
  try{
    const{fu,pu,ku,vu,pou}=await uploadAll(es);
    // V6.3: editar agregando video NUNCA borra la foto (portada siempre = FOTO).
    const oldPortada=es.fotos&&es.fotos[0];
    const fotosArray=pou?[pou,...fu.filter(u=>u!==oldPortada)]:fu;
    const currentPortadaUrl=pou||fotosArray[0]||null;
    const currentVideoUrl=vu[0]||document.getElementById('ef_video_url')?.value?.trim()||null;
    const allVideos=currentVideoUrl?Array.from(new Set([...(es.videos||[]),currentVideoUrl])):(es.videos||[]);
    const updates={...d,fotos:fotosArray,pdfs:pu,kmz_kml:ku,tipo_portada:currentVideoUrl?'video':'foto',portada_url:currentPortadaUrl,video_url:currentVideoUrl,videos:allVideos};
    const{error}=await db.from('propiedades').update(updates).eq('id',editId).select();
    if(error){
      console.error('[saveEdit] ERROR REAL:',error);
      toast('❌ Error al guardar: '+error.message+(error.code?' ['+error.code+']':'')+(error.details?' — '+error.details:''));
    }else{
      const idx=props.findIndex(x=>x.id===editId);
      if(idx>=0)props[idx]={...props[idx],...updates,id:editId};
      renderProps(props);renderDash();
      toast('✅ Cambios guardados y sincronizados');
      closeMod('emod');
    }
  }catch(err){
    toast('❌ Error inesperado: '+err.message);
  }
  btn.disabled=false;btn.textContent='💾 Guardar todos los cambios';
}

/* ── ACCIONES ── */
async function ocultarPropiedad(id){
  const{error}=await db.from('propiedades').update({estado:'oculta'}).eq('id',id);
  if(error){toast('❌ Error: '+error.message);return;}
  const p=props.find(x=>x.id===id);if(p)p.estado='oculta';
  renderProps(props);renderDash();
  toast('🙈 Ocultada — invisible en la app');
}
async function activarPropiedad(id){
  const{error}=await db.from('propiedades').update({estado:'activa',destacada:true}).eq('id',id);
  if(error){toast('❌ Error: '+error.message);return;}
  const p=props.find(x=>x.id===id);if(p){p.estado='activa';p.destacada=true;}
  renderProps(props);renderDash();
  toast('👁 Activa — visible en la app');
}
function editarPropiedad(id){
  openEdit(id);
}
function confDel(id,title){
  document.getElementById('ctit').textContent='¿Eliminar propiedad?';
  document.getElementById('csub').textContent='"'+title+'" — Esta acción no se puede deshacer.';
  document.getElementById('cok').onclick=async()=>{
    const{error}=await db.from('propiedades').delete().eq('id',id);
    if(error){toast('❌ Error: '+error.message);}
    else{toast('🗑️ Propiedad eliminada');await loadAll();}
    closeCon();
  };
  document.getElementById('cov').classList.add('on');
}

/* ── NAVEGACIÓN ── */
const PAGES={dashboard:{t:'Dashboard',s:'Resumen general'},propiedades:{t:'Propiedades',s:'Gestiona y edita todas tus propiedades'},pendientes:{t:'Por aprobar',s:'Propiedades enviadas por usuarios'},nueva:{t:'Nueva propiedad',s:'Publica una nueva oportunidad con todos sus archivos'},usuarios:{t:'Usuarios',s:'Gestiona los usuarios de la plataforma'}};
function goTo(p){
  document.querySelectorAll('.sec').forEach(s=>s.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
  document.getElementById('sec-'+p).classList.add('on');
  document.querySelector(`.ni[data-s="${p}"]`).classList.add('on');
  document.getElementById('tbt').textContent=PAGES[p].t;
  document.getElementById('tbs').textContent=PAGES[p].s;
}
document.getElementById('nav').addEventListener('click',e=>{
  const ni=e.target.closest('.ni');if(ni&&ni.dataset.s)goTo(ni.dataset.s);
});

/* ── MODALES ── */
function closeMod(id){
  const el=document.getElementById(id);
  if(el)el.classList.remove('on');
  if(id==='emod'){editId=null;es=null;}
  if(id==='vmod'){viewId=null;}
}
function closeCon(){document.getElementById('cov').classList.remove('on');}
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('on');
  clearTimeout(t._tm);
  t._tm=setTimeout(()=>t.classList.remove('on'),3200);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMod('emod');closeMod('vmod');closeCon();}});
['emod','vmod'].forEach(id=>{
  document.getElementById(id).addEventListener('click',e=>{if(e.target===document.getElementById(id))closeMod(id);});
});