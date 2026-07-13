
import {initDefaults,getSite,saveSite,listDocs,addItem,updateItem,removeItem,getAdmin,saveAdmin,deleteAdmin,galleryBlock,fileLinks,esc,splitLinks,linksToText,normalizePost,listSections,saveSection,ensureDefaultSections} from "./shared.js";
const adminFunctions=["CGen","CGACIC","CGACQPS","Sec Gen","APCCPM","CMGSSB","CASH","CRP","CLD","ASPLCF","CSPP","CS","CJ"];
const perms=["dashboard","site","pages","sections","management","news","programs","communications","members","finance","stock","approvals","reviews","admins","adminChat"];const labels={dashboard:"Dashboard",site:"Site/contact",pages:"Pages",sections:"Sections",management:"Gestion membres & admins",news:"Actualités",programs:"Programme",communications:"Communiqués",members:"Membres",finance:"Finances",stock:"Stock & matériels",approvals:"Validation sorties",reviews:"Avis",admins:"Admins",adminChat:"Chat admins"};let adminUser=null,editState=null;const el=id=>document.getElementById(id);
window.loginAdmin=async()=>{await initDefaults();let a=await getAdmin(loginUser.value.trim());if(!a||a.password!==loginPass.value)return alert("Identifiants incorrects");if(a.isDisabled)return alert("Compte admin suspendu");sessionStorage.setItem("dsk_admin",JSON.stringify(a));adminUser=a;renderAdmin("dashboard")};function cur(){adminUser=JSON.parse(sessionStorage.getItem("dsk_admin")||"null");return adminUser}function isSuper(){let a=cur();return a&&a.role==="superadmin"}function has(p){let a=cur();return a&&(a.role==="superadmin"||(a.perms||[]).includes(p)||((a.fonction==="Sec Gen"||a.fonction==="Secrétaire")&&["finance","stock","approvals"].includes(p)))}function allowedSection(m){return isSuper()||!adminUser.sectionId||m.sectionId===adminUser.sectionId}
function login(){document.body.innerHTML=`<section class=section><div class=container><div class=card style="max-width:560px;margin:auto"><h1 class=title>Administration DSK</h1><form autocomplete=off onsubmit="event.preventDefault();loginAdmin();"><label>Utilisateur</label><input id=loginUser autocomplete=off><label>Mot de passe</label><input id=loginPass type=password autocomplete=new-password><br><br><button class=btn>Connexion</button></form></div></div></section>`}

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
function generateSecureAdminId(role,fullname){
  const parts=String(fullname||"").trim().split(/\s+/);
  const nom=parts[0]||"Admin";
  const prenom=parts.length>1?parts[parts.length-1]:"Admin";
  const initials=dskInitials(nom,prenom);
  if(role==="superadmin") return `DSK-SA-${dskYearMonth()}-${dskRandom6()}-${initials}-SupAd`;
  return `DSK-A-${dskYearMonth()}-${dskRandom6()}-${initials}-AD`;
}


function cleanKey(v){return String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
function sameKey(a,b){return cleanKey(a)===cleanKey(b);}
function fullNameFromParts(nom,postnom,prenom){return `${nom||""} ${postnom||""} ${prenom||""}`.trim();}
function splitFullNameSafe(fullname=""){
  const p=String(fullname||"").trim().split(/\s+/).filter(Boolean);
  return {nom:p[0]||"",postnom:p.length>=3?p[1]:"",prenom:p.length>=2?p[p.length-1]:""};
}
function identityOfAdmin(a){
  const p=splitFullNameSafe(a.fullname||"");
  return {nom:a.nom||p.nom,postnom:a.postnom||p.postnom,prenom:a.prenom||p.prenom,telephone:a.telephone||""};
}
function identityEqual(a,b){
  return sameKey(a.nom,b.nom)&&sameKey(a.postnom||a.postNom,b.postnom||b.postNom)&&sameKey(a.prenom,b.prenom);
}
async function duplicateAdminMessage(fd){
  const identity={nom:fd.get("nom"),postnom:fd.get("postnom"),prenom:fd.get("prenom"),telephone:fd.get("telephone")};
  const admins=await listDocs("admins");
  const members=await listDocs("members");
  if(admins.some(a=>sameKey(a.username,fd.get("username")))) return "Ce nom utilisateur existe déjà.";
  if(admins.some(a=>identityEqual(identityOfAdmin(a),identity))) return "Un admin existe déjà avec le même nom, post-nom et prénom.";
  if(members.some(m=>identityEqual(m,identity))) return "Un membre existe déjà avec le même nom, post-nom et prénom.";
  if(fd.get("telephone") && admins.some(a=>sameKey(a.telephone,fd.get("telephone")))) return "Ce numéro est déjà utilisé par un admin.";
  if(fd.get("telephone") && members.some(m=>sameKey(m.telephone,fd.get("telephone")))) return "Ce numéro est déjà utilisé par un membre.";
  return "";
}
window.deleteAdminAccount=async function(username){
  if(!isSuper())return alert("Réservé au super admin.");
  if(username===adminUser.username)return alert("Vous ne pouvez pas supprimer votre propre compte.");
  const a=await getAdmin(username);
  if(a&&a.locked)return alert("Ce compte principal ne peut pas être supprimé.");
  if(!confirm("Supprimer définitivement cet admin ?"))return;
  await deleteAdmin(username);
  alert("Admin supprimé.");
  renderAdmin("admins");
}


// V29 - Lecture fichiers locaux en Base64 pour GitHub/Firebase sans serveur upload
function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=reject;
    r.readAsDataURL(file);
  });
}
async function readFileInput(name){
  const el=document.querySelector(`[name="${name}File"]`);
  if(el && el.files && el.files[0]) return await fileToDataUrl(el.files[0]);
  const url=document.querySelector(`[name="${name}"]`)?.value||"";
  return url.trim();
}
async function readMultiFileInput(name){
  const el=document.querySelector(`[name="${name}File"]`);
  const url=document.querySelector(`[name="${name}"]`)?.value||"";
  const links=url.split(/[\n,]+/).map(x=>x.trim()).filter(Boolean);
  if(el && el.files && el.files.length){
    for(const f of el.files){ links.push(await fileToDataUrl(f)); }
  }
  return links.join("\\n");
}

window.renderAdmin=async(page="dashboard")=>{await initDefaults();await ensureDefaultSections();if(!cur())return login();let menu=[["dashboard","📊 Tableau de bord"],["site","⚙️ Site"],["pages","📝 Pages / À propos"],["sections","🏢 Sections"],["management","🗂️ Gestion membres & admins"],["news","📰 Actualités"],["programs","🏗️ Programme"],["communications","📢 Communiqués"],["members","👥 Membres"],["finance","💰 Finances"],["stock","📦 Stock & matériels"],["approvals","✅ Validation sorties"],["adminChat","💬 Chat admins"],["reviews","💬 Avis"],["admins","🔐 Admins"]].filter(x=>has(x[0])&&(x[0]!="sections"||isSuper())&&(x[0]!="admins"||isSuper())&&(x[0]!="management"||isSuper()));document.body.innerHTML=`<section class=section><div class="container admin-layout"><aside class=side><div class=notice>Connecté : <b>${esc(adminUser.fullname||adminUser.username)}</b><br>ID : <b>${esc(adminUser.adminId||"")}</b><br>Fonction : <b>${esc(adminUser.fonction||"")}</b><br>${adminUser.sectionName?`Section : <b>${esc(adminUser.sectionName)}</b>`:"Toutes les sections"}</div><br>${menu.map(m=>`<button class="btn light" onclick="renderAdmin('${m[0]}')">${m[1]}</button>`).join("")}<button class="btn red" onclick="sessionStorage.removeItem('dsk_admin');renderAdmin()">Déconnexion</button><a class="btn light" href="index.html">Voir site</a></aside><main id=adminMain></main></div></section>`;if(!has(page)){adminMain.innerHTML="<div class=card>Accès non autorisé</div>";return}({dashboard,site,pages,sections:sectionsPage,management:managementPage,news:()=>posts("news","Actualités"),programs:()=>posts("programs","Programme"),communications:()=>posts("communications","Communiqués ciblés"),members,finance:financePage,stock:stockPage,approvals:approvalsPage,adminChat,reviews,admins}[page]||dashboard)()}

