const bpack = require("bigint-buffer");
function toHex(buffer) {
  if (Buffer.isBuffer(buffer)) {
    return "0x" + buffer.toString("hex");
  } else if (buffer instanceof Uint8Array) {
    return "0x" + Buffer.from(buffer.buffer, buffer.byteOffset, buffer.length).toString("hex");
  } else {
    return "0x" + Buffer.from(buffer).toString("hex");
  }
}

function bigIntToBytes(value, length, endianness = "le") {
  if (endianness === "le") {
    return bpack.toBufferLE(value, length);
  } else if (endianness === "be") {
    return bpack.toBufferBE(value, length);
  }
  throw new Error("endianness must be either 'le' or 'be'");
}

function intToBytes(value, length, endianness = "le") {
  return bigIntToBytes(BigInt(value), length, endianness);
  
}

function bytesToInt(value, endianness = "le") {
  return Number(bytesToBigInt(value, endianness));
}
function bytesToBigInt(value, endianness) {
  if (endianness === "le") {
    return bpack.toBigIntLE(value);
  } else if (endianness === "be") {
    return bpack.toBigIntBE(value);
  }
  throw new Error("endianness must be either 'le' or 'be'");
}

function copyFromBuf64LE(sbuffer, tbuffer, length) {
  //unrolled fast copy
  switch (length) {
    case 8:
      tbuffer[7] = sbuffer[7];
    case 7:
      tbuffer[6] = sbuffer[6];
    case 6:
      tbuffer[5] = sbuffer[5];
    case 5:
      tbuffer[4] = sbuffer[4];
    case 4:
      tbuffer[3] = sbuffer[3];
    case 3:
      tbuffer[2] = sbuffer[2];
    case 2:
      tbuffer[1] = sbuffer[1];
    case 1:
      tbuffer[0] = sbuffer[0];
    default:
  }
}

function copyFromBuf64BE(sbuffer, tbuffer, length) {
  switch (
    length //we need to unroll it for fast computation, buffer copy/looping takes too much time
  ) {
    case 8:
      tbuffer[0] = sbuffer[0]; //length is 8 here
    case 7:
      tbuffer[length - 7] = sbuffer[1];
    case 6:
      tbuffer[length - 6] = sbuffer[2];
    case 5:
      tbuffer[length - 5] = sbuffer[3];
    case 4:
      tbuffer[length - 4] = sbuffer[4];
    case 3:
      tbuffer[length - 3] = sbuffer[5];
    case 2:
      tbuffer[length - 2] = sbuffer[6];
    case 1:
      tbuffer[length - 1] = sbuffer[7];
    default:
  }
}

function copyToBuf64LE(sbuffer, tbuffer, length) {
  switch (
    length //we need to unroll it for fast computation, buffer copy/looping takes too much time
  ) {
    case 8:
      tbuffer[7] = sbuffer[7];
    case 7:
      tbuffer[6] = sbuffer[6];
    case 6:
      tbuffer[5] = sbuffer[5];
    case 5:
      tbuffer[4] = sbuffer[4];
    case 4:
      tbuffer[3] = sbuffer[3];
    case 3:
      tbuffer[2] = sbuffer[2];
    case 2:
      tbuffer[1] = sbuffer[1];
    case 1:
      tbuffer[0] = sbuffer[0];
    default:
  }
  switch (
    length //zero the rest
  ) {
    case 1:
      tbuffer[1] = 0;
    case 2:
      tbuffer[2] = 0;
    case 3:
      tbuffer[3] = 0;
    case 4:
      tbuffer[4] = 0;
    case 5:
      tbuffer[5] = 0;
    case 6:
      tbuffer[6] = 0;
    case 7:
      tbuffer[7] = 0;
  }
}

function copyToBuf64BE(sbuffer, tbuffer, length) {
  switch (
    length //we need to unroll it for fast computation, buffer copy/looping takes too much time
  ) {
    case 8:
      tbuffer[0] = sbuffer[0];
    case 7:
      tbuffer[1] = sbuffer[length - 7];
    case 6:
      tbuffer[2] = sbuffer[length - 6];
    case 5:
      tbuffer[3] = sbuffer[length - 5];
    case 4:
      tbuffer[4] = sbuffer[length - 4];
    case 3:
      tbuffer[5] = sbuffer[length - 3];
    case 2:
      tbuffer[6] = sbuffer[length - 2];
    case 1:
      tbuffer[7] = sbuffer[length - 1];
    default:
  }
  switch (
    length //zero the rest
  ) {
    case 1:
      tbuffer[6] = 0;
    case 2:
      tbuffer[5] = 0;
    case 3:
      tbuffer[4] = 0;
    case 4:
      tbuffer[3] = 0;
    case 5:
      tbuffer[2] = 0;
    case 6:
      tbuffer[1] = 0;
    case 7:
      tbuffer[0] = 0;
  }
}

