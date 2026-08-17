import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const localeCodes = ["en", "hi"];
const expectedStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

function flattenKeys(value, prefix = "") {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child)
      ? flattenKeys(child, path)
      : [path];
  });
}

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("build output ships the Nagrik Setu app shell", async () => {
  const html = await readFile(new URL("dist/index.html", root), "utf8");

  assert.match(html, /<title>Nagrik Setu<\/title>/i);
  assert.match(
    html,
    /Nagrik Setu helps citizens discover schemes, prepare documents, track applications, and file grievances\./,
  );
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /\/assets\/index-[\w-]+\.js/);
  assert.match(html, /\/assets\/index-[\w-]+\.css/);
  assert.doesNotMatch(html, /vinext-starter|codex-preview|Your site is taking shape/i);
});

test("locale files support English and Hindi with matching keys", async () => {
  const locales = Object.fromEntries(
    await Promise.all(
      localeCodes.map(async (code) => [code, await readJson(`src/locales/${code}/common.json`)]),
    ),
  );
  const englishKeys = flattenKeys(locales.en).sort();

  for (const code of localeCodes) {
    assert.deepEqual(flattenKeys(locales[code]).sort(), englishKeys, code);
    assert.equal(locales[code].common.english, "English");
    assert.equal(locales[code].common.hindi, "हिन्दी");
    assert.equal(locales[code].common.tamil, undefined);
    assert.equal(locales[code].common.kannada, undefined);
    assert.equal(locales[code].common.malayalam, undefined);
    assert.doesNotMatch(JSON.stringify(locales[code]), /à|Â|â/);
  }

  assert.equal(locales.hi.brand, "नागरिक सेतु");
  assert.equal(locales.hi.locations.states.Karnataka, "कर्नाटक");
});

test("location data covers every Indian State and Union Territory", async () => {
  const locations = await readJson("src/data/locations.json");

  assert.deepEqual(locations.states, expectedStates);
  assert.deepEqual(Object.keys(locations.districtsByState).sort(), expectedStates.toSorted());

  for (const state of expectedStates) {
    assert.ok(locations.districtsByState[state]?.length > 0, state);
  }

  assert.ok(locations.districtsByState.Karnataka.includes("Bengaluru Urban"));
  assert.ok(locations.districtsByState.Karnataka.includes("Mysuru"));
  assert.ok(locations.districtsByState.Karnataka.includes("Belagavi"));
  assert.ok(locations.districtsByState.Karnataka.includes("Tumakuru"));
  assert.ok(locations.districtsByState.Karnataka.includes("Ballari"));
  assert.ok(locations.districtsByState["Tamil Nadu"].includes("Chennai"));
  assert.ok(locations.districtsByState["Tamil Nadu"].includes("Coimbatore"));
  assert.ok(locations.districtsByState["Tamil Nadu"].includes("Madurai"));
  assert.ok(locations.districtsByState["Tamil Nadu"].includes("Salem"));
  assert.ok(locations.districtsByState["Tamil Nadu"].includes("Tiruchirappalli"));
  assert.equal(locations.districtsByState.Delhi.length, 13);
});

test("document type catalog covers scheme requirements and common citizen documents", async () => {
  const schemesSource = await readFile(new URL("src/data/schemes.ts", root), "utf8");
  const documentTypesSource = await readFile(new URL("src/data/documentTypes.ts", root), "utf8");
  const catalogLabels = new Set(
    [...documentTypesSource.matchAll(/fallbackLabel: "([^"]+)"/g)].map((match) => match[1]),
  );
  const schemeDocumentGroups = [...schemesSource.matchAll(/documentsRequired:\s*\[([^\]]+)\]/g)];
  const schemeDocuments = new Set(
    schemeDocumentGroups.flatMap((group) => [...group[1].matchAll(/"([^"]+)"/g)].map((match) => match[1])),
  );
  const requiredGeneralDocuments = [
    "Aadhaar card",
    "PAN card",
    "Voter ID card",
    "Passport",
    "Ration card",
    "Income certificate",
    "Caste certificate",
    "Domicile / residence certificate",
    "Bank passbook / cancelled cheque",
    "Passport-size photograph",
    "Disability certificate",
    "BPL card",
    "Birth certificate",
    "Land / property documents",
    "Other",
  ];

  for (const document of schemeDocuments) {
    assert.ok(catalogLabels.has(document), document);
  }

  for (const document of requiredGeneralDocuments) {
    assert.ok(catalogLabels.has(document), document);
  }
});

test("Sites metadata is packaged with the static build", async () => {
  const hosting = JSON.parse(
    await readFile(new URL("dist/.openai/hosting.json", root), "utf8"),
  );

  assert.deepEqual(hosting, { d1: null, r2: null });
});