async function dashboard(){
  let [m,a,s,n,p,c,r,fm,st]=await Promise.all([
    listDocs("members"),
    listDocs("admins"),
    listSections(),
    listDocs("news"),
    listDocs("programs"),
    listDocs("communications"),
    listDocs("reviews"),
    listDocs("financeMovements"),
    listDocs("stockItems")
  ]);

  if(!isSuper()) m=m.filter(allowedSection);

  const approved=m.filter(x=>x.status==="approved"&&!x.isDisabled).length;
  const pending=m.filter(x=>x.status!=="approved").length;
  const suspended=m.filter(x=>x.isDisabled).length;
  const activeAdmins=a.filter(x=>!x.isDisabled).length;

  const secRows=s.map(sec=>{
    const sm=m.filter(x=>x.sectionId===sec.docId);
    const sa=a.filter(x=>x.sectionId===sec.docId);
    return `<tr>
      <td>${esc(sec.name)}</td>
      <td>${sm.length}</td>
      <td>${sm.filter(x=>x.status==="approved").length}</td>
      <td>${sm.filter(x=>x.status!=="approved").length}</td>
      <td>${sm.filter(x=>x.isDisabled).length}</td>
      <td>${sa.length}</td>
    </tr>`;
  }).join("");

  adminMain.innerHTML=`
    <div class="dash-hero dashboard-hero-pro">
      <div>
        <h1>Tableau de bord DSK Congo</h1>
        <p>${isSuper()?"Vue générale de toutes les sections, membres, admins et publications.":"Vue de votre section."}</p>
      </div>
      <div class="dash-user-card">
        <b>${esc(adminUser.fullname||adminUser.username)}</b><br>
        ID : ${esc(adminUser.adminId||"")}<br>
        Fonction : ${esc(adminUser.fonction||"")}
      </div>
    </div>

    <br>

    <div class="grid g3 dashboard-grid">
      <div class="stat-card clickable-stat" onclick="renderAdmin('members')">
        <span class=num>${m.length}</span><span class=label>Total membres</span><small>Cliquer pour ouvrir</small>
      </div>
      <div class="stat-card clickable-stat" onclick="renderAdmin('members')">
        <span class=num>${approved}</span><span class=label>Membres approuvés</span><small>Comptes actifs</small>
      </div>
      <div class="stat-card clickable-stat" onclick="renderAdmin('members')">
        <span class=num>${pending}</span><span class=label>En attente</span><small>À valider</small>
      </div>
      <div class="stat-card clickable-stat" onclick="renderAdmin('members')">
        <span class=num>${suspended}</span><span class=label>Suspendus</span><small>Comptes bloqués</small>
      </div>
      <div class="stat-card clickable-stat" onclick="renderAdmin('admins')">
        <span class=num>${activeAdmins}</span><span class=label>Admins actifs</span><small>Gestion admins</small>
      </div>
      <div class="stat-card clickable-stat" onclick="renderAdmin('sections')">
        <span class=num>${s.length}</span><span class=label>Sections</span><small>Organisation</small>
      </div>
    </div>

    <br>

    <div class="grid g2">
      <div class="card">
        <h2>Statistiques par section</h2>
        <div class="table">
          <table>
            <tr><th>Section</th><th>Total</th><th>Approuvés</th><th>Attente</th><th>Suspendus</th><th>Admins</th></tr>
            ${secRows || "<tr><td colspan='6'>Aucune section</td></tr>"}
          </table>
        </div>
      </div>

      <div class="card">
        <h2>Activité générale</h2>
        <div class="mini-stats">
          <div onclick="renderAdmin('news')"><b>${n.length}</b><span>Actualités</span></div>
          <div onclick="renderAdmin('programs')"><b>${p.length}</b><span>Programmes</span></div>
          <div onclick="renderAdmin('communications')"><b>${c.length}</b><span>Communiqués</span></div>
          <div onclick="renderAdmin('reviews')"><b>${r.length}</b><span>Avis</span></div><div onclick="renderAdmin('finance')"><b>${fm.length}</b><span>Mouvements financiers</span></div><div onclick="renderAdmin('stock')"><b>${st.length}</b><span>Matériels stock</span></div>
        </div>
      </div>
    </div>`;
}

