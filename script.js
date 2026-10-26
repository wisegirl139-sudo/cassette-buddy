import { supabase } from "./supabase.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
async function startsesh() {
    const {data:existing}=await supabase.auth.getSession();
    if (existing.session) return true;
    const {error} = await supabase.auth.signInAnonymously();
    if (error) {
        console.error("Could not start session:", error.message);
        return false;
    }
    return true;
}
const sessionReady = startsesh();
const sce=new THREE.Scene();
sce.background=null;
const cam=new THREE.PerspectiveCamera(45,1,0.1,1000);
cam.position.set(0,0,5);
cam.lookAt(0,0,0);
const ren=new THREE.WebGLRenderer({antialias:true,alpha:true});
ren.setPixelRatio(window.devicePixelRatio);
document.querySelector("#sce").appendChild(ren.domElement);
const ctl= new OrbitControls(cam,ren.domElement);
ctl.enableDamping=true;
ctl.dampingFactor=0.05;
ctl.enableZoom=true;
ctl.minDistance=2;
ctl.maxDistance=10;
ctl.target.set(0,0,0);
ctl.update();
//lets light up the fitting rrom , literally adding lighting and fitting to screen 
const lit=new THREE.AmbientLight(0xffffff,2);
sce.add(lit);
const sun=new THREE.DirectionalLight(0xffffff,3);
sun.position.set(2,3,5);
sce.add(sun);
function size(){
    const el= document.querySelector("#sce");
    ren.setSize(el.clientWidth,el.clientHeight);
    cam.aspect=el.clientWidth/el.clientHeight;
    cam.updateProjectionMatrix();
    ren.render(sce,cam);
}
//cassette time
let mats;
let cent;
let sca;
function addWheel(wheel, name) {
    wheel.rotation.x=-Math.PI/2;
    wheel.scale.setScalar(sca);
    const box=new THREE.Box3().setFromObject(wheel);
    const ctr=box.getCenter(new THREE.Vector3());
    const pivot= new THREE.Group();
    pivot.position.set(-cent.x*sca+ctr.x,-cent.y*sca+ctr.y,-cent.z*sca+ctr.z);
    sce.add(pivot);
    wheel.position.sub(ctr);
    pivot.add(wheel);
    parts[name]=pivot;
}
const parts={};
const mtl= new MTLLoader();
mtl.setPath("models/");
mtl.load("body.mtl",loadedMats=>{
    mats=loadedMats;
    mats.preload();
    const obj= new OBJLoader();
    obj.setMaterials(mats);
    obj.setPath("models/");
    obj.load("body.obj",body=>{
        parts.body=body;
        body.position.set(0,0,0);
        sce.add(body);
        body.rotation.x=-Math.PI/2;
        parts.body=body;
        const box = new THREE.Box3().setFromObject(body);
        cent = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        sca = 3 / Math.max(size.x, size.y, size.z);
        body.scale.setScalar(sca);
        body.position.set(-cent.x*sca,-cent.y*sca,-cent.z*sca);
        document.querySelector("#stat").textContent="";
        ren.render(sce,cam);
        const wload= new OBJLoader();
        wload.setPath("models/");
        wload.load("leftw.obj", wheel => {
            addWheel(wheel, "leftw");
        });
        const rload=new OBJLoader();
        rload.setPath("models/");
        rload.load("rightw.obj", wheel => {
            addWheel(wheel, "rightw");
        });
    
    });

});
size();
window.addEventListener("resize",size);
ren.render(sce,cam);
//forgot to comment for a while but rn im just adding like pivots and stuff might change up code drastically

