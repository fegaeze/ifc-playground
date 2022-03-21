import {
    AmbientLight,
    AxesHelper,
    DirectionalLight,
    GridHelper,
    PerspectiveCamera,
    Scene,
    WebGLRenderer,
    Raycaster,
    Vector2,
    MeshLambertMaterial
} from "three";
import {
    acceleratedRaycast,
    computeBoundsTree,
    disposeBoundsTree
} from 'three-mesh-bvh';
import {
    IFCWALLSTANDARDCASE,
    IFCSLAB,
    IFCDOOR,
    IFCWINDOW,
    IFCFURNISHINGELEMENT,
    IFCMEMBER,
    IFCPLATE
} from 'web-ifc';
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";


/* 
    ================================================================
    SETUP OF SCENE START
    This section creates the scene setup using three JS. 
    Configured components include: Scene, Camera, Renderer, Controls
    ================================================================
*/

// Creates the Three.js scene
const scene = new Scene();


// Object to store the size of the viewport
const size = {
    width: window.innerWidth,
    height: window.innerHeight,
};


// Creates the camera (point of view of the user)
const aspect = size.width / size.height;
const camera = new PerspectiveCamera(75, aspect);

camera.position.z = 15;
camera.position.y = 13;
camera.position.x = 8;


// Creates the lights of the scene
const lightColor = 0xffffff;