async function site(){let s=await getSite();adminMain.innerHTML=`<div class=card><h2>Paramètres du site</h2><form id=f><label>Nom</label><input name=partyName value="${esc(s.partyName)}"><label>Slogan</label><input name=slogan value="${esc(s.slogan)}"><label>Texte haut</label><input name=topText value="${esc(s.topText)}"><label>Logo URL ou image locale</label><input name=logoUrl value="${esc(s.logoUrl)}" placeholder="Lien image ou laissez vide si vous parcourez"><input type=file name=logoUrlFile accept="image/*" class=fileInput><label>Photo du leader URL ou image locale</label><input name=leaderPhotoUrl value="${esc(s.leaderPhotoUrl||'')}" placeholder="Lien image ou laissez vide si vous parcourez"><input type=file name=leaderPhotoUrlFile accept="image/*" class=fileInput><label>Signature du Président URL</label><input name=officialSignatureUrl value="${esc(s.officialSignatureUrl||'assets/img/signature-simplice.png')}" placeholder="Lien image signature"><input type=file name=officialSignatureUrlFile accept="image/*" class=fileInput><label>Nom du Président</label><input name=officialPresidentName value="${esc(s.officialPresidentName||'Simplice KUMBUNGE')}"><label>Fonction du Président</label><input name=officialPresidentTitle value="${esc(s.officialPresidentTitle||'Président')}"><label>Arrière-plan URL ou image locale</label><input name=heroBgUrl value="${esc(s.heroBgUrl)}" placeholder="Lien image ou laissez vide si vous parcourez"><input type=file name=heroBgUrlFile accept="image/*" class=fileInput><label>Galerie accueil - liens images ou images locales</label><textarea name=homeGallery placeholder="Un lien image par ligne">${esc(s.homeGallery||'')}</textarea><input type=file name=homeGalleryFile accept="image/*" multiple class=fileInput><label>Email</label><input name=email value="${esc(s.email)}"><label>Téléphone</label><input name=phone value="${esc(s.phone)}"><label>WhatsApp</label><input name=whatsapp value="${esc(s.whatsapp)}"><label>Adresse</label><input name=address value="${esc(s.address)}"><label>Lien Google Maps intégré</label><input name=mapEmbedUrl value="${esc(s.mapEmbedUrl||'')}"><h3>Réseaux sociaux</h3><label>Lien Instagram</label><input name=instagramUrl value="${esc(s.instagramUrl||s.instagram||'#')}"><label>Lien Facebook</label><input name=facebookUrl value="${esc(s.facebookUrl||s.facebook||'#')}"><label>Lien TikTok</label><input name=tiktokUrl value="${esc(s.tiktokUrl||s.tiktok||'#')}"><label>Lien YouTube</label><input name=youtubeUrl value="${esc(s.youtubeUrl||s.youtube||'#')}"><label>Lien X / Twitter</label><input name=xUrl value="${esc(s.xUrl||s.twitterUrl||s.x||'#')}"><label>Footer</label><textarea name=footer>${esc(s.footer)}</textarea><button class=btn>Enregistrer</button></form></div>`;f.onsubmit=async e=>{e.preventDefault();await saveSite(Object.fromEntries(new FormData(f)));alert("Enregistré")}}
async function pages(){let s=await getSite();adminMain.innerHTML=`<div class=card><h2>Modifier À propos et autres contenus</h2><form id=f><h3>Accueil</h3><label>Titre accueil</label><textarea name=heroTitle>${esc(s.heroTitle)}</textarea><label>Sous-titre</label><textarea name=heroSubtitle>${esc(s.heroSubtitle)}</textarea><label>Priorités</label><textarea name=priorities>${esc(s.priorities)}</textarea><h3>À propos</h3><label>Vision</label><textarea name=vision>${esc(s.vision)}</textarea><label>Mission</label><textarea name=mission>${esc(s.mission)}</textarea><label>Organisation</label><textarea name=organization>${esc(s.organization)}</textarea><label>Texte supplémentaire</label><textarea name=aboutExtra>${esc(s.aboutExtra)}</textarea><label>Blocs À propos</label><textarea name=aboutCards>${esc(s.aboutCards||"")}</textarea><h3>Autres pages</h3><label>Programme intro</label><textarea name=programIntro>${esc(s.programIntro)}</textarea><label>Actualités intro</label><textarea name=newsIntro>${esc(s.newsIntro)}</textarea><label>Communications intro</label><textarea name=commIntro>${esc(s.commIntro)}</textarea><label>Adhésion intro</label><textarea name=adhesionIntro>${esc(s.adhesionIntro)}</textarea><button class=btn>Enregistrer</button></form></div>`;f.onsubmit=async e=>{e.preventDefault();await saveSite(Object.fromEntries(new FormData(f)));alert("Contenu modifié")}}
async function sectionsPage(){let ss=await listSections();adminMain.innerHTML=`<div class=card><h2>Créer section</h2><form id=f><label>Nom section</label><input name=name required><label>Description</label><textarea name=description></textarea><button class=btn>Créer</button></form></div><br><div class=card><h2>Sections</h2><div class=table><table><tr><th>Nom</th><th>Description</th></tr>${ss.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.description||"")}</td></tr>`).join("")}</table></div></div>`;f.onsubmit=async e=>{e.preventDefault();let fd=new FormData(f);await saveSection({name:fd.get("name"),description:fd.get("description")});renderAdmin("sections")}}
async function formPost(title,post={}){post=normalizePost(post);let ss=await listSections();return `<div class=card><h2>${post.docId?"Modifier":"Nouveau"} — ${title}</h2><form id=f><label>Titre</label><input name=title value="${esc(post.title||"")}" required><label>Catégorie</label><input name=category value="${esc(post.category||"Publication")}"><label>Texte</label><textarea name=content required>${esc(post.content||"")}</textarea><label>Cible</label><select name=target><option value=sectionMembers>Membres d'une section</option>${isSuper()?`<option value=allMembers>Tous les membres</option><option value=sectionAdmins>Admins d'une section</option><option value=allAdmins>Tous les admins</option>`:""}</select><label>Section</label><select name=sectionId>${ss.map(s=>`<option value="${s.docId}" ${(post.sectionId||adminUser.sectionId)===s.docId?"selected":""}>${esc(s.name)}</option>`).join("")}</select><label>Images URL multiples</label><textarea name=imageUrls><input type=file name=imageUrlsFile accept="image/*" multiple class=fileInput><input type=file name=imageUrlFile accept="image/*" class=fileInput>${esc(linksToText(post.imageUrls))}</textarea><label>Vidéo URL</label><input name=videoUrl value="${esc(post.videoUrl||"")}"><input type=file name=videoUrlFile accept="video/*" class=fileInput><label>Documents/PDF URL</label><textarea name=fileUrls>${esc(linksToText(post.fileUrls))}</textarea><button class=btn>${post.docId?"Enregistrer":"Publier"}</button></form></div>`}
async function posts(col,title){let items=(await listDocs(col)).map(normalizePost);if(col==="communications"&&!isSuper())items=items.filter(x=>x.sectionId===adminUser.sectionId);let editing=editState&&editState.col===col?items.find(x=>x.docId===editState.id):null;adminMain.innerHTML=`${await formPost(title,editing||{})}<br><div class="grid g2">${items.map(x=>`<div class="card media">${galleryBlock(x)}<div class=media-body><h3>${esc(x.title)}</h3><p>${esc((x.content||"").slice(0,150))}</p><button class="btn small" onclick="editPost('${col}','${x.docId}')">Modifier</button> <button class="btn red small" onclick="del('${col}','${x.docId}')">Supprimer</button></div></div>`).join("")}</div>`;f.onsubmit=async e=>{e.preventDefault();let fd=new FormData(f),ss=await listSections(),sec=ss.find(s=>s.docId===fd.get("sectionId")),target=fd.get("target");let data={title:fd.get("title"),category:fd.get("category"),content:fd.get("content"),target,sectionId:["allMembers","allAdmins"].includes(target)?"":fd.get("sectionId"),sectionName:sec?.name||"",imageUrls:splitLinks(fd.get("imageUrls")),fileUrls:splitLinks(fd.get("fileUrls")),videoUrl:await readFileInput("videoUrl"),date:editing?.date||new Date().toLocaleString(),updatedAt:new Date().toLocaleString(),author:adminUser.username};if(editing){await updateItem(col,editing.docId,data);editState=null}else await addItem(col,data);renderAdmin(col)}}window.editPost=(c,id)=>{editState={col:c,id};renderAdmin(c)};window.del=async(c,id)=>{if(confirm("Supprimer ?")){await removeItem(c,id);renderAdmin(c)}}
window.updateMemberPassword=async id=>{let p=prompt("Nouveau mot de passe membre");if(p){await updateItem("members",id,{password:p});renderAdmin("management")}};window.updateAdminPassword=async u=>{let p=prompt("Nouveau mot de passe admin");if(p){await saveAdmin({username:u,password:p});renderAdmin("management")}};window.suspendMember=async(id,state)=>{await updateItem("members",id,{isDisabled:!state});renderAdmin("management")};window.suspendAdmin=async(u,state)=>{await saveAdmin({username:u,isDisabled:!state});renderAdmin("management")}


async function managementPage(){
  if(!isSuper())return adminMain.innerHTML="<div class=card>Réservé au super admin</div>";
  let [m,a,s]=await Promise.all([listDocs("members"),listDocs("admins"),listSections()]);
  let opts=`<option value=all>Toutes les sections</option>`+s.map(x=>`<option value="${x.docId}">${esc(x.name)}</option>`).join("");
  adminMain.innerHTML=`<div class=dash-hero><h1>Gestion membres & admins</h1><p>Gestion complète, suppression admin, mot de passe, suspension et rapports.</p></div>
  <br><div class=card><div class=row><div><label>Filtrer par section</label><select id=filterSection onchange=filterTables()>${opts}</select></div><div style="display:flex;gap:8px;align-items:end"><button class="btn green" onclick="exportMembers()">PDF membres</button><button class="btn blue" onclick="exportAdmins()">PDF admins</button></div></div></div>
  <br><div class=card><h2>Membres</h2><div class=table><table id=tm>
  <tr><th>ID</th><th>Nom</th><th>Post-nom</th><th>Prénom</th><th>Section</th><th>Téléphone</th><th>Fonction</th><th>MDP</th><th>Validation</th><th>Compte</th><th>Action</th></tr>
  ${m.map(x=>`<tr data-section="${esc(x.sectionId||"")}"><td>${esc(x.memberId||"")}</td><td>${x.photoUrl?`<img class="mini-photo" src="${x.photoUrl}">`:"-"}</td><td>${esc(x.nom||"")}</td><td>${esc(x.postnom||x.postNom||"")}</td><td>${esc(x.prenom||"")}</td><td>${esc(x.sectionName||"")}</td><td>${esc(x.telephone||"")}</td><td>${esc(x.fonction||x.titre||"")}</td><td><code>${esc(x.password||"")}</code></td><td>${esc(x.status||"")}</td><td>${x.isDisabled?"Suspendu":"Actif"}</td><td><button onclick="updateMemberPassword('${x.docId}')">MDP</button> <button onclick="toggleMemberStatus('${x.docId}','${x.status==="approved"?"pending":"approved"}')">${x.status==="approved"?"Désactiver":"Approuver"}</button> <button onclick="suspendMember('${x.docId}',${!x.isDisabled})">${x.isDisabled?"Réactiver":"Suspendre"}</button> ${isSuper()?`<button class="danger-action" onclick="deleteMemberAccount('${x.docId}')">Supprimer</button>`:""} <button onclick="editMemberPhoto('${x.docId}')">Photo</button> <button onclick="printAdhesionForm('${x.docId}')">Fiche PDF</button> ${isSuper()?`<button class="danger-action" onclick="deleteMemberAccount('${x.docId}')">Supprimer</button>`:""}</td></tr>`).join("")}
  </table></div></div>
  <br><div class=card><h2>Admins</h2><div class=table><table id=ta>
  <tr><th>ID</th><th>Utilisateur</th><th>Nom</th><th>Post-nom</th><th>Prénom</th><th>Téléphone</th><th>Fonction</th><th>Section</th><th>Rôle</th><th>MDP</th><th>Compte</th><th>Action</th></tr>
  ${a.map(x=>{const p=splitFullNameSafe(x.fullname||"");return `<tr data-section="${esc(x.sectionId||"")}"><td>${esc(x.adminId||"")}</td><td>${esc(x.username||"")}</td><td>${esc(x.nom||p.nom||"")}</td><td>${esc(x.postnom||p.postnom||"")}</td><td>${esc(x.prenom||p.prenom||"")}</td><td>${esc(x.telephone||"")}</td><td>${esc(x.fonction||"")}</td><td>${esc(x.sectionName||"Toutes")}</td><td>${esc(x.role||"")}</td><td><code>${esc(x.password||"")}</code></td><td>${x.isDisabled?"Suspendu":"Actif"}</td><td><button onclick="updateAdminPassword('${x.username}')">MDP</button> ${x.locked?"":`<button onclick="suspendAdmin('${x.username}',${!x.isDisabled})">${x.isDisabled?"Réactiver":"Suspendre"}</button> <button onclick="deleteAdminAccount('${x.username}')">Supprimer</button>`}</td></tr>`}).join("")}
  </table></div></div>`;
}

