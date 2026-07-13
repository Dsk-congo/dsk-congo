
import {initDefaults,getSite,listDocs,addItem,listenDocs,contactHTML,galleryBlock,fileLinks,cards,esc,normalizePost,listSections} from "./shared.js";
let site={};

function dskInitials(nom="",prenom=""){
  const n=String(nom||"").trim().charAt(0).toUpperCase() || "X";
  const p=String(prenom||"").trim().charAt(0).toUpperCase() || "X";
  return (n+p).replace(/[^A-Z]/g,"X");
}
function dskYearMonth(){
  const d=new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}`;
}
function dskRandom6(){
  return String(Math.floor(100000+Math.random()*900000));
}
function generateSecureMemberId(nom,prenom){
  return `DSK-M-${dskYearMonth()}-${dskRandom6()}-${dskInitials(nom,prenom)}`;
}
const el=id=>document.getElementById(id);const wrap=h=>{el("app").innerHTML=h;scrollTo(0,0)}

function cleanKeyPublic(v){return String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
function sameKeyPublic(a,b){return cleanKeyPublic(a)===cleanKeyPublic(b);}
function splitFullNamePublic(fullname=""){const p=String(fullname||"").trim().split(/\s+/).filter(Boolean);return {nom:p[0]||"",postnom:p.length>=3?p[1]:"",prenom:p.length>=2?p[p.length-1]:""};}
function identityAdminPublic(a){const p=splitFullNamePublic(a.fullname||"");return {nom:a.nom||p.nom,postnom:a.postnom||p.postnom,prenom:a.prenom||p.prenom,telephone:a.telephone||""};}
function identityEqualPublic(a,b){return sameKeyPublic(a.nom,b.nom)&&sameKeyPublic(a.postnom||a.postNom,b.postnom||b.postNom)&&sameKeyPublic(a.prenom,b.prenom);}


function phoneClean(v){ return String(v||"").replace(/\s+/g,"").replace("+",""); }
function phoneTel(v){ return String(v||"").replace(/\s+/g,""); }
function renderFloatingActions(){
  const box=document.getElementById("floatingActions");
  if(!box) return;
  const whatsapp=phoneClean(site.whatsapp||site.phone||"");
  const tel=phoneTel(site.phone||site.whatsapp||"");
  const email=site.email||"";
  box.innerHTML=`
    ${whatsapp?`<a class="float-btn whatsapp" href="https://wa.me/${whatsapp}" target="_blank" title="WhatsApp">☘</a>`:""}
    ${tel?`<a class="float-btn call" href="tel:${tel}" title="Appeler">☎</a>`:""}
    ${email?`<a class="float-btn email" href="mailto:${email}" title="Email">✉</a>`:""}
  `;
}
function galleryUrls(){
  return String(site.homeGallery||"").split(/[\n,]+/).map(x=>x.trim()).filter(Boolean);
}
function homeGalleryHTML(){
  const imgs=galleryUrls();
  if(!imgs.length) return "";
  return `<section class="section home-gallery-section"><div class="container">
    <h2 class="title">Galerie photos</h2>
    <div class="home-gallery-slider" id="homeGallerySlider">
      ${imgs.map((u,i)=>`<img class="${i===0?'active':''}" src="${u}" alt="Galerie DSK">`).join("")}
    </div>
  </div></section>`;
}
async function newsSliderHTML(){
  try{
    const items=(await listDocs("news")).map(normalizePost).filter(x=>(x.imageUrls||[]).length).slice(0,8);
    if(!items.length) return "";
    return `<section class="section news-slider-section"><div class="container">
      <h2 class="title">Actualités en images</h2>
      <div class="news-auto-slider" id="newsAutoSlider">
        ${items.map((x,i)=>`<div class="news-slide ${i===0?'active':''}" onclick="showDetail('news','${x.docId}')">
          <img src="${x.imageUrls[0]}" alt="">
          <div><span>Actualité</span><h3>${esc(x.title||"")}</h3><p>${esc((x.content||"").slice(0,120))}...</p></div>
        </div>`).join("")}
      </div>
    </div></section>`;
  }catch(e){ return ""; }
}
function startSliders(){
  const rotate=(selector,itemSelector)=>{
    const root=document.querySelector(selector);
    if(!root) return;
    const items=[...root.querySelectorAll(itemSelector)];
    if(items.length<2) return;
    let i=0;
    setInterval(()=>{
      items[i].classList.remove("active");
      i=(i+1)%items.length;
      items[i].classList.add("active");
    },4500);
  };
  rotate("#homeGallerySlider","img");
  rotate("#newsAutoSlider",".news-slide");
}

async function load(){await initDefaults();site=await getSite();topText.innerHTML=site.topText;partyName.textContent=site.partyName;partySlogan.textContent=site.slogan;footerName.textContent=site.partyName;footerDescription.textContent=site.footer;footerContact.innerHTML=contactHTML(site);if(site.logoUrl)document.querySelector(".logo").innerHTML=`<img src="${site.logoUrl}">`;renderFloatingActions()}
window.toggleMobileMenu=()=>{document.getElementById('mainMenu')?.classList.toggle('open')};
window.showPage=p=>{document.getElementById('mainMenu')?.classList.remove('open');if(p!=="communications")sessionStorage.removeItem("dsk_member");location.hash=p;render()};window.showDetail=(t,id)=>{location.hash=`detail/${t}/${id}`;render()};window.openImage=u=>{modalImg.src=u;imgModal.style.display="flex"}
function postCard(x,t){x=normalizePost(x);return `<article class="card media" onclick="showDetail('${t}','${x.docId}')" style="cursor:pointer">${galleryBlock(x)}<div class=media-body><span class=badge>${esc(x.category||"Publication")}</span><h3>${esc(x.title||"")}</h3><p>${esc((x.content||"").slice(0,150))}...</p><button class="btn light small">Lire plus</button></div></article>`}

async function home(){
  let bg=site.heroBgUrl?`style="background:linear-gradient(120deg,rgba(4,23,53,.78),rgba(11,74,162,.70)),url('${site.heroBgUrl}') center/cover no-repeat"`:"";
  const newsSlider=await newsSliderHTML();
  wrap(`<section class=hero ${bg}><div class="container hero-content">
    <span class=kicker>● Plateforme officielle</span>
    <h1>${esc(site.heroTitle)}</h1>
    <p>${esc(site.heroSubtitle)}</p>
    <button class="btn gold" onclick="showPage('adhesion')">Devenir membre</button>
    <button class="btn light" onclick="showPage('communications')">Espace membre</button>
  </div></section>
  ${homeGalleryHTML()}
  ${newsSlider}
  <section class=section><div class=container>
    <h2 class=title>Nos priorités</h2>
    <div class="grid g3">${cards(site.priorities).map(c=>`<div class=card><div class=icon>${c.i}</div><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p></div>`).join("")}</div>
  </div></section>`);
  startSliders();
}


function about(){
  const fb=site.facebookUrl||site.facebook||"#";
  const ig=site.instagramUrl||site.instagram||"#";
  const tk=site.tiktokUrl||site.tiktok||"#";
  const yt=site.youtubeUrl||site.youtube||"#";
  const xu=site.xUrl||site.twitterUrl||site.x||"#";
  wrap(`<section class=section><div class=container>
    <h1 class=title>À propos de Dynamik Simplice KUMBUNGE</h1>
    <p class=sub>${esc(site.aboutExtra||"")}</p>
    <div class="grid g2">
      <div class=card><h3>Notre Vision</h3><p>${esc(site.vision||"")}</p></div>
      <div class=card><h3>Notre Mission</h3><p>${esc(site.mission||"")}</p></div>
    </div>
    <div class=card style="margin-top:24px"><h3>Organisation</h3><p>${esc(site.organization||"")}</p></div>
    <br>
    <div class="grid g3">${cards(site.aboutCards||"").map(c=>`<div class=card><div class=icon>${c.i}</div><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p></div>`).join("")}</div>
    <br>
    <div class="card about-social-card">
      <h2>Suivez-nous sur les réseaux sociaux</h2>
      <div class="social-links">
        <a href="${fb}" target="_blank" rel="noopener" aria-label="Facebook"><span class="social-icon facebook"><svg viewBox="0 0 24 24"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06z"/></svg></span><p>Facebook</p></a>
        <a href="${ig}" target="_blank" rel="noopener" aria-label="Instagram"><span class="social-icon instagram"><svg viewBox="0 0 24 24"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A4.5 4.5 0 1 1 12 16.5 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17.7 6.3a1 1 0 1 1-1 1 1 1 0 0 1 1-1z"/></svg></span><p>Instagram</p></a>
        <a href="${tk}" target="_blank" rel="noopener" aria-label="TikTok"><span class="social-icon tiktok"><svg viewBox="0 0 24 24"><path d="M16.6 5.82c1.16.84 2.58 1.33 4.1 1.33v3.05c-1.46 0-2.82-.34-4.02-1v5.86c0 3.78-3.07 6.85-6.85 6.85S3 18.84 3 15.06s3.05-6.85 6.83-6.85c.57 0 1.13.07 1.66.2v3.24a3.62 3.62 0 0 0-1.66-.4 3.81 3.81 0 1 0 3.81 3.81V2h2.96c.21 1.5.91 2.83 2 3.82z"/></svg></span><p>TikTok</p></a>
        <a href="${yt}" target="_blank" rel="noopener" aria-label="YouTube"><span class="social-icon youtube"><svg viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z"/></svg></span><p>YouTube</p></a>
        <a href="${xu}" target="_blank" rel="noopener" aria-label="X"><span class="social-icon xicon"><svg viewBox="0 0 24 24"><path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.4L2.8 2h6.5l4.4 5.9L18.9 2zm-1.1 17.8h1.7L8.4 4.1H6.6l11.2 15.7z"/></svg></span><p>X</p></a>
      </div>
    </div>
    <div class="join-section"><button class="btn gold join-btn" onclick="showPage('adhesion')">Rejoindre DSK Congo</button></div>
  </div></section>`)
}

async function news(){let a=await listDocs("news");wrap(`<section class=section><div class=container><h1 class=title>Actualités</h1><p>${esc(site.newsIntro)}</p><div class="grid g3">${a.map(x=>postCard(x,"news")).join("")||"<div class=card>Aucune actualité</div>"}</div></div></section>`)}
async function program(){let a=await listDocs("programs");wrap(`<section class=section><div class=container><h1 class=title>Programme</h1><p>${esc(site.programIntro)}</p><div class="grid g3">${a.map(x=>postCard(x,"programs")).join("")||"<div class=card>Aucun programme</div>"}</div></div></section>`)}
async function detail(t,id){let a=await listDocs(t),x=normalizePost(a.find(i=>i.docId===id)||{});wrap(`<section class=section><div class=container><button class="btn light" onclick="showPage('${t==="news"?"news":"program"}')">← Retour</button><br><br><div class="card detail-hero"><h1 class=title>${esc(x.title||"")}</h1><p style="white-space:pre-line">${esc(x.content||"")}</p>${fileLinks(x)}</div><br>${x.imageUrls?.length?`<div class=detail-gallery>${x.imageUrls.map(u=>`<img src="${u}" onclick="openImage('${u}')">`).join("")}</div>`:""}</div></section>`)}


function fileToDataUrlPublic(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=reject;
    r.readAsDataURL(file);
  });
}
async function readPublicFileOrUrl(name){
  const el=document.querySelector(`[name="${name}File"]`);
  if(el && el.files && el.files[0]) return await fileToDataUrlPublic(el.files[0]);
  return (document.querySelector(`[name="${name}"]`)?.value||"").trim();
}

async function adhesion(){
  let secs=await listSections();
  wrap(`<section class=section><div class=container>
    <h1 class=title>Fiche d’adhésion DSK Congo</h1>
    <p class=sub>${esc(site.adhesionIntro||"Remplissez tous les champs nécessaires pour votre adhésion.")}</p>

    <div class=card>
      <form id=f autocomplete=off>
        <h2>Identification</h2>
        <div class=row>
          <div><label>Nom *</label><input name=nom required></div>
          <div><label>Post-nom *</label><input name=postnom required></div>
          <div><label>Prénom *</label><input name=prenom required></div>
          <div><label>Lieu de naissance</label><input name=lieuNaissance></div>
          <div><label>Date de naissance</label><input name=dateNaissance type=date></div>
          <div><label>Sexe</label><select name=sexe><option value="">Sélectionner</option><option>Masculin</option><option>Féminin</option></select></div>
          <div><label>Contact / Téléphone *</label><input name=telephone required></div>
          <div><label>E-mail</label><input name=email type=email></div>
          <div><label>Photo membre</label><input name=photoUrl placeholder="Lien image/photo du membre"><input type=file name=photoUrlFile accept="image/*" class=fileInput><small>Vous pouvez parcourir sur votre téléphone/PC ou coller un lien.</small></div>
        </div>

        <h2>Coordonnées géographiques</h2>
        <div class=row>
          <div><label>Nationalité</label><input name=nationalite value="Congolaise"></div>
          <div><label>Province</label><input name=province></div>
          <div><label>Territoire</label><input name=territoire></div>
          <div><label>Ville</label><input name=ville></div>
          <div><label>Commune / Quartier</label><input name=commune></div>
          <div><label>Adresse</label><input name=adresse></div>
        </div>

        <h2>Qualité du membre</h2>
        <div class=row>
          <div><label>Appartenance politique antérieure</label><input name=appartenance></div>
          <div><label>Période d’appartenance</label><input name=periode></div>
          <div><label>Circonscription électorale</label><input name=circonscription></div>
          <div><label>Qualité du membre</label><select name=qualite><option>Membre sympathisant</option><option>Membre effectif</option><option>Membre d’honneur</option></select></div>
        </div>

        <h2>Enregistrement</h2>
        <div class=row>
          <div><label>Section *</label><select name=sectionId required>${secs.map(s=>`<option value="${s.docId}">${esc(s.name)}</option>`).join("")}</select></div>
          <div><label>Fonction / Titre</label><input name=fonction></div>
          <div><label>Mot de passe *</label><input name=password type=password required autocomplete=new-password></div>
        </div>

        <br>
        <button class=btn>Envoyer l’adhésion</button>
      </form>
    </div>
  </div></section>`);

  f.onsubmit=async e=>{
    e.preventDefault();
    let fd=new FormData(f),sec=secs.find(s=>s.docId===fd.get("sectionId"));
    let id=generateSecureMemberId(fd.get("nom"),fd.get("prenom"));

    const allMembers=await listDocs("members");
    const allAdmins=await listDocs("admins");
    const identity={nom:fd.get("nom"),postnom:fd.get("postnom"),prenom:fd.get("prenom"),telephone:fd.get("telephone")};
    if(typeof identityEqualPublic==="function" && allMembers.some(x=>identityEqualPublic(x,identity))) return alert("Ce membre existe déjà avec le même nom, post-nom et prénom.");
    if(typeof identityAdminPublic==="function" && typeof identityEqualPublic==="function" && allAdmins.some(x=>identityEqualPublic(identityAdminPublic(x),identity))) return alert("Un admin existe déjà avec le même nom, post-nom et prénom.");
    if(typeof sameKeyPublic==="function" && allMembers.some(x=>sameKeyPublic(x.telephone,fd.get("telephone")))) return alert("Ce numéro de téléphone est déjà utilisé par un membre.");
    if(typeof sameKeyPublic==="function" && allAdmins.some(x=>sameKeyPublic(x.telephone,fd.get("telephone")))) return alert("Ce numéro de téléphone est déjà utilisé par un admin.");

    await addItem("members",{
      memberId:id,
      nom:fd.get("nom"),
      postnom:fd.get("postnom"),
      prenom:fd.get("prenom"),
      lieuNaissance:fd.get("lieuNaissance"),
      dateNaissance:fd.get("dateNaissance"),
      sexe:fd.get("sexe"),
      telephone:fd.get("telephone"),
      email:fd.get("email"),
      photoUrl:await readPublicFileOrUrl("photoUrl"),
      nationalite:fd.get("nationalite"),
      province:fd.get("province"),
      territoire:fd.get("territoire"),
      ville:fd.get("ville"),
      commune:fd.get("commune"),
      quartier:fd.get("commune"),
      adresse:fd.get("adresse"),
      appartenance:fd.get("appartenance"),
      periode:fd.get("periode"),
      circonscription:fd.get("circonscription"),
      qualite:fd.get("qualite"),
      fonction:fd.get("fonction"),
      password:fd.get("password"),
      sectionId:fd.get("sectionId"),
      sectionName:sec?.name||"",
      status:"pending",
      isDisabled:false,
      date:new Date().toLocaleString()
    });
    alert("Adhésion envoyée. Votre ID : "+id);
    f.reset();
  }
}

async function communications(){let m=JSON.parse(sessionStorage.getItem("dsk_member")||"null");if(!m){wrap(`<section class=section><div class=container><h1 class=title>Communications membres</h1><div class=card style="max-width:560px"><label>ID membre</label><input id=mId><label>Mot de passe</label><input id=mPass type=password><br><br><button class=btn id=loginM>Connexion</button></div></div></section>`);loginM.onclick=async()=>{let members=await listDocs("members"),u=members.find(x=>x.memberId===mId.value.trim()&&x.password===mPass.value.trim());if(!u)return alert("Identifiants incorrects");if(u.isDisabled)return alert("Compte suspendu");if(u.status!=="approved")return alert("Adhésion non approuvée");sessionStorage.setItem("dsk_member",JSON.stringify(u));communications()};return}wrap(`<section class=section><div class=container><h1 class=title>Communication — ${esc(m.sectionName)}</h1><div class=card>${esc(m.nom)} ${esc(m.prenom)} — ${esc(m.memberId)} <button class="btn red small" onclick="sessionStorage.removeItem('dsk_member');showPage('communications')">Déconnexion</button></div><br><div class=grid g2><div><h2>Communiqués</h2><div id=commList></div></div><div><h2>Chat section</h2><div class=chat-box id=chatBox></div><div class=card><textarea id=chatMsg></textarea><button class="btn green" id=sendMsg>Envoyer</button></div></div></div></div></section>`);listenDocs("communications",items=>{let v=items.filter(x=>x.target==="allMembers"||x.sectionId===m.sectionId);commList.innerHTML=v.reverse().map(x=>postCard(x,"communications")).join("")||"<div class=card>Aucun communiqué</div>"});listenDocs("memberChats",items=>{let v=items.filter(c=>c.sectionId===m.sectionId);chatBox.innerHTML=v.map(c=>`<div class="chat-msg ${c.memberId===m.memberId?'mine':''}"><div class=chat-meta>${esc(c.author)} • ${esc(c.date)}</div>${esc(c.message)}</div>`).join("");chatBox.scrollTop=chatBox.scrollHeight});sendMsg.onclick=async()=>{if(!chatMsg.value.trim())return;await addItem("memberChats",{author:`${m.nom} ${m.prenom}`,memberId:m.memberId,sectionId:m.sectionId,message:chatMsg.value,date:new Date().toLocaleString()});chatMsg.value=""}}
function reviews(){wrap(`<section class=section><div class=container><h1 class=title>Avis</h1><div class=card><form id=f><input name=name placeholder=Nom required><textarea name=message placeholder=Message required></textarea><button class=btn>Envoyer</button></form></div></div></section>`);f.onsubmit=async e=>{e.preventDefault();let fd=new FormData(f);await addItem("reviews",{name:fd.get("name"),message:fd.get("message"),date:new Date().toLocaleString()});alert("Envoyé");f.reset()}}

function contact(){
  const map=site.mapEmbedUrl||"";
  wrap(`<section class=section><div class=container>
    <h1 class=title>Contact</h1>
    <div class="grid g2">
      <div class=card>
        <h2>Coordonnées</h2>
        <p>${contactHTML(site)}</p>
        <div class="contact-buttons">
          <a class="btn green" target="_blank" href="https://wa.me/${phoneClean(site.whatsapp||site.phone||"")}">WhatsApp</a>
          <a class="btn blue" href="tel:${phoneTel(site.phone||site.whatsapp||"")}">Appeler</a>
          <a class="btn" href="mailto:${site.email||""}">Email</a>
        </div>
      </div>
      <div class=card>
        <h2>Localisation</h2>
        ${map?`<iframe class="map-frame" src="${map}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`:`<p>Carte non configurée.</p>`}
      </div>
    </div>
  </div></section>`)
}





async function verifyMember(memberId){
  try{
    let members=await listDocs("members");
    let m=members.find(x=>(x.memberId||x.docId)===memberId);
    if(!m){
      document.body.innerHTML=`<section class="qr-only-page">
        <div class="qr-card bad">
          <h1>DSK CONGO</h1>
          <h2>❌ Fiche non valide</h2>
          <p>Aucun membre ne correspond à cet identifiant.</p>
        </div>
      </section>`;
      return;
    }

    const active=(m.status==="approved"&&!m.isDisabled);
    const fullname=[m.nom,m.postnom||m.postNom,m.prenom].filter(Boolean).join(" ");

    document.body.innerHTML=`<section class="qr-only-page">
      <div class="qr-header">
        <h1>DSK CONGO</h1>
        <p>Dynamik Simplice KUMBUNGE</p>
        <div>★ ★ ★</div>
      </div>

      <div class="qr-card ${active?'ok':'bad'}">
        <div class="qr-status">${active?'✓ Membre authentifié':'⚠ Membre non actif'}</div>

        ${m.photoUrl?`<div class="qr-member-photo"><img src="${m.photoUrl}"></div>`:""}

        <h2>Identifiants de la fiche</h2>
        <div class="qr-row"><b>ID membre</b><span>${esc(m.memberId||m.docId||"")}</span></div>
        <div class="qr-row"><b>Nom</b><span>${esc(m.nom||"")}</span></div>
        <div class="qr-row"><b>Post-nom</b><span>${esc(m.postnom||m.postNom||"")}</span></div>
        <div class="qr-row"><b>Prénom</b><span>${esc(m.prenom||"")}</span></div>
        <div class="qr-row"><b>Nom complet</b><span>${esc(fullname)}</span></div>

        <h2>Coordonnées personnelles</h2>
        <div class="qr-row"><b>Sexe</b><span>${esc(m.sexe||"")}</span></div>
        <div class="qr-row"><b>Lieu de naissance</b><span>${esc(m.lieuNaissance||"")}</span></div>
        <div class="qr-row"><b>Date de naissance</b><span>${esc(m.dateNaissance||"")}</span></div>
        <div class="qr-row"><b>Téléphone</b><span>${esc(m.telephone||"")}</span></div>
        <div class="qr-row"><b>E-mail</b><span>${esc(m.email||"")}</span></div>

        <h2>Adhésion</h2>
        <div class="qr-row"><b>Section</b><span>${esc(m.sectionName||"")}</span></div>
        <div class="qr-row"><b>Fonction</b><span>${esc(m.fonction||m.qualite||"")}</span></div>
        <div class="qr-row"><b>Qualité</b><span>${esc(m.qualite||"")}</span></div>
        <div class="qr-row"><b>État</b><span>${active?'Membre actif':'En attente / suspendu'}</span></div>
        <div class="qr-row"><b>Date d’adhésion</b><span>${esc(m.date||"")}</span></div>
        <div class="qr-row"><b>Date d’enregistrement</b><span>${esc(m.dateValidation||"")}</span></div>
        <div class="qr-row"><b>Numéro d’adhésion</b><span>${esc(m.memberId||m.docId||"")}</span></div>

        <h2>Coordonnées géographiques</h2>
        <div class="qr-row"><b>Nationalité</b><span>${esc(m.nationalite||"")}</span></div>
        <div class="qr-row"><b>Province</b><span>${esc(m.province||"")}</span></div>
        <div class="qr-row"><b>Territoire</b><span>${esc(m.territoire||"")}</span></div>
        <div class="qr-row"><b>Ville</b><span>${esc(m.ville||"")}</span></div>
        <div class="qr-row"><b>Commune / Quartier</b><span>${esc(m.commune||m.quartier||"")}</span></div>
        <div class="qr-row"><b>Adresse</b><span>${esc(m.adresse||"")}</span></div>

        <p class="qr-note">Cette fiche appartient au membre ci-dessus. Les informations affichées proviennent de la fiche d’adhésion officielle générée par l’administration DSK CONGO.</p>
      </div>
    </section>`;
  }catch(e){
    document.body.innerHTML=`<section class="qr-only-page"><div class="qr-card bad"><h1>Erreur</h1><p>${esc(e.message)}</p></div></section>`;
  }
}


async function render(){
  if(location.hash.startsWith('#fiche-')){return verifyMember(decodeURIComponent(location.hash.replace('#fiche-','')))}
  if(location.hash.startsWith('#verify-')){return verifyMember(decodeURIComponent(location.hash.replace('#verify-','')))}try{await load();let p=location.hash.replace("#","")||"home";let [pg,t,id]=p.split("/");if(pg==="detail")return detail(t,id);await ({home,about,program,news,communications,adhesion,reviews,contact}[pg]||home)()}catch(e){console.error(e);wrap(`<section class=section><div class=container><div class=card><h2>Erreur</h2><pre>${esc(e.message||e)}</pre></div></div></section>`)}}
window.addEventListener("hashchange",render);render();
