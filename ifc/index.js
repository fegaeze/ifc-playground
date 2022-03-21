// import * as WebIFC from "../../../dist/web-ifc-api-node.js";
const WebIFC = require("web-ifc/web-ifc-api.js");
import { Equals, WithIFCFileLoaded, TestInfo } from "./utils";

export default async function() {
    await WithIFCFileLoaded("modify_single_line", (ifcapi, modelID, info) => {

        let newGuidValue = "<MODIFIED_GUID>";

        // lets modify a line
        {
            // this returns a propertyset object at line number 244
            let propertySet = ifcapi.GetLine(modelID, 244);

            // check the guid before modification
            Equals("GUID before", propertySet.GlobalId.value, "0uNK5AgoP1Vw6UlaHiS$iF");
            propertySet.GlobalId.value = newGuidValue;
            ifcapi.WriteLine(modelID, propertySet);
        }

        // and read it back modified
        {
            let propertySet = ifcapi.GetLine(modelID, 244);
            
            // check guid after modification
            Equals("GUID after", propertySet.GlobalId.value, newGuidValue);
        }

    });

    await WithIFCFileLoaded("modify_nested_line", (ifcapi, modelID, info) => {

        let modifiedNameValue = "<MODIFIED_NAME>";

        // lets modify a line
        {
            let propertySetFlat = ifcapi.GetLine(modelID, 244, true);

            // check the guid before modification
            let prop = propertySetFlat.HasProperties[0];
            Equals("Name before", prop.Name.value, "Reference");

            prop.Name.value = modifiedNameValue;

            ifcapi.WriteLine(modelID, prop);
        }

        let propID = -1;
        // read the root back modified
        {
            let propertySetFlat = ifcapi.GetLine(modelID, 244, true);
            let prop = propertySetFlat.HasProperties[0];
            propID = prop.expressID;

            // check guid after modification
            Equals("Name after flat", prop.Name.value, modifiedNameValue);
        }

        // and the subelement
        {
            let prop = ifcapi.GetLine(modelID, propID);
            
            // check guid after modification
            Equals("Name after sub", prop.Name.value, modifiedNameValue);
        }

    });
}