window.filterTables=()=>{let s=filterSection.value;document.querySelectorAll("#tm tr[data-section],#ta tr[data-section]").forEach(r=>r.style.display=(s==="all"||r.dataset.section===s)?"":"none")}
window.toggleMemberStatus=async(id,status)=>{await updateItem("members",id,{status});renderAdmin("management")}
function printDoc(title,html){let w=window.open("","Dynamik Simplice KUMBUNGE");w.document.write(`<html><head><style>body{font-family:Arial;padding:28px}table{width:100%;border-collapse:collapse;font-size:11px}td,th{border:1px solid #ddd;padding:6px}th{background:#041735;color:white}@media print{button{display:none}}</style></head><body><button onclick=print()>Imprimer/PDF</button><h1>${title}</h1>${html}<p></p></body></html>`);w.document.close();setTimeout(()=>w.print(),500)}


window.editMemberPhoto=async function(id){
  const members=await listDocs("members");
  const m=members.find(x=>x.docId===id);
  const choice=confirm("OK = Parcourir sur mon PC / Annuler = Coller un lien URL");
  let photo="";
  if(choice){
    const input=document.createElement("input");
    input.type="file"; input.accept="image/*";
    input.onchange=async()=>{ if(input.files[0]){ photo=await fileToDataUrl(input.files[0]); await updateItem("members",id,{photoUrl:photo}); alert("Photo membre importée."); renderAdmin("members"); } };
    input.click();
    return;
  }else{
    const url=prompt("Collez le lien URL de la photo du membre :", m?.photoUrl||"");
    if(url===null)return;
    photo=url.trim();
  }
  await updateItem("members",id,{photoUrl:photo});
  alert("Photo membre enregistrée.");
  renderAdmin("members");
}




window.deleteMemberAccount=async function(id){
  if(!isSuper()) return alert("Réservé au super admin.");
  const members=await listDocs("members");
  const m=members.find(x=>x.docId===id);
  if(!m) return alert("Membre introuvable.");
  const fullName=[m.nom,m.postnom||m.postNom,m.prenom].filter(Boolean).join(" ");
  if(!confirm(`Voulez-vous vraiment supprimer définitivement le membre : ${fullName} ?`)) return;
  await removeItem("members",id);
  alert("Membre supprimé avec succès.");
  renderAdmin("members");
}