const playlist=document.querySelector("#playlist");
const play=document.querySelector("#play");
const up=document.querySelector("#up");
const sound=document.querySelector("#sound");//i should really get somw sound sleep on g
function spin() {
    if(!sound.paused && !sound.ended){
        if (parts.leftw) parts.leftw.rotation.z += 0.05;
        if (parts.rightw) parts.rightw.rotation.z += 0.05; 
    }
    ctl.update();
    ren.render(sce, cam);
    requestAnimationFrame(spin);
}
spin();
play.addEventListener("click",()=>{
    if(sound.paused){
        sound.play();
    }else{
        sound.pause();
    }
});
sound.addEventListener("play",()=>{
    play.textContent="PAUSE";
});
sound.addEventListener("pause",()=>{
    play.textContent="PLAY";
});
let currentroomid=null;
let currentroomcode=null;
let songs = [];
let current = -1;
let songchannel=null;
async function lsd(){
    if(!currentroomid) return;
    const {data,error}=await supabase.from("songs").select("*").eq("room_id",{ascending:true});
    if(error){
        console.error("could not load playlist:",error.message);
        return;
    }
    songs=data;
    renderPlaylist();
}
function renderPlaylist(){
    playlist.innerHTML="";
    songs.forEach((song,i)=>{
        const item=document.createElement("p");
        item.textContent=song.title;
        item.classList.add("track");
        item.addEventListener("click",async()=>{
            current=i;
            const {data,error}=await supabase.from("songs").select("*").eq("room_id", currentroomid).order("created_at", {ascending:true});
            if(error){
                console.error("could not access audio:",error.message);
                alert("couldnt load this song");
                return;
            }
            sound.src=data.signedUrl;
            sound.load();
            document.querySelector("#songn").textContent=song.title;
            play.disabled=false;
            sound.play.catch(err=>console.error("playback failed:",err));
        });
        playlist.appendChild(item);
    });
}
async function uploadsongs(files) {
    if(!currentroomid){
        alert("create or join a room before uploading songs");
        return;

    }
    for(const file of files){
        if(!file.type.startsWith("audio/")){
            console.warn("skipping non audio files:",file.name);//precautions u can tell when i havent done smth for a wheile if theres a lot of precautions
            continue;
        }
        const safename=file.name.replace(/[^\w.-]/g, "_");
        const path=`${currentroomid}/${crypto.randomUUID()}-${safename}`;
        const{error:uploadError}=await supabase.storage.from("songs").upload(path,file,{contentType:file.type});
        if(uploadError){
            console.error("upload failed:", uploadError.message);
            alert("couldnt upload"+file.name+".check the console");
            continue;
        }
        const {error:insertError}=await supabase.from("songs").insert({room_id:currentroomid,title:file.name,file_url:path});
        if(insertError){
            console.error("saving song failed",insertError.message);
            alert("uploaded the file but cant add to play list ")
        }

    }
    
    await lsd();

}
//this is starting to pmo ong like wtf is thiss uhreqfcdgbshnachwdina
up.addEventListener("change",async()=>{
    await uploadsongs([...up.files]);
    up.value="";
});
function sts(){
    if(!currentroomid) return;
    if(songchannel){
        supabase.removeChannel(songchannel);
    }
    songchannel=supabase.channel("room-songs-"+currentroomid).on("postgres_changes",{event:"*",schema:"public",table:"songs", filter:"room_id=eq."+currentroomid},()=>lsd()).subscribe();
}
sound.addEventListener("ended",()=>{
    if(current>=0 && current<songs.length-1){
        const next= playlist.children[current+1];
        if(next) next.click();
    }
});
//i genuinely forgot about the volume and the prog bar ong
const vol=document.querySelector("#vol");
vol.addEventListener("input",()=>{
    sound.volume=vol.value;
});
const seek=document.querySelector("#seek");
const time=document.querySelector("#time");
const dur=document.querySelector("#dur");
function fortime(s){
    const m= Math.floor(s/60);
    const sec=Math.floor(s%60);
    return`${m}:${String(sec).padStart(2,"0")}`;
}
sound.addEventListener("loadedmetadata",()=>{
    seek.max=sound.duration;
    dur.textContent=fortime(sound.duration);
});
sound.addEventListener("timeupdate",()=>{
    seek.value=sound.currentTime;
    time.textContent=fortime(sound.currentTime);
});
seek.addEventListener("input",()=>{
    sound.currentTime=seek.value
});
const notes=document.querySelector("#notes");
function makenote(){
    const note=document.createElement("img");
    note.classList.add("note");
    note.src=["img/note1.png","img/note2.png","img/note3.png"][Math.floor(Math.random()*3)];
    note.style.left=Math.random()*100+"%";
    notes.appendChild(note);
    note.addEventListener("animationend",()=>note.remove());
}
let notetimer;
sound.addEventListener("play",()=>{
    makenote();
    notetimer=setInterval(makenote,500);
});
sound.addEventListener("pause",()=>{
    clearInterval(notetimer);
});
sound.addEventListener("ended",()=>{
    clearInterval(notetimer);
});
//doing create+join room

async function createroom() {
    const ready=await startsesh();
    if(!ready) return;
    const {data,error}=await supabase.rpc("create_room");
    if(error){
        console.error("room creation failed:",error.message);
        alert("couldnt create room check console");
        return;
    }
    currentroomid=data.room_id;
    currentroomcode=data.code
    await lsd();
    sts();
    console.log("room id:", currentroomid);
    alert("your room code is :"+currentroomcode);
}
async function joinroom(code) {
    const ready=await startsesh();
    if(!ready) return;
    const{data,error}=await supabase.rpc("join_room",{room_code:code.trim().toUpperCase()});
    if(error){
        console.error("joining room failed:",error.message);
        alert("check console smth failed")
        return;
    }
    if(!data){
        alert("room not found,check code");
        return;
    }
    currentroomcode=data.code;
    currentroomid=data.room_id;
        await lsd();
    sts();
    alert("joined room:"+ currentroomcode);
    console.log("room id:",currentroomid)
}
//aghh finally back to frontish a place i truly call home 
document.querySelector("#creroom").addEventListener("click",async()=>{
    await createroom();
    if(currentroomcode){
        document.querySelector("#roomstat").textContent="room code:"+currentroomcode;
    }
});
document.querySelector("#joinroom").addEventListener("click",async()=>{
    const code=document.querySelector("#roomcode").value;
    if(!code.trim()){
        alert("enter a room code first");
        return;
    }
    await joinroom(code);
    if(currentroomcode){document.querySelector("#roomstat").textContent="joined room:"+currentroomcode}
});