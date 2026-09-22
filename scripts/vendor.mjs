import { cp, mkdir } from 'node:fs/promises';
export async function prepareVendor(destination='vendor'){
 await mkdir(destination,{recursive:true});
 await cp('node_modules/blockly/blockly_compressed.js',`${destination}/blockly.js`);
 await cp('node_modules/blockly/msg/zh-hant.js',`${destination}/zh-hant.js`);
 await cp('node_modules/blockly/media',`${destination}/media`,{recursive:true});
 await cp('node_modules/blockly/LICENSE',`${destination}/Blockly-LICENSE`);
}
