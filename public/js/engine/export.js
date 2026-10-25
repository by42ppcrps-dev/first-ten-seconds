import { smpte, framesFromHMSF } from "./timecode.js";

// All exports: a trim edit that starts the timeline at the found frame, plus a marker there.
// input: { fileName, rate (from rateInfo), width, height, durationFrames, cutFrame }

const MARKER = "App on screen";

function stem(name) {
  return String(name).replace(/\.[^.]+$/, "");
}

function xml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function rest(o) {
  return Math.max(1, o.durationFrames - o.cutFrame);
}

// CMX3600 EDL, for DaVinci Resolve and Premiere Pro.
export function buildEDL(o) {
  const r = o.rate;
  const recIn = framesFromHMSF(1, 0, 0, 0, r);
  const n = rest(o);
  const src = (o.fileName || "clip").replace(/[\r\n]/g, " ");
  const lines = [
    `TITLE: ${stem(src).slice(0, 60).toUpperCase()} FTS`,
    `FCM: ${r.drop ? "DROP FRAME" : "NON-DROP FRAME"}`,
    "",
    `001  AX       AA/V  C        ${smpte(o.cutFrame, r)} ${smpte(o.cutFrame + n, r)} ${smpte(recIn, r)} ${smpte(recIn + n, r)}`,
    `* FROM CLIP NAME: ${src}`,
    `* LOC: ${smpte(recIn, r)} GREEN  ${MARKER.toUpperCase()} AT SOURCE ${smpte(o.cutFrame, r)}`,
    "",
  ];
  return lines.join("\r\n");
}

// Final Cut Pro 7 XML (xmeml v5), for Premiere Pro.
export function buildXMEML(o) {
  const r = o.rate;
  const n = rest(o);
  const name = xml(o.fileName || "clip");
  const rateXml = `<rate><timebase>${r.base}</timebase><ntsc>${r.ntsc ? "TRUE" : "FALSE"}</ntsc></rate>`;
  const recIn = framesFromHMSF(1, 0, 0, 0, r);
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
  <sequence id="sequence-1">
    <name>${xml(stem(o.fileName || "clip"))} FTS</name>
    <duration>${n}</duration>
    ${rateXml}
    <timecode>${rateXml}<string>${smpte(recIn, r)}</string><frame>${recIn}</frame><displayformat>${r.drop ? "DF" : "NDF"}</displayformat></timecode>
    <marker><name>${MARKER}</name><comment>Source ${smpte(o.cutFrame, r)}</comment><in>0</in><out>-1</out></marker>
    <media>
      <video>
        <format><samplecharacteristics>${rateXml}<width>${o.width}</width><height>${o.height}</height></samplecharacteristics></format>
        <track>
          <clipitem id="clipitem-1">
            <name>${name}</name>
            <duration>${o.durationFrames}</duration>
            ${rateXml}
            <start>0</start>
            <end>${n}</end>
            <in>${o.cutFrame}</in>
            <out>${o.cutFrame + n}</out>
            <file id="file-1">
              <name>${name}</name>
              <pathurl>file://localhost/${encodeURI(o.fileName || "clip")}</pathurl>
              ${rateXml}
              <duration>${o.durationFrames}</duration>
              <media><video><samplecharacteristics>${rateXml}<width>${o.width}</width><height>${o.height}</height></samplecharacteristics></video><audio/></media>
            </file>
          </clipitem>
        </track>
      </video>
    </media>
  </sequence>
</xmeml>
`;
}

// FCPXML 1.9, for DaVinci Resolve and Final Cut Pro.
export function buildFCPXML(o) {
  const r = o.rate;
  const n = rest(o);
  const t = (frames) => (frames === 0 ? "0s" : `${frames * r.den}/${r.num}s`);
  const fd = `${r.den}/${r.num}s`;
  const name = xml(o.fileName || "clip");
  const tc = r.drop ? "DF" : "NDF";
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <format id="r1" frameDuration="${fd}" width="${o.width}" height="${o.height}"/>
    <asset id="r2" name="${name}" start="0s" duration="${t(o.durationFrames)}" hasVideo="1" hasAudio="1" format="r1">
      <media-rep kind="original-media" src="file:///${encodeURI(o.fileName || "clip")}"/>
    </asset>
  </resources>
  <library>
    <event name="First Ten Seconds">
      <project name="${xml(stem(o.fileName || "clip"))} FTS">
        <sequence format="r1" duration="${t(n)}" tcStart="0s" tcFormat="${tc}">
          <spine>
            <asset-clip ref="r2" name="${name}" offset="0s" start="${t(o.cutFrame)}" duration="${t(n)}" format="r1" tcFormat="${tc}">
              <marker start="${t(o.cutFrame)}" duration="${fd}" value="${MARKER}"/>
            </asset-clip>
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
`;
}
