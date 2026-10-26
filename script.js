import { supabase } from "./supabase.js";
async function startsesh(){
    const{data,error}=await supabase.auth.signInAnonymously();
    if(error){
        console.error("could not start session:",error.message);
        return false;
    }
    return true;
}
const sessionReady=startsesh();
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
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
let songs = [];
let current = -1;
up.addEventListener("change",()=>{
    songs.push(...up.files);
    playlist.innerHTML = "";
    songs.forEach((file, i)=>{
        const song = document.createElement("p");
        song.textContent = file.name;
        song.classList.add("track");
        song.addEventListener("click", ()=>{
            current=i;
            sound.src=URL.createObjectURL(file);
            sound.load();
            document.querySelector("#songn").textContent=file.name;
            play.disabled= false;
            sound.play();
        });
        playlist.appendChild(song);
    });
    up.value="";
});

sound.addEventListener("ended",()=>{
    if (current<songs.length-1 && current>=0){
        current++;
        sound.src=URL.createObjectURL(songs[current]);
        sound.load();
        document.querySelector("#songn").textContent=songs[current].name;
        sound.play();
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
        return;
    }
    console.log("your room code:",data);
    alert("your room code is :"+data);
}
