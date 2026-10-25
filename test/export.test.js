import test from "node:test";
import assert from "node:assert/strict";
import { rateInfo, frameAt, smpte, framesFromHMSF, display } from "../public/js/engine/timecode.js";
import { buildEDL, buildXMEML, buildFCPXML } from "../public/js/engine/export.js";

test("timecode at common rates", () => {
  const r30 = rateInfo(30);
  assert.equal(frameAt(12.27, r30), 368);
  assert.equal(smpte(368, r30), "00:00:12:08");
  assert.equal(display(12.27), "0:12.27");
  assert.equal(smpte(frameAt(10, rateInfo(25)), rateInfo(25)), "00:00:10:00");
  assert.equal(smpte(frameAt(1.5, rateInfo(24)), rateInfo(24)), "00:00:01:12");
  assert.equal(smpte(frameAt(2.5, rateInfo(60)), rateInfo(60)), "00:00:02:30");
});

test("29.97 drop frame and non-drop", () => {
  const df = rateInfo(29.97, true), ndf = rateInfo(29.97, false);
  assert.equal(df.drop, true);
  assert.equal(ndf.drop, false);
  assert.equal(smpte(1800, df), "00:01:00;02");
  assert.equal(smpte(17982, df), "00:10:00;00");
  assert.equal(smpte(1800, ndf), "00:01:00:00");
  assert.equal(framesFromHMSF(0, 1, 0, 2, df), 1800);
  assert.equal(framesFromHMSF(1, 0, 0, 0, df), 107892);
  assert.equal(framesFromHMSF(1, 0, 0, 0, ndf), 108000);
  assert.equal(smpte(107892, df), "01:00:00;00");
  assert.equal(smpte(3600, rateInfo(59.94, true)), "00:01:00;04");
  assert.equal(rateInfo(30, true).drop, false); // integer rates never drop
});

const ciph = { fileName: "ciph.mp4", rate: rateInfo(30), width: 1920, height: 1080, durationFrames: 1800, cutFrame: 368 };

test("EDL trims the head and marks the found frame", () => {
  const edl = buildEDL(ciph);
  assert.match(edl, /^TITLE: CIPH FTS\r\nFCM: NON-DROP FRAME/);
  assert.match(edl, /001  AX       AA\/V  C        00:00:12:08 00:01:00:00 01:00:00:00 01:00:47:22/);
  assert.match(edl, /\* FROM CLIP NAME: ciph\.mp4/);
  assert.match(edl, /\* LOC: 01:00:00:00 GREEN/);
  assert.match(buildEDL({ ...ciph, rate: rateInfo(29.97, true) }), /FCM: DROP FRAME[\s\S]*01:00:00;00/);
});

test("FCP7 XML and FCPXML carry the trim and marker", () => {
  const x = buildXMEML(ciph);
  assert.match(x, /<in>368<\/in>/);
  assert.match(x, /<out>1800<\/out>/);
  assert.match(x, /<marker><name>App on screen<\/name>/);
  const f = buildFCPXML(ciph);
  assert.match(f, /<fcpxml version="1.9">/);
  assert.match(f, /start="368\/30s" duration="1432\/30s"/);
  assert.match(f, /<marker start="368\/30s" duration="1\/30s" value="App on screen"\/>/);
  const f2 = buildFCPXML({ ...ciph, rate: rateInfo(29.97, true) });
  assert.match(f2, /frameDuration="1001\/30000s"/);
  assert.match(f2, /start="368368\/30000s"/);
  assert.match(f2, /tcFormat="DF"/);
});
