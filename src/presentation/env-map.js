// The reflection map for metal (mirrors, steel). Built once in main.js from
// Three's RoomEnvironment (vendored); null in headless tests and on low
// quality, in which case materials simply have no envMap.
let envMap = null;
export const getEnvMap = () => envMap;
export function setEnvMap(texture) {
  envMap = texture;
}