window.printAdhesionForm=async function(id){
  const all=await listDocs("members");
  const m=all.find(x=>x.docId===id);
  if(!m)return alert("Membre introuvable.");
  const sitePrint=await getSite();

  const leaderPhoto=sitePrint.officialLeaderPhoto||sitePrint.leaderPhotoUrl||"assets/img/leader-simplice.png";
  const signature=sitePrint.officialSignatureUrl||"assets/img/signature-simplice.png";
  const presidentName=sitePrint.officialPresidentName||"Simplice KUMBUNGE";
  const presidentTitle=sitePrint.officialPresidentTitle||"Président";
  const memberId=m.memberId||m.docId||"";
  const fullDate=m.date||new Date().toLocaleString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"});
  const verifyUrl=(location.origin+location.pathname.replace("admin.html","index.html")+"#fiche-"+encodeURIComponent(memberId));
  const qrUrl="https://api.qrserver.com/v1/create-qr-code/?size=130x130&data="+encodeURIComponent(verifyUrl);

  const val=v=>esc(v||"/");
  const line=(label,value)=>`<div class=row><div class=lbl>${label}</div><div class=dots>${val(value)}</div></div>`;

  const w=window.open("","Fiche adhesion DSK");
  w.document.write(`<!doctype html><html><head><title>Fiche d'adhésion DSK</title><style>
  @page{size:A4;margin:7mm}
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;margin:0;background:#fff;color:#061a3a}
  .tools{max-width:790px;margin:6px auto;text-align:right}
  .tools button{background:#062b66;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:800;cursor:pointer}
  .sheet{width:794px;height:1123px;margin:0 auto;background:#fff;border:2px solid #2e8ee6;border-radius:16px;padding:18px 22px 12px;position:relative;overflow:hidden}
  .head{display:grid;grid-template-columns:150px 1fr 160px;gap:14px;align-items:start}
  .leaderOnly{height:118px;display:flex;align-items:center;justify-content:center;overflow:hidden;padding-top:22px}
  .leaderOnly img{width:112px;height:112px;border-radius:50%;object-fit:cover;border:0}
  .memberPhoto{height:116px;border:1.8px solid #111;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#000;background:#fff;overflow:hidden}
  .memberPhoto img{width:100%;height:100%;object-fit:cover;display:block}
  .brand{text-align:center;padding-top:10px}
  .brand .dsk{font-size:50px;font-weight:1000;color:#1c4c91;letter-spacing:1px;line-height:1}
  .brand small{display:block;font-size:8px;color:#1c4c91;margin-top:0}
  h1{text-align:center;margin:10px 0 8px;font-size:20px;color:#000;letter-spacing:.5px}
  .reg{display:flex;justify-content:flex-end;margin-bottom:6px}
  .reg span{border:1.6px solid #111;padding:6px 10px;font-size:10.5px;background:#fff}
  .sectionTitle{display:inline-block;border:1.8px solid #111;border-radius:22px;padding:6px 20px;margin:7px 0 4px;min-width:205px;font-weight:1000;color:#000;font-size:11.5px;background:#fff}
  .row{display:grid;grid-template-columns:225px 1fr;gap:8px;align-items:end;min-height:25px;font-size:10.8px}
  .lbl{font-weight:900;color:#111}
  .dots{border-bottom:1.4px dotted #111;min-height:18px;padding:2px 7px 1px;font-weight:800;color:#000}
  .quality{display:grid;grid-template-columns:1fr 172px;gap:18px;align-items:end}.qualityChoice{width:100%;border-collapse:collapse;margin:5px 0 6px;font-size:10px}.qualityChoice th,.qualityChoice td{border:1.5px solid #111;text-align:center;height:22px;font-weight:900;color:#000}.qualityChoice .mark{font-size:14px;color:#06306c}
  .qrBox{border:1.8px solid #2e8ee6;border-radius:8px;text-align:center;padding:6px;background:#fff;align-self:end}
  .qrBox img{width:102px;height:102px}
  .qrBox div{font-size:7.5px;font-weight:900;color:#06306c;margin-top:2px}
  .footerSign{display:grid;grid-template-columns:1fr 1fr;margin-top:8px;gap:34px;align-items:end;border-top:1.5px solid #07306b;padding-top:4px}
  .adhSign{text-align:center;font-size:10.8px;color:#111}
  .adhLine{border-top:1.8px solid #111;height:20px;margin-top:30px}
  .pres{text-align:center}
  .pres img{max-height:82px;max-width:260px;object-fit:contain;display:block;margin:-18px auto -2px}
  .pres .line{border-top:1.8px solid #111;margin-top:0;padding-top:4px;font-size:12px;font-weight:1000;color:#000;line-height:1.25}
  .bottom{position:absolute;left:0;right:0;bottom:0;background:#07306b;color:#fff;text-align:center;padding:8px;font-size:12px;font-weight:900}
  @media print{body{background:#fff}.tools{display:none}.sheet{margin:0;border-color:#2e8ee6;box-shadow:none}}
  </style></head><body>
  <div class=tools><button onclick="window.print()">Imprimer / Enregistrer PDF</button></div>
  <div class=sheet>
    <div class=head>
      <div class=leaderOnly><img src="${leaderPhoto}"></div>
      <div class=brand><div class=dsk>DSK</div><small>Dynamik Simplice KUMBUNGE</small></div>
      <div class=memberPhoto>${m.photoUrl?`<img src="${m.photoUrl}">`:"PHOTO"}</div>
    </div>

    <h1>FICHE D’ADHESION</h1>
    <div class=reg><span>N° : ${val(memberId)}</span></div>

    <div class=sectionTitle>IDENTIFICATION</div>
    ${line("Nom",m.nom)}
    ${line("Post-Nom",m.postnom||m.postNom)}
    ${line("Prénoms",m.prenom)}
    ${line("Lieu et date de Naissance",(m.lieuNaissance||"/")+" / "+(m.dateNaissance||"/"))}
    ${line("Sexe",m.sexe)}
    ${line("Contact",m.telephone)}
    ${line("E-mail",m.email)}

    <div class=sectionTitle>COORDONNÉES GÉOGRAPHIQUES</div>
    ${line("Nationalité",m.nationalite)}
    ${line("Province",m.province)}
    ${line("Territoire",m.territoire)}
    ${line("Ville",m.ville)}
    ${line("Commune / Quartier",m.commune||m.quartier)}
    ${line("Adresse",m.adresse)}

    <div class=sectionTitle>QUALITÉ DU MEMBRE</div>
    <table class=qualityChoice>
      <tr>
        <th>Membre d’honneur</th>
        <th>Membre sympathisant</th>
        <th>Membre effectif</th>
      </tr>
      <tr>
        <td class=mark>${String(m.qualite||"").toLowerCase().includes("honneur")?"✓":""}</td>
        <td class=mark>${String(m.qualite||"").toLowerCase().includes("sympathisant")?"✓":""}</td>
        <td class=mark>${String(m.qualite||"").toLowerCase().includes("effectif")?"✓":""}</td>
      </tr>
    </table>
    ${line("Appartenance politique antérieure",m.appartenance)}
    ${line("Période d’appartenance",m.periode)}
    ${line("Circonscription électorale",m.circonscription)}
    ${line("Qualité",m.qualite)}

    <div class=sectionTitle>ENREGISTREMENT</div>
    <div class=quality>
      <div>
        ${line("Date d’adhésion",fullDate)}
        ${line("Date d’enregistrement",m.dateValidation||fullDate)}
        ${line("Numéro d’adhésion",memberId)}
      </div>
      <div class=qrBox><img src="${qrUrl}"><div>SCANNEZ POUR VÉRIFIER<br>L’AUTHENTICITÉ DE CETTE FICHE</div></div>
    </div>

    <div class=footerSign>
      <div class=adhSign><div class=adhLine></div>Signature de l’adhérant</div>
      <div class=pres><img src="${signature}"><div class=line><b>Simplice KUMBUNGE Président</b></div></div>
    </div>
    <div class=bottom>Ensemble pour la rupture et le changement</div>
  </div></body></html>`);
  w.document.close();
}



window.exportMembers=async()=>{let s=filterSection?.value||"all",m=await listDocs("members");if(s!=="all")m=m.filter(x=>x.sectionId===s);printDoc("DSK Congo - Membres",`<table><tr><th>ID</th><th>Nom</th><th>Post-nom</th><th>Prénom</th><th>Section</th><th>Téléphone</th><th>Fonction</th></tr>${m.map(x=>`<tr><td>${esc(x.memberId)}</td><td>${esc(x.nom)}</td><td>${esc(x.postnom||"")}</td><td>${esc(x.prenom)}</td><td>${esc(x.sectionName||"")}</td><td>${esc(x.telephone)}</td><td>${esc(x.fonction||"")}</td></tr>`).join("")}</table>`)}
window.exportAdmins=async()=>{let s=filterSection?.value||"all",a=await listDocs("admins");if(s!=="all")a=a.filter(x=>x.sectionId===s);printDoc("DSK Congo - Admins",`<table><tr><th>ID</th><th>Utilisateur</th><th>Nom</th><th>Fonction</th><th>Section</th></tr>${a.map(x=>`<tr><td>${esc(x.adminId||"")}</td><td>${esc(x.username)}</td><td>${esc(x.fullname||"")}</td><td>${esc(x.fonction||"")}</td><td>${esc(x.sectionName||"Toutes")}</td></tr>`).join("")}</table>`)}

async function members(){
  let m=await listDocs("members");
  if(!isSuper())m=m.filter(allowedSection);
  adminMain.innerHTML=`<div class=card><h2>Membres & fiches d’adhésion</h2>
  <p class=notice>Après validation, l’admin peut imprimer ou enregistrer la fiche d’adhésion en PDF pour chaque membre.</p>
  <div class=table><table><tr><th>ID</th><th>Photo</th><th>Nom</th><th>Post-nom</th><th>Prénom</th><th>Section</th><th>Tél</th><th>Email</th><th>Qualité</th><th>Statut</th><th>Action</th></tr>
  ${m.map(x=>`<tr>
    <td>${esc(x.memberId||"")}</td><td>${x.photoUrl?`<img class="mini-photo" src="${x.photoUrl}">`:"-"}</td><td>${esc(x.nom||"")}</td><td>${esc(x.postnom||x.postNom||"")}</td><td>${esc(x.prenom||"")}</td>
    <td>${esc(x.sectionName||"")}</td><td>${esc(x.telephone||"")}</td><td>${esc(x.email||"")}</td><td>${esc(x.qualite||"")}</td><td>${esc(x.status||"")}</td>
    <td><button onclick="approve('${x.docId}')">Approuver</button> <button onclick="rejectMember('${x.docId}')">Désactiver</button> <button onclick="editMemberPhoto('${x.docId}')">Photo</button> <button onclick="printAdhesionForm('${x.docId}')">Fiche PDF</button> ${isSuper()?`<button class="danger-action" onclick="deleteMemberAccount('${x.docId}')">Supprimer</button>`:""}</td>
  </tr>`).join("")}</table></div><br><button class="btn green" onclick="exportMembers()">Imprimer/PDF liste</button></div>`
}
window.approve=async id=>{await updateItem("members",id,{status:"approved",dateValidation:new Date().toLocaleString()});renderAdmin("members")}
window.rejectMember=async id=>{await updateItem("members",id,{status:"pending"});renderAdmin("members")}


