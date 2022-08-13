import*as THREE from "https://threejs.org/build/three.module.js";
import {OrbitControls} from "https://threejs.org/examples/jsm/controls/OrbitControls.js";
import {GLTFLoader} from "https://threejs.org/examples/jsm/loaders/GLTFLoader.js";
import {RGBELoader} from "https://threejs.org/examples/jsm/loaders/RGBELoader.js";

import Qube from "./qube.js";
//import MouseRaycaster from "../core/js/rendering/camera2/MouseRaycaster.js";
//import ZoomToCursorBehavior from "../core/js/rendering/camera2/ZoomToCursorBehavior.js";

const camera = new THREE.PerspectiveCamera(60,window.innerWidth / window.innerHeight,0.1,1000);
camera.position.set(1, 1, 1).multiplyScalar(8);

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

/*
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
*/

renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
renderer.setClearColor('white')
const controls = new OrbitControls(camera,renderer.domElement);
//controls.autoRotate= true
controls.autoRotateSpeed = 1;
controls.enablePan = false;

let envMaps=['evening_meadow_1k.hdr','pretville_street_1k (1).hdr','solitude_interior_1k.hdr']
function loadHDREquirect(path) {
    var pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    new RGBELoader().setPath('').load(path,
    function(texture) {
        var envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.background = envMap;
        scene.environment = envMap;
        texture.dispose();
        pmremGenerator.dispose();
    })
}
let arnd =(a)=>a[(a.length*Math.random())|0]
loadHDREquirect('./'+envMaps[2])//arnd(envMaps));//pretville_street_1k (1).hdr')
//solitude_interior_1k.hdr

const clock = new THREE.Clock();

onWindowResize();
window.addEventListener("resize", onWindowResize, false);
/*
const lights = new THREE.Object3D();
let light = new THREE.DirectionalLight("white",1.1);
light.shadow.enabled = true;
light.position.set(1, 1, 1).multiplyScalar(100);
lights.add(light);
//Set up shadow properties for the light
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.radius = 4;
let lc = light.shadow.camera;
lc.near = 0.5;
lc.far = 500;
lc.left = lc.bottom = -120;
lc.right = lc.top = 120;
lc.updateProjectionMatrix();
light.shadow.bias = -0.0005;

let dirLight = light;
dirLight.castShadow = true;

let light1 = new THREE.PointLight(0xffffff);
light1.position.set(5, 9, -5).multiplyScalar(100);
*/
let light2 = new THREE.PointLight(0xffffff,100,10,2);
light2.position.set(0, 0, .1)
camera.add(light2)
//scene.add(lights);

scene.add(camera);

let qube = new Qube(THREE,scene,GLTFLoader)

function render() {
    qube.update()
    controls.update();
    renderer.render(scene, camera);
}

document.addEventListener("keydown", qube.handleKey)

function onWindowResize(event) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function animate() {
    render();
}

let dragStartHits;

let hitIndicator = new THREE.Mesh(new THREE.PlaneGeometry(.5,.5),new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide
}))
hitIndicator.geometry.translate(0, 0, .01)
hitIndicator.renderOrder = 2;
hitIndicator.material.depthFunc = THREE.GreaterDepth;
hitIndicator.onBeforeRender = function() {
    if (!dragStartHits)
        this.scale.multiplyScalar(.98)
    if (this.scale.x < .001)
        this.parent.remove(this);
}
let dragIndicator = hitIndicator.clone();
let v0 = new THREE.Vector3()
let v1 = new THREE.Vector3()
let v2 = new THREE.Vector3()
let normalMatrix = new THREE.Matrix3()
let showHit = (hit,hitIndicator)=>{
    if (hit.object != hitIndicator) {
        //scene.traverse(e=>e.isMesh&&(e.material.wireframe=true))
        hitIndicator.scale.set(1, 1, 1)
        hitIndicator.position.copy(hit.point)
        scene.add(hitIndicator);
        normalMatrix.getNormalMatrix(hit.object.matrixWorld);

        v0.copy(hit.face.normal).applyMatrix3(normalMatrix).normalize();
        v1.copy(hitIndicator.position).sub(v0)
        hitIndicator.lookAt(v1)
    }
}

export default function MouseRaycaster(THREE) {
    const mouse = new THREE.Vector2();
    let raycaster = new THREE.Raycaster()
    this.raycast = ({event, camera, root, recursive=true})=>{
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera)
        if (typeof root === 'array')
            return raycaster.intersectObjects(root, recursive);
        return raycaster.intersectObject(root, recursive);
    }
}

let mouseRaycaster = new MouseRaycaster(THREE)

let doRaycast = ()=>{
    let hits = mouseRaycaster.raycast({
        event,
        camera,
        root: qube.root,
        recursive: true
    })
    //console.log(hits)
    if (hits.length) {
        return hits;
    }
}

function pup(event) {
    let dragEndHits = doRaycast()
    if (dragEndHits) {
        qube.drag(dragStartHits, dragEndHits)
    }
    dragStartHits = dragEndHits = undefined;
    controls.enabled = true;
    document.removeEventListener('pointermove', pmove)
    document.removeEventListener('pointerup', pup)
}

function pmove(event) {
    let dragMoveHits = doRaycast()
    if (dragMoveHits)
        showHit(dragMoveHits[0], dragIndicator)
}
function pdown(event) {
    if (dragStartHits = doRaycast()) {
        showHit(dragStartHits[0], hitIndicator)
        controls.enabled = false;
        document.addEventListener('pointermove', pmove)
        document.addEventListener('pointerup', pup)
    }
}
document.addEventListener('pointerdown', pdown)

renderer.setAnimationLoop(animate);
