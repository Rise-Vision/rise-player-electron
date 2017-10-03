var assert = require("assert"),
crypto = require("crypto"),
simple = require("simple-mock"),
machineId = require("../../installer/machine-id.js");

describe("Machine ID",()=>{
  it("exists", ()=>{
    assert.ok(machineId);
  });
  it("is the correct md5 length", ()=>{
    console.log(machineId());
    assert(machineId().length  === 32);
  });
  it("defaults to math random on crypto failure", ()=>{
    simple.mock(crypto, "createHash").throwWith("stubbed");
    console.log(machineId());
    assert(/0\.\d*/.test(machineId()));
    simple.restore();
  });
});