async function admins(){
  let a=await listDocs("admins"),s=await listSections();
  adminMain.innerHTML=`<div class=card>
    <h2>Créer admin</h2>
    <p class=notice>Champs obligatoires : nom utilisateur, mot de passe, nom, post-nom, prénom et téléphone.</p>
    <form id=f autocomplete=off>
      <div class=row>
        <div><label>ID Admin</label><input name=adminId value="Automatique" disabled></div>
        <div><label>Nom utilisateur *</label><input name=username required autocomplete=off></div>
        <div><label>Mot de passe *</label><input name=password type=password required autocomplete=new-password></div>
        <div><label>Nom *</label><input name=nom required></div>
        <div><label>Post-nom *</label><input name=postnom required></div>
        <div><label>Prénom *</label><input name=prenom required></div>
        <div><label>Numéro de téléphone *</label><input name=telephone required></div>
        <div><label>Fonction</label><select name=fonction>${adminFunctions.map(fn=>`<option>${fn}</option>`).join("")}</select></div>
        <div><label>Rôle</label><select name=role><option value=admin>Admin section</option><option value=superadmin>Super admin</option></select></div>
        <div><label>Section</label><select name=sectionId><option value="">Toutes</option>${s.map(x=>`<option value="${x.docId}">${esc(x.name)}</option>`).join("")}</select></div>
      </div>
      <h3>Droits</h3>
      <div class=checks>${perms.filter(p=>!["admins","sections","management"].includes(p)).map(p=>`<label><input type=checkbox name=perms value=${p} checked> ${labels[p]}</label>`).join("")}</div>
      <br><button class=btn>Créer admin</button>
    </form>
  </div>
  <br>
  <div class=card>
    <h2>Liste complète des admins</h2>
    <div class=table><table>
      <tr><th>ID</th><th>Utilisateur</th><th>Nom</th><th>Post-nom</th><th>Prénom</th><th>Téléphone</th><th>Fonction</th><th>Section</th><th>Rôle</th><th>MDP</th><th>Compte</th><th>Action</th></tr>
      ${a.map(x=>{const p=splitFullNameSafe(x.fullname||"");return `<tr>
        <td>${esc(x.adminId||"")}</td>
        <td>${esc(x.username||"")}</td>
        <td>${esc(x.nom||p.nom||"")}</td>
        <td>${esc(x.postnom||p.postnom||"")}</td>
        <td>${esc(x.prenom||p.prenom||"")}</td>
        <td>${esc(x.telephone||"")}</td>
        <td>${esc(x.fonction||"")}</td>
        <td>${esc(x.sectionName||"Toutes")}</td>
        <td>${esc(x.role||"")}</td>
        <td><code>${esc(x.password||"")}</code></td>
        <td>${x.isDisabled?"Suspendu":"Actif"}</td>
        <td><button onclick="updateAdminPassword('${x.username}')">MDP</button> ${x.locked?"":`<button onclick="suspendAdmin('${x.username}',${!x.isDisabled})">${x.isDisabled?"Réactiver":"Suspendre"}</button> <button onclick="deleteAdminAccount('${x.username}')">Supprimer</button>`}</td>
      </tr>`}).join("")}
    </table></div>
  </div>`;

  f.onsubmit=async e=>{
    e.preventDefault();
    let fd=new FormData(f);
    const msg=await duplicateAdminMessage(fd);
    if(msg)return alert(msg);
    let sec=s.find(x=>x.docId===fd.get("sectionId"));
    const fullname=fullNameFromParts(fd.get("nom"),fd.get("postnom"),fd.get("prenom"));
    await saveAdmin({
      adminId:generateSecureAdminId(fd.get("role"),fullname),
      username:fd.get("username").trim(),
      password:fd.get("password"),
      nom:fd.get("nom"),
      postnom:fd.get("postnom"),
      prenom:fd.get("prenom"),
      fullname,
      telephone:fd.get("telephone"),
      fonction:fd.get("fonction"),
      role:fd.get("role"),
      sectionId:fd.get("sectionId"),
      sectionName:sec?.name||"",
      perms:[...document.querySelectorAll("[name=perms]:checked")].map(x=>x.value),
      locked:false,
      isDisabled:false
    });
    alert("Admin créé.");
    renderAdmin("admins");
  }
}



function dateMatchesFilter(dateValue,prefix,type){
  const val=document.getElementById(prefix+"Date")?.value||"";
  if(!val)return true;
  const d=new Date(dateValue||Date.now());
  if(isNaN(d.getTime()))return String(dateValue||"").includes(val);
  const y=String(d.getFullYear());
  const m=y+"-"+String(d.getMonth()+1).padStart(2,"0");
  const day=m+"-"+String(d.getDate()).padStart(2,"0");
  if(type==="year")return y===val;
  if(type==="month")return m===val;
  return day===val;
}
window.applyHistoryFilter=function(prefix){
  const type=document.getElementById(prefix+"Type")?.value||"day";
  document.querySelectorAll(`[data-${prefix}-date]`).forEach(tr=>{
    tr.style.display=dateMatchesFilter(tr.getAttribute(`data-${prefix}-date`),prefix,type)?"":"none";
  });
}
window.changeFilterType=function(prefix){
  const type=document.getElementById(prefix+"Type")?.value||"day";
  const input=document.getElementById(prefix+"Date");
  if(!input)return;
  input.type=type==="year"?"number":type;
  input.placeholder=type==="year"?"2026":"";
  input.value="";
  applyHistoryFilter(prefix);
}
function approvalStatusBadge(s){
  if(s==="approved")return `<span class="badge ok">Approuvé</span>`;
  if(s==="rejected")return `<span class="badge bad">Refusé</span>`;
  return `<span class="badge wait">En attente</span>`;
}
async function addApprovalRequest(data){
  await addItem("approvalRequests",{...data,status:"pending",requestedAt:new Date().toLocaleString(),requestedBy:adminUser.username,requestedByName:adminUser.fullname||adminUser.username});
}

function moneyFmt(n){return Number(n||0).toLocaleString("fr-FR")+" USD"}
function monthKey(d){try{return new Date(d).toISOString().slice(0,7)}catch(e){return String(d||"").slice(0,7)}}
function sum(arr,fn){return arr.reduce((a,x)=>a+Number(fn(x)||0),0)}