let bufferB = new ArrayBuffer(8);
let viewB = new DataView(bufferB);

function getNumberBytes(value, length, endianness) {
  if (value < 0) value = -value; //bigint inttobytes always return the absolute value
  if (value > Number.MAX_SAFE_INTEGER) return intToBytes(BigInt(value), length, endianness);
  let mvalue;
  let view = viewB;

  let result = Buffer.allocUnsafe(length);
  let sbuffer = Buffer.from(bufferB);
  switch (endianness) {
    case "le":
      view.setInt32(0, value, true);
      if (length > 4) {
        mvalue = Math.floor(value / 2 ** 32);
        view.setInt32(4, mvalue, true);
      }
      copyFromBuf64LE(sbuffer, result, length);
      break;
    case "be":
      view.setInt32(4, value, false);

      if (length > 4) {
        mvalue = Math.floor(value / 2 ** 32);
        view.setInt32(0, mvalue, false);
      }
      copyFromBuf64BE(sbuffer, result, length);
      break;
    default:
      throw new Error("endianness must be either 'le' or 'be'");
  }
  return result;
}

let bufferG = new ArrayBuffer(8);
let viewG = new DataView(bufferG);

function getNumberInt(value, endianness) {
  let isbigint = false;
  let left, right, view;
  let buffer = Buffer.from(bufferG);
  view = viewG;
  const length = value.length;

  switch (endianness) {
    case "le":
      if (value.length > 6)
        isbigint = value[6] > 31 || value.slice(7, value.length).reduce((acc, vrow) => acc || vrow, false);
      if (isbigint) return Number(bytesToBigInt(value, endianness));
      copyToBuf64LE(value, buffer, length);
      left = view.getUint32(4, true);
      right = view.getUint32(0, true);
      break;
    case "be":
      if (value.length > 6)
        isbigint =
          value[value.length - 7] > 31 || value.slice(0, value.length - 7).reduce((acc, vrow) => acc || vrow, false);
      if (isbigint) return Number(bytesToBigInt(value, endianness));
      copyToBuf64BE(value, buffer, length);
      left = view.getUint32(0, false);
      right = view.getUint32(4, false);
      break;
  }

  const combined = 2 ** 32 * left + right;
  return combined;
}

//console.log(getNumberInt(getNumberBytes(Number.MAX_SAFE_INTEGER,8,"be"),"be"))

let nTime = 0;
let bTime = 0;
let ne, nd, nx;
const numArr = [];
let mismatch = 0;
for (i = 0; i < 1000000; i++) {
  const tnum = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  let mx = getNumberInt(getNumberBytes(tnum, (i % 8) + 1, "le"), "le");
  let my = Number(bytesToBigInt(intToBytes(BigInt(tnum), (i % 8) + 1, "le"), "le"));
  if (mx != my) mismatch = mismatch + 1;

  // console.log(getNumberBytes(tnum,7,"le"),intToBytes(BigInt(tnum),7,"le"))
  // console.log(getNumberBytes(tnum,8,"be"),intToBytes(BigInt(tnum),8,"be"))

  mx = getNumberInt(getNumberBytes(tnum, (i % 8) + 1, "be"), "be");
  my = Number(bytesToBigInt(intToBytes(BigInt(tnum), (i % 8) + 1, "be"), "be"));
  if (mx != my) mismatch = mismatch + 1;
  numArr.push(tnum);
}
// console.log({mismatch});
let idx;

nd = new Date().getTime();
idx=0;
numArr.forEach((tnum) => {
  idx = idx + 1;
  nx = Number(bytesToBigInt(intToBytes(BigInt(tnum), (idx % 8) + 1, "le"), "le"));
  nx = Number(bytesToBigInt(intToBytes(BigInt(tnum), (idx % 8) + 1, "be"), "be"));
});
ne = new Date().getTime();
bTime = bTime + ne - nd;



nd = new Date().getTime();
idx = 0;
numArr.forEach((tnum) => {
  idx = idx + 1;
  nx = getNumberInt(getNumberBytes(tnum, (idx % 8) + 1, "le"), "le");
  nx = getNumberInt(getNumberBytes(tnum, (idx % 8) + 1, "be"), "be");
});
ne = new Date().getTime();
nTime = nTime + ne - nd;

console.log({mismatch, nTime, bTime, perfGain: `${Math.floor((100 * 100 * (bTime - nTime)) / bTime) / 100} %`});