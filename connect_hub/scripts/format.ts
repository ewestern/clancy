import { prettyFormat } from "../src/providers/utils.js";
import { driveFilesCreateResultSchema } from "../src/integrations/google/drive.js";
console.log("FOOOO");

//console.log(
//  prettyFormat(driveFilesCreateResultSchema, {
//    id: "1234567890",
//    name: "test.txt",
//    mimeType: "text/plain",
//    size: 100,
//    createdTime: "2021-01-01T00:00:00.000Z",
//    modifiedTime: "2021-01-01T00:00:00.000Z",
//    webViewLink: "https://drive.google.com/file/d/1234567890/view?usp=sharing",
//    webContentLink:
//      "https://drive.google.com/file/d/1234567890/view?usp=sharing",
//    thumbnailLink:
//      "https://drive.google.com/file/d/1234567890/view?usp=sharing",
//  }),
//);

import { getCurrentTimestamp } from "../src/utils.js";
console.log(getCurrentTimestamp());