async function financePage(){
  let movements=await listDocs("financeMovements");
  let requests=await listDocs("approvalRequests");
  requests=requests.filter(x=>x.domain==="finance");
  if(!isSuper()&&adminUser.sectionId)movements=movements.filter(x=>!x.sectionId||x.sectionId===adminUser.sectionId);
  const entries=sum(movements.filter(x=>x.type==="entrée"),x=>x.amount);
  const exits=sum(movements.filter(x=>x.type==="sortie"),x=>x.amount);
  const balance=entries-exits;
  const max=Math.max(entries,exits,1);
  adminMain.innerHTML=`<div class=dash-hero><h1>Gestion financière</h1><p>Traçabilité complète. Les sorties sont envoyées en validation et l’historique n’est pas supprimable.</p></div><br>
  <div class="grid g3">
    <div class="stat-card"><span class=num>${moneyFmt(entries)}</span><span class=label>Total entrées</span></div>
    <div class="stat-card"><span class=num>${moneyFmt(exits)}</span><span class=label>Total sorties approuvées</span></div>
    <div class="stat-card"><span class=num>${moneyFmt(balance)}</span><span class=label>Solde</span></div>
  </div><br>
  <div class="grid g2">
    <div class=card><h2>Nouveau mouvement</h2><form id=financeForm>
      <div class=row><div><label>Type</label><select name=type><option value="entrée">Entrée directe</option><option value="sortie">Sortie à valider</option></select></div><div><label>Montant</label><input name=amount type=number step=0.01 required></div></div>
      <div class=row><div><label>Catégorie</label><input name=category placeholder="Cotisation, don, transport, activité..." required></div><div><label>Date</label><input name=date type=date required></div></div>
      <label>Motif / justification</label><textarea name=motif required></textarea>
      <label>Bénéficiaire / Source</label><input name=person placeholder="Nom de la personne ou structure">
      <label>Référence / preuve</label><input name=proof placeholder="Lien reçu, numéro transaction, référence...">
      <br><button class=btn>Enregistrer</button>
    </form></div>
    <div class=card><h2>Diagramme financier</h2>
      <div class=bar-label>Entrées : ${moneyFmt(entries)}</div><div class=bar><span style="width:${(entries/max)*100}%"></span></div>
      <div class=bar-label>Sorties approuvées : ${moneyFmt(exits)}</div><div class="bar redbar"><span style="width:${(exits/max)*100}%"></span></div>
      <div class=finance-balance>Solde actuel : <b>${moneyFmt(balance)}</b></div>
      <button class="btn green" onclick="printFinanceReport()">Rapport PDF</button>
    </div>
  </div><br>
  <div class=card><h2>Filtrer l’historique financier</h2>
    <div class=row>
      <div><label>Filtre</label><select id=financeType onchange="changeFilterType('finance')"><option value=day>Jour</option><option value=month>Mois</option><option value=year>Année</option></select></div>
      <div><label>Date / Mois / Année</label><input id=financeDate type=date oninput="applyHistoryFilter('finance')"></div>
    </div>
  </div><br>
  <div class=card><h2>Historique financier verrouillé</h2><p class=notice>Aucune suppression directe : chaque sortie reste traçable.</p><div class=table><table><tr><th>Date</th><th>Type</th><th>Montant</th><th>Catégorie</th><th>Motif</th><th>Personne</th><th>Référence</th><th>Validation</th></tr>
  ${movements.map(x=>`<tr data-finance-date="${esc(x.date||x.createdAt||"")}"><td>${esc(x.date||"")}</td><td>${esc(x.type||"")}</td><td>${moneyFmt(x.amount)}</td><td>${esc(x.category||"")}</td><td>${esc(x.motif||"")}</td><td>${esc(x.person||"")}</td><td>${esc(x.proof||"")}</td><td>${approvalStatusBadge(x.approvalStatus||"approved")}</td></tr>`).join("")}</table></div></div>
  <br><div class=card><h2>Sorties en attente</h2><div class=table><table><tr><th>Date</th><th>Montant</th><th>Motif</th><th>Bénéficiaire</th><th>Demandé par</th><th>Statut</th></tr>
  ${requests.map(x=>`<tr data-finance-date="${esc(x.requestedAt||"")}"><td>${esc(x.date||x.requestedAt||"")}</td><td>${moneyFmt(x.amount)}</td><td>${esc(x.motif||"")}</td><td>${esc(x.person||"")}</td><td>${esc(x.requestedByName||"")}</td><td>${approvalStatusBadge(x.status)}</td></tr>`).join("")}</table></div></div>`;
  financeForm.onsubmit=async e=>{
    e.preventDefault();let fd=new FormData(financeForm);
    const payload={type:fd.get("type"),amount:Number(fd.get("amount")),category:fd.get("category"),date:fd.get("date"),motif:fd.get("motif"),person:fd.get("person"),proof:fd.get("proof"),sectionId:adminUser.sectionId||"",sectionName:adminUser.sectionName||"",createdBy:adminUser.username,createdByName:adminUser.fullname||adminUser.username};
    if(fd.get("type")==="sortie"){
      await addApprovalRequest({domain:"finance",...payload});
      alert("Sortie envoyée pour approbation.");
    }else{
      await addItem("financeMovements",{...payload,approvalStatus:"approved"});
      alert("Entrée enregistrée.");
    }
    renderAdmin("finance");
  }
}
window.printFinanceReport=async()=>{let items=await listDocs("financeMovements");const entries=sum(items.filter(x=>x.type==="entrée"),x=>x.amount), exits=sum(items.filter(x=>x.type==="sortie"),x=>x.amount);printDoc("Rapport financier DSK",`<h2>Résumé</h2><p>Entrées : ${moneyFmt(entries)}<br>Sorties approuvées : ${moneyFmt(exits)}<br>Solde : ${moneyFmt(entries-exits)}</p><table><tr><th>Date</th><th>Type</th><th>Montant</th><th>Catégorie</th><th>Motif</th><th>Personne</th><th>Validation</th></tr>${items.map(x=>`<tr><td>${esc(x.date||"")}</td><td>${esc(x.type||"")}</td><td>${moneyFmt(x.amount)}</td><td>${esc(x.category||"")}</td><td>${esc(x.motif||"")}</td><td>${esc(x.person||"")}</td><td>${esc(x.approvalStatus||"approved")}</td></tr>`).join("")}</table>`)}



async function stockPage(){
  const [items,movs,requests]=await Promise.all([listDocs("stockItems"),listDocs("stockMovements"),listDocs("approvalRequests")]);
  const stockRequests=requests.filter(x=>x.domain==="stock");
  const totalItems=items.length, totalQty=sum(items,x=>x.qty), totalValue=sum(items,x=>Number(x.qty||0)*Number(x.value||0));
  adminMain.innerHTML=`<div class=dash-hero><h1>Stock & matériels de la structure</h1><p>Inventaire moderne. Les sorties/affectations sont soumises à validation et l’historique est verrouillé.</p></div><br>
  <div class="grid g3"><div class=stat-card><span class=num>${totalItems}</span><span class=label>Types matériels</span></div><div class=stat-card><span class=num>${totalQty}</span><span class=label>Quantité totale</span></div><div class=stat-card><span class=num>${moneyFmt(totalValue)}</span><span class=label>Valeur estimée</span></div></div><br>
  <div class="grid g2">
    <div class=card><h2>Ajouter matériel</h2><form id=stockForm>
      <div class=row><div><label>Nom matériel</label><input name=name placeholder="Moto, vélo, chaise..." required></div><div><label>Catégorie</label><input name=category placeholder="Transport, bureau, événement..." required></div></div>
      <div class=row><div><label>Quantité</label><input name=qty type=number required></div><div><label>Valeur unitaire</label><input name=value type=number step=0.01></div></div>
      <label>Localisation</label><input name=location placeholder="Siège, section, dépôt...">
      <label>État</label><select name=status><option>Bon</option><option>Moyen</option><option>Endommagé</option><option>En réparation</option></select>
      <br><button class=btn>Enregistrer matériel</button>
    </form></div>
    <div class=card><h2>Mouvement matériel</h2><form id=moveForm>
      <label>Matériel</label><select name=itemId>${items.map(i=>`<option value="${i.docId}">${esc(i.name)} (${i.qty||0})</option>`).join("")}</select>
      <div class=row><div><label>Type</label><select name=type><option value="entrée">Entrée directe</option><option value="sortie">Sortie à valider</option><option value="retour">Retour direct</option><option value="affectation">Affectation à valider</option></select></div><div><label>Quantité</label><input name=qty type=number required></div></div>
      <label>Motif</label><textarea name=motif required></textarea>
      <label>Bénéficiaire / responsable</label><input name=person>
      <br><button class="btn green">Enregistrer mouvement</button>
    </form></div>
  </div><br>
  <div class=card><h2>Filtrer l’historique stock</h2>
    <div class=row>
      <div><label>Filtre</label><select id=stockType onchange="changeFilterType('stock')"><option value=day>Jour</option><option value=month>Mois</option><option value=year>Année</option></select></div>
      <div><label>Date / Mois / Année</label><input id=stockDate type=date oninput="applyHistoryFilter('stock')"></div>
    </div>
  </div><br>
  <div class=card><h2>Inventaire</h2><div class=table><table><tr><th>Matériel</th><th>Catégorie</th><th>Qté</th><th>Valeur</th><th>Localisation</th><th>État</th></tr>${items.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${x.qty||0}</td><td>${moneyFmt(x.value)}</td><td>${esc(x.location||"")}</td><td>${esc(x.status||"")}</td></tr>`).join("")}</table></div><br><button class="btn green" onclick="printStockReport()">Rapport stock PDF</button></div>
  <br><div class=card><h2>Historique mouvements matériels verrouillé</h2><p class=notice>Aucune suppression directe : chaque mouvement reste traçable.</p><div class=table><table><tr><th>Date</th><th>Matériel</th><th>Type</th><th>Qté</th><th>Motif</th><th>Responsable</th><th>Validation</th></tr>${movs.map(x=>`<tr data-stock-date="${esc(x.date||"")}"><td>${esc(x.date||"")}</td><td>${esc(x.itemName||"")}</td><td>${esc(x.type||"")}</td><td>${x.qty||0}</td><td>${esc(x.motif||"")}</td><td>${esc(x.person||"")}</td><td>${approvalStatusBadge(x.approvalStatus||"approved")}</td></tr>`).join("")}</table></div></div>
  <br><div class=card><h2>Sorties stock en attente</h2><div class=table><table><tr><th>Date</th><th>Matériel</th><th>Type</th><th>Qté</th><th>Motif</th><th>Demandé par</th><th>Statut</th></tr>${stockRequests.map(x=>`<tr data-stock-date="${esc(x.requestedAt||"")}"><td>${esc(x.requestedAt||"")}</td><td>${esc(x.itemName||"")}</td><td>${esc(x.type||"")}</td><td>${x.qty||0}</td><td>${esc(x.motif||"")}</td><td>${esc(x.requestedByName||"")}</td><td>${approvalStatusBadge(x.status)}</td></tr>`).join("")}</table></div></div>`;
  stockForm.onsubmit=async e=>{e.preventDefault();let fd=new FormData(stockForm);await addItem("stockItems",{name:fd.get("name"),category:fd.get("category"),qty:Number(fd.get("qty")),value:Number(fd.get("value")||0),location:fd.get("location"),status:fd.get("status"),createdBy:adminUser.username});alert("Matériel enregistré.");renderAdmin("stock")}
  moveForm.onsubmit=async e=>{e.preventDefault();let fd=new FormData(moveForm);let it=items.find(i=>i.docId===fd.get("itemId"));if(!it)return alert("Aucun matériel.");let q=Number(fd.get("qty"));
    const payload={itemId:it.docId,itemName:it.name,type:fd.get("type"),qty:q,motif:fd.get("motif"),person:fd.get("person"),date:new Date().toLocaleString(),createdBy:adminUser.username,createdByName:adminUser.fullname||adminUser.username};
    if(fd.get("type")==="sortie"||fd.get("type")==="affectation"){
      if(Number(it.qty||0)-q<0)return alert("Stock insuffisant.");
      await addApprovalRequest({domain:"stock",...payload});
      alert("Demande envoyée pour approbation.");
    }else{
      let newQty=Number(it.qty||0)+q;
      await updateItem("stockItems",it.docId,{qty:newQty});
      await addItem("stockMovements",{...payload,approvalStatus:"approved"});
      alert("Mouvement enregistré.");
    }
    renderAdmin("stock")
  }
}
window.printStockReport=async()=>{let items=await listDocs("stockItems");printDoc("Rapport stock et matériels DSK",`<table><tr><th>Matériel</th><th>Catégorie</th><th>Quantité</th><th>Valeur</th><th>Localisation</th><th>État</th></tr>${items.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.category)}</td><td>${x.qty||0}</td><td>${moneyFmt(x.value)}</td><td>${esc(x.location||"")}</td><td>${esc(x.status||"")}</td></tr>`).join("")}</table>`)}


