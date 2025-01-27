const path = require("path");
const programDir = path.join(__dirname, "programs", "counter");
const idlDir = path.join(__dirname, "idl");
const sdkDir = path.join(__dirname, "src", "generated");
const binaryInstallDir = path.join(__dirname, ".crates");

module.exports = {
  idlGenerator: "anchor",
  programName: "omnicounter",
  programId: "4JSbnmWnAmRfaCWeZwFHWJrakYgrqtkXRqZ6MN4o9KiE",
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
};
