
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, orderBy, query, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
export const app=initializeApp(firebaseConfig); export const db=getFirestore(app);
export const adminFunctions=["CGen","CGACIC","CGACQPS","Sec Gen","APCCPM","CMGSSB","CASH","CRP","CLD","ASPLCF","CSPP","CS","CJ"];
export const defaultSite={partyName:"DSK Congo",slogan:"Unité • Développement • Engagement",topText:"DSK Congo — Plateforme officielle de communication, mobilisation et gestion des membres",heroTitle:"DSK Congo, ensemble pour le développement et la bonne gouvernance",heroSubtitle:"Une plateforme moderne pour informer, mobiliser, enregistrer les membres et renforcer la communication.",priorities:"📢|Communication officielle|Publier les communiqués, annonces et informations importantes.\n🤝|Mobilisation des membres|Encadrer les cellules, réunions, activités et campagnes sur terrain.\n🗂️|Gestion transparente|Suivre les adhésions, les avis citoyens, les programmes et les communications internes.",vision:"Construire une organisation politique moderne, responsable et proche de la population.",mission:"Informer, mobiliser, encadrer les membres et promouvoir la bonne gouvernance.",organization:"Présidence, secrétariat général, coordinations, fédérations, sections, cellules et membres actifs.",aboutExtra:"DSK Congo place la communication, la discipline, l’engagement et la proximité avec la base au centre de son action.",aboutCards:"🏛️|Identité|DSK Congo est une structure organisée autour de la discipline, de la mobilisation et de la responsabilité.\n🎯|Objectif|Renforcer la proximité avec la base et soutenir les actions de développement.\n🤝|Engagement|Travailler avec les membres, les sections et les responsables dans un esprit d’unité.",email:"contact@dsk.org",phone:"+243 XXX XXX XXX",whatsapp:"+243 XXX XXX XXX",address:"République Démocratique du Congo",mapEmbedUrl:"https://www.google.com/maps?q=Kolwezi%20RDC&output=embed",facebook:"#",youtube:"#",tiktok:"#",facebookUrl:"#",instagramUrl:"#",tiktokUrl:"#",youtubeUrl:"#",xUrl:"#",logoUrl:"",leaderPhotoUrl:"assets/img/leader-simplice.png",officialLeaderPhoto:"assets/img/leader-simplice.png",officialSignatureUrl:"assets/img/signature-simplice.png",officialPresidentName:"Simplice KUMBUNGE",officialPresidentTitle:"Président",heroBgUrl:"",homeGallery:"",footer:"Plateforme officielle de communication, mobilisation et gestion des membres.",programIntro:"Nos programmes sont orientés vers la jeunesse, la bonne gouvernance, l’emploi, la paix sociale, l’éducation civique et le développement local.",newsIntro:"Retrouvez ici les dernières actualités, communiqués, images, vidéos et documents officiels de DSK Congo.",commIntro:"Espace réservé aux membres approuvés. L’accès exige l’ID membre et le mot de passe.",adhesionIntro:"Remplissez le formulaire d’adhésion. Après validation par l’administration, vous recevrez votre ID et pourrez accéder aux communications internes."};
export const defaultAdmins=[{username:"Dieumerci",password:"Ir20465858@a",fullname:"Dieumerci MUBULU",adminId:"DSK-SA-202606-583714-MD-SupAd",fonction:"Super Admin",role:"superadmin",sectionId:"",sectionName:"Toutes les sections",perms:["dashboard","site","pages","sections","management","news","programs","communications","members","reviews","admins","adminChat"],locked:true,isDisabled:false}];
export async function initDefaults(){if(sessionStorage.getItem("dsk_defaults_checked")==="yes")return;const sref=doc(db,"settings","site");const ss=await getDoc(sref);if(!ss.exists())await setDoc(sref,defaultSite);const aref=doc(db,"admins","Dieumerci");const aa=await getDoc(aref);if(!aa.exists())await setDoc(aref,defaultAdmins[0]);await ensureDefaultSections();sessionStorage.setItem("dsk_defaults_checked","yes")}
export async function getSite(){const snap=await getDoc(doc(db,"settings","site"));return snap.exists()?{...defaultSite,...snap.data()}:defaultSite}
export async function saveSite(data){await setDoc(doc(db,"settings","site"),data,{merge:true})}
export async function listDocs(name){
  try{
    if(name==="admins"){
      const snap=await getDocs(collection(db,name));
      return snap.docs.map(d=>({docId:d.id,...d.data()}));
    }
    const snap=await getDocs(query(collection(db,name),orderBy("createdAt","desc")));
    return snap.docs.map(d=>({docId:d.id,...d.data()}));
  }catch(e){
    const snap=await getDocs(collection(db,name));
    return snap.docs.map(d=>({docId:d.id,...d.data()}));
  }
}
export function listenDocs(name,callback){return onSnapshot(query(collection(db,name),orderBy("createdAt","asc")),snap=>callback(snap.docs.map(d=>({docId:d.id,...d.data()}))))}
export async function addItem(name,data){return await addDoc(collection(db,name),{...data,createdAt:serverTimestamp()})}
export async function updateItem(name,id,data){return await updateDoc(doc(db,name,id),data)}
export async function removeItem(name,id){return await deleteDoc(doc(db,name,id))}
export async function getAdmin(username){const s=await getDoc(doc(db,"admins",username));return s.exists()?{docId:s.id,...s.data()}:null}
export async function saveAdmin(admin){
  const ref=doc(db,"admins",admin.username);
  const old=await getDoc(ref);
  const payload={...admin,updatedAt:serverTimestamp()};
  if(!old.exists()) payload.createdAt=serverTimestamp();
  await setDoc(ref,payload,{merge:true});
}
export async function deleteAdmin(username){await deleteDoc(doc(db,"admins",username))}
export async function listSections(){const snap=await getDocs(query(collection(db,"sections"),orderBy("name","asc")));return snap.docs.map(d=>({docId:d.id,...d.data()}))}
export async function saveSection(data){if(data.docId){const id=data.docId;delete data.docId;await updateDoc(doc(db,"sections",id),data)}else await addDoc(collection(db,"sections"),{...data,createdAt:serverTimestamp()})}
export async function ensureDefaultSections(){const sections=await listSections();if(sections.length===0)await addDoc(collection(db,"sections"),{name:"Section principale",description:"Section par défaut",createdAt:serverTimestamp()})}
export function esc(t){return String(t||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
export function splitLinks(text){return String(text||"").split(/[\n,]+/).map(x=>x.trim()).filter(Boolean)}
export function linksToText(arr){return Array.isArray(arr)?arr.join("\n"):""}
export function normalizePost(data){const imageUrls=data.imageUrls||splitLinks(data.imageUrl||data.images||"");const fileUrls=data.fileUrls||splitLinks(data.fileUrl||data.files||"");return {...data,imageUrls,fileUrls,imageUrl:imageUrls[0]||"",fileUrl:fileUrls[0]||""}}
export function contactHTML(s){const email=s.email||"";const phone=s.phone||"";const whatsapp=s.whatsapp||phone;const cp=phone.replace(/\s+/g,"");const cw=whatsapp.replace(/\s+/g,"").replace("+","");return `<a href="mailto:${email}">${email}</a><br><a href="tel:${cp}">${phone}</a><br><a href="https://wa.me/${cw}" target="_blank">WhatsApp : ${whatsapp}</a><br>${esc(s.address||"")}`}
export function galleryBlock(item){item=normalizePost(item);const imgs=item.imageUrls||[];if(imgs.length===0)return `<div style="height:230px;background:linear-gradient(135deg,#041735,#0b4aa2);display:flex;align-items:center;justify-content:center;color:white;font-weight:950;font-size:34px">DSK</div>`;if(imgs.length===1)return `<img class="cover" src="${imgs[0]}" alt="">`;return `<div class="gallery-wrap"><div class="gallery"><img src="${imgs[0]}" alt=""><div class="sideimgs">${imgs.slice(1,3).map(u=>`<img src="${u}" alt="">`).join("")}</div></div><span class="gallery-count">${imgs.length} photos</span></div>`}
export function fileLinks(item){item=normalizePost(item);let h="";(item.fileUrls||[]).forEach((u,i)=>h+=`<p><a class="btn light small" href="${u}" target="_blank">📎 Document ${i+1}</a></p>`);if(item.videoUrl)h+=`<p><a class="btn light small" href="${item.videoUrl}" target="_blank">🎥 Voir la vidéo</a></p>`;return h}
export function cards(lines){return (lines||"").split("\\n").filter(x=>x.trim()).map(l=>{let p=l.split("|");return {i:p[0]||"●",t:p[1]||"",d:p.slice(2).join("|")||""}})}