async function approvalsPage(){
  if(!has("approvals"))return adminMain.innerHTML="<div class=card>Accès réservé aux approbateurs.</div>";
  const requests=await listDocs("approvalRequests");
  const pending=requests.filter(x=>x.status==="pending");
  adminMain.innerHTML=`<div class=dash-hero><h1>Validation des sorties</h1><p>Un approbateur valide ou refuse les sorties d’argent et de matériels. Chaque décision reste tracée.</p></div><br>
  <div class=card><h2>Demandes en attente</h2><div class=table><table><tr><th>Date</th><th>Domaine</th><th>Détail</th><th>Motif</th><th>Demandé par</th><th>Action</th></tr>
  ${pending.map(x=>`<tr><td>${esc(x.requestedAt||"")}</td><td>${esc(x.domain||"")}</td><td>${x.domain==="finance"?moneyFmt(x.amount):`${esc(x.itemName||"")} - ${x.qty||0}`}</td><td>${esc(x.motif||"")}</td><td>${esc(x.requestedByName||"")}</td><td><button onclick="approveRequest('${x.docId}')">Approuver</button> <button onclick="rejectRequest('${x.docId}')">Refuser</button></td></tr>`).join("")}</table></div></div>
  <br><div class=card><h2>Historique validations</h2><div class=table><table><tr><th>Date demande</th><th>Domaine</th><th>Statut</th><th>Validé par</th><th>Date décision</th></tr>
  ${requests.map(x=>`<tr><td>${esc(x.requestedAt||"")}</td><td>${esc(x.domain||"")}</td><td>${approvalStatusBadge(x.status)}</td><td>${esc(x.approvedByName||"")}</td><td>${esc(x.approvedAt||"")}</td></tr>`).join("")}</table></div></div>`;
}
window.approveRequest=async function(id){
  const reqs=await listDocs("approvalRequests");const r=reqs.find(x=>x.docId===id);if(!r)return alert("Demande introuvable.");
  if(!confirm("Approuver cette sortie ?"))return;
  if(r.domain==="finance"){
    await addItem("financeMovements",{type:"sortie",amount:Number(r.amount),category:r.category,date:r.date,motif:r.motif,person:r.person,proof:r.proof,sectionId:r.sectionId||"",sectionName:r.sectionName||"",createdBy:r.requestedBy,createdByName:r.requestedByName,approvalStatus:"approved",approvedBy:adminUser.username,approvedByName:adminUser.fullname||adminUser.username,approvedAt:new Date().toLocaleString()});
  }
  if(r.domain==="stock"){
    const items=await listDocs("stockItems");const it=items.find(x=>x.docId===r.itemId);if(!it)return alert("Matériel introuvable.");
    const newQty=Number(it.qty||0)-Number(r.qty||0);if(newQty<0)return alert("Stock insuffisant.");
    await updateItem("stockItems",it.docId,{qty:newQty});
    await addItem("stockMovements",{itemId:r.itemId,itemName:r.itemName,type:r.type,qty:r.qty,motif:r.motif,person:r.person,date:new Date().toLocaleString(),createdBy:r.requestedBy,createdByName:r.requestedByName,approvalStatus:"approved",approvedBy:adminUser.username,approvedByName:adminUser.fullname||adminUser.username,approvedAt:new Date().toLocaleString()});
  }
  await updateItem("approvalRequests",id,{status:"approved",approvedBy:adminUser.username,approvedByName:adminUser.fullname||adminUser.username,approvedAt:new Date().toLocaleString()});
  alert("Sortie approuvée.");renderAdmin("approvals");
}
window.rejectRequest=async function(id){
  const reason=prompt("Motif du refus :","");if(reason===null)return;
  await updateItem("approvalRequests",id,{status:"rejected",rejectReason:reason,approvedBy:adminUser.username,approvedByName:adminUser.fullname||adminUser.username,approvedAt:new Date().toLocaleString()});
  alert("Demande refusée.");renderAdmin("approvals");
}

async function reviews(){let r=await listDocs("reviews");adminMain.innerHTML=`<div class=card><h2>Avis</h2>${r.map(x=>`<div class=card><b>${esc(x.name)}</b><p>${esc(x.message)}</p></div>`).join("")||"Aucun avis"}</div>`}
async function adminChat(){adminMain.innerHTML=`<div class=card><h2>Chat super admin ↔ admins</h2><div class=chat-box id=box></div><textarea id=msg></textarea><button class="btn green" id=send>Envoyer</button></div>`;listenDocs("adminChats",items=>{box.innerHTML=items.map(c=>`<div class="chat-msg ${c.username===adminUser.username?'mine':''}"><div class=chat-meta>${esc(c.author)} • ${esc(c.date)}</div>${esc(c.message)}</div>`).join("");box.scrollTop=box.scrollHeight});send.onclick=async()=>{if(!msg.value.trim())return;await addItem("adminChats",{author:adminUser.fullname||adminUser.username,username:adminUser.username,message:msg.value,date:new Date().toLocaleString()});msg.value=""}}
window.addEventListener("pageshow",()=>document.querySelectorAll('input[type="password"]').forEach(i=>i.value=""));renderAdmin();
