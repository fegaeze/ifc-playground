import { Color } from 'three';
import { IfcViewerAPI } from 'web-ifc-viewer';
 
const propertiesSelect = document.getElementById("properties");
const propertiesSection = document.getElementById("properties-section");

const toggleDimensionText = document.getElementById("dimension-toggle-text");
const toggleDimensionButton = document.getElementById("dimension-toggle");

const toggleClipperText = document.getElementById("clipper-toggle-text");
const toggleClipperButton = document.getElementById("clipper-toggle");

/* 
    ================================================================
    SETUP OF SCENE START
    This section creates the scene setup using three JS. 
    Configured components include: Scene, Camera, Renderer, Controls
    ================================================================
*/
const container = document.getElementById("three-canvas");
const viewer = new IfcViewerAPI({ container, backgroundColor: new Color(0xffffff) });
window.webIfcAPI = viewer;

viewer.grid.setGrid();
viewer.axes.setAxes();

viewer.shadowDropper.darkness = 1.5;

// Clear localstorage
localStorage.clear();

/* 
    ================================================================
    SETUP OF SCENE END
    ================================================================
*/


/* 
    ================================================================
    LOADER FUNCTIONALITY START
    ================================================================
*/

const input = document.getElementById("file-input");

viewer.IFC.setWasmPath('wasm/');
viewer.IFC.loader.ifcManager.useWebWorkers(true, './IFCWorker.js');
viewer.IFC.loader.ifcManager.applyWebIfcConfig({
  USE_FAST_BOOLS: true,
  COORDINATE_TO_ORIGIN: true
});


input.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    const ifcURL = URL.createObjectURL(file);

    propertiesSelect.selectedIndex = 0;
    await viewer.IFC.loadIfcUrl(ifcURL);
    await viewer.shadowDropper.renderShadow(0);
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

let clipperActive = false;
let dimensionActive = false;

function saveProperties(native, other, spatial) {
    localStorage.setItem("native", JSON.stringify(native, null, 2));
    localStorage.setItem("other", JSON.stringify(other, null, 2));
    localStorage.setItem("spatial", JSON.stringify(spatial, null, 2));

    propertiesSection.innerHTML = localStorage.getItem("native");
}

window.onmousemove = () => viewer.IFC.selector.prePickIfcItem();
window.ondblclick = async () => {
    if (viewer.clipper.active) {
        viewer.clipper.createPlane();
    } else if (viewer.dimensions.active) {
        viewer.dimensions.create();
    } else {
        const result = await viewer.IFC.selector.pickIfcItem(true);
        if (!result) return;
        const { modelID, id } = result;

        const native = await viewer.IFC.getProperties(modelID, id, false, false);
        const other = await viewer.IFC.getProperties(modelID, id, true, false);
        const spatial = await viewer.IFC.getSpatialStructure(modelID);

        saveProperties(native, other, spatial);
    }
};

/* 
    ================================================================
    MODEL INTERACTION - PICKING END
    ================================================================
*/

propertiesSelect.onchange = (event) => {
    const property = event.target.value;
    propertiesSection.innerHTML = localStorage.getItem(`${property}`);
};

toggleClipperButton.onclick = () => {
    viewer.clipper.active = !clipperActive;
    toggleClipperText.innerHTML = !clipperActive;
    clipperActive = !clipperActive;
};

toggleDimensionButton.onclick = () => {
    viewer.dimensions.active = !dimensionActive;
    viewer.dimensions.previewActive = !dimensionActive;
    toggleDimensionText.innerHTML = !dimensionActive;
    dimensionActive = !dimensionActive;
};