const ambientLight = new AmbientLight(lightColor, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(lightColor, 1);

directionalLight.position.set(0, 10, 0);
directionalLight.target.position.set(-5, 0, 0);

scene.add(directionalLight);
scene.add(directionalLight.target);


// Sets up the renderer, fetching the canvas of the HTML
const threeCanvas = document.getElementById("three-canvas");

const renderer = new WebGLRenderer({
    canvas: threeCanvas,
    alpha: true
});

renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Creates grids and axes in the scene
const grid = new GridHelper(50, 30);
scene.add(grid);

const axes = new AxesHelper();
axes.material.depthTest = false;
axes.renderOrder = 1;
scene.add(axes);


// Creates the orbit controls (to navigate the scene)
const controls = new OrbitControls(camera, threeCanvas);
controls.enableDamping = true;
controls.target.set(-2, 0, 0);

// Animation loop
const animate = () => {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
};

animate();

//Adjust the viewport to the size of the browser
window.addEventListener("resize", () => {
    size.width = window.innerWidth;
    size.height = window.innerHeight;

    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();

    renderer.setSize(size.width, size.height);
});

// Clear localstorage
localStorage.clear();

/* 
    ================================================================
    SETUP OF SCENE END
    ================================================================
*/

const propertiesSelect = document.getElementById("properties");
const propertiesSection = document.getElementById("properties-section");


/* 
    ================================================================
    LOADER FUNCTIONALITY START
    It is possible to upload, hardcode as well as load IFC models 
    from an external service. It also provides a function that can 
    display a loading bar to show how the loading is going.
    ================================================================
*/
let ifcModels = [];
let ifcLoader = new IFCLoader();
const ifc = ifcLoader.ifcManager;

const input = document.getElementById("file-input");

input.addEventListener("change", async (event) => {
    await ifc.setWasmPath("wasm/");

    const file = event.target.files[0];
    var ifcURL = URL.createObjectURL(file);

    propertiesSelect.selectedIndex = 0;

    ifcLoader.load(ifcURL, (ifcModel) => {
        ifcModels.push(ifcModel);
        scene.add(ifcModel);
    });
}, false);

/* 
    ================================================================
    LOADER FUNCTIONALITY END
    ================================================================
*/


/* 
    ================================================================
    MODEL INTERACTION - PICKING START
    Function fires a ray and returns the object it collides with. 
    No highlighting invlolved, simply used to select objects
    ================================================================
*/

// Sets up optimized picking
ifc.setupThreeMeshBVH(computeBoundsTree, disposeBoundsTree, acceleratedRaycast);

const raycaster = new Raycaster();
raycaster.firstHitOnly = true;

const mouse = new Vector2();

let modelID;

// A function for the Raycaster to cast rays, calculating the position of the mouse on the screen
const cast = event => {

    // Computes the position of the mouse on the screen
    const bounds = threeCanvas.getBoundingClientRect();
  
    const x1 = event.clientX - bounds.left;
    const x2 = bounds.right - bounds.left;
    mouse.x = (x1 / x2) * 2 - 1;
  
    const y1 = event.clientY - bounds.top;
    const y2 = bounds.bottom - bounds.top;
    mouse.y = -(y1 / y2) * 2 + 1;
  
    // Places it on the camera pointing to the mouse
    raycaster.setFromCamera(mouse, camera);
  
    // Casts a ray
    return raycaster.intersectObjects(ifcModels);
}

function saveProperties(native, type, material, sets, spatial) {
    localStorage.setItem("native", JSON.stringify(native, null, 2));
    localStorage.setItem("type", JSON.stringify(type, null, 2));
    localStorage.setItem("material", JSON.stringify(material, null, 2));
    localStorage.setItem("sets", JSON.stringify(sets, null, 2));
    localStorage.setItem("spatial", JSON.stringify(spatial, null, 2));

    propertiesSection.innerHTML = localStorage.getItem("native");
}

async function pick(event) {
    const found = cast(event)[0];
    if (found) {
        const index = found.faceIndex;
        const geometry = found.object.geometry;
        const id = ifc.getExpressId(geometry, index);
        modelID = found.object.modelID;

        const sets = await ifc.getPropertySets(modelID, id);  
        const type = await ifc.getTypeProperties(modelID, id);  
        const spatial = await ifc.getSpatialStructure(modelID);
        const native = await ifc.getItemProperties(modelID, id);   
        const material = await ifc.getMaterialsProperties(modelID, id);  

        saveProperties(native, type, material, sets, spatial);
    }
}

threeCanvas.ondblclick = (event) => {
    localStorage.clear();
    pick(event);
};

/* 
    ================================================================
    MODEL INTERACTION - PICKING END
    ================================================================
*/

propertiesSelect.onchange = (event) => {
    const property = event.target.value;
    propertiesSection.innerHTML = localStorage.getItem(`${property}`);
}


/* 
    ================================================================
    MODEL INTERACTION - HIGHLIGHTING (SUBSETS) START
    ================================================================
*/

// === SINGLE SUBSET ===

// Creates subset material
const preselectMat = new MeshLambertMaterial({
    transparent: true,
    opacity: 0.6,
    color: 0xff88ff,
    depthTest: false
})

// Reference to the previous selection
let preselectModel = { id: - 1};

function highlight(event, material, model) {
    const found = cast(event)[0];
    if (found) {

        // Gets model ID
        model.id = found.object.modelID;

        // Gets Express ID
        const index = found.faceIndex;
        const geometry = found.object.geometry;
        const id = ifc.getExpressId(geometry, index);

        // Creates subset
        ifc.createSubset({
            modelID: model.id,
            ids: [id],
            material: material,
            scene: scene,
            removePrevious: true
        })
    } else {
        // Removes previous highlight
        ifc.removeSubset(model.id, material);
    }
}

window.onmousemove = (event) => highlight(event, preselectMat, preselectModel);


// === MULTIPLE SUBSET ===

const selectMat = new MeshLambertMaterial({
    transparent: true,
    opacity: 0.6,
    color: 0xff00ff,
    depthTest: false 
});

const selectModel = { id: - 1};

window.ondblclick = (event) => highlight(event, selectMat, selectModel);


/* 
    SHOW ONLY PARTS OF MODEL
    If you create a geometry subset and do not specify a highlight material, 
    the subset will have the original materials. This would allow, for example, 
    to create a geometric subset with all the ground floor elements of the 
    BIM model and hide the rest.
*/

// Apply a transparent material to the loaded IFC model
// ifcModels[0].material = new MeshLambertMaterial({
//     transparent: true,
//     opacity: 0.1,
//     color: 0x77aaff
// });

// window.onmousemove = (event) => highlight(event, undefined, highlightModel);

/* 
    ================================================================
    MODEL INTERACTION - HIGHLIGHTING (SUBSETS) END
    ================================================================
*/