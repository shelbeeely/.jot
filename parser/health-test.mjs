// Health import (health.mjs) with small made-up exports: nothing here is anyone's data. Run: node --test health-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from './jot.mjs';
import { collectNumbers } from './charts.mjs';
import A from './automation.mjs';
import H from './health.mjs';

const rec = (type, start, end, value, { unit = '', source = 'Phone' } = {}) => `  <Record type="${type}" sourceName="${source}" sourceVersion="17.0"${unit ? ` unit="${unit}"` : ''} creationDate="${end}" startDate="${start}" endDate="${end}" value="${value}"/>\n`;
const Q = (t) => `HKQuantityTypeIdentifier${t}`, SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis', S = (v) => `HKCategoryValueSleepAnalysis${v}`;
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [
<!ATTLIST Record type CDATA #REQUIRED>
]>
<HealthData locale="en_US">
 <ExportDate value="2026-10-27 09:00:00 -0700"/>
 <Me HKCharacteristicTypeIdentifierDateOfBirth=""/>
${rec(Q('StepCount'), '2026-10-25 08:00:00 -0700', '2026-10-25 09:00:00 -0700', 1200, { unit: 'count' })}${rec(Q('StepCount'), '2026-10-25 17:00:00 -0700', '2026-10-25 18:00:00 -0700', 3000, { unit: 'count' })}${rec(Q('StepCount'), '2026-10-25 08:00:00 -0700', '2026-10-25 18:00:00 -0700', 4000, { unit: 'count', source: 'Watch &amp; Co' })}${rec(Q('StepCount'), '2026-10-26 23:30:00 -0700', '2026-10-26 23:59:00 -0700', 500, { unit: 'count' })}  <Record type="${Q('HeartRate')}" sourceName="Watch" unit="count/min" startDate="2026-10-25 10:00:00 -0700" endDate="2026-10-25 10:00:00 -0700" value="60">
   <MetadataEntry key="HKMetadataKeyHeartRateMotionContext" value="1"/>
  </Record>
${rec(Q('HeartRate'), '2026-10-25 12:00:00 -0700', '2026-10-25 12:00:00 -0700', 80, { unit: 'count/min' })}${rec(Q('HeartRate'), '2026-10-25 15:00:00 -0700', '2026-10-25 15:00:00 -0700', 70, { unit: 'count/min' })}${rec(Q('OxygenSaturation'), '2026-10-25 03:00:00 -0700', '2026-10-25 03:00:00 -0700', 0.97, { unit: '%' })}${rec(Q('BodyMass'), '2026-10-25 07:00:00 -0700', '2026-10-25 07:00:00 -0700', 70.4, { unit: 'kg' })}${rec(Q('BodyMass'), '2026-10-25 21:00:00 -0700', '2026-10-25 21:00:00 -0700', 70.9, { unit: 'kg' })}${rec(Q('BodyMass'), '2026-10-25 12:00:00 -0700', '2026-10-25 12:00:00 -0700', 70.1, { unit: 'kg' })}${rec(SLEEP, '2026-10-25 22:30:00 -0700', '2026-10-25 23:00:00 -0700', S('InBed'))}${rec(SLEEP, '2026-10-25 23:00:00 -0700', '2026-10-26 02:00:00 -0700', S('AsleepCore'), { source: 'Watch' })}${rec(SLEEP, '2026-10-26 02:00:00 -0700', '2026-10-26 02:30:00 -0700', S('Awake'), { source: 'Watch' })}${rec(SLEEP, '2026-10-26 02:30:00 -0700', '2026-10-26 04:00:00 -0700', S('AsleepDeep'), { source: 'Watch' })}${rec(SLEEP, '2026-10-26 04:00:00 -0700', '2026-10-26 06:30:00 -0700', S('AsleepREM'), { source: 'Watch' })}${rec(SLEEP, '2026-10-25 23:30:00 -0700', '2026-10-26 01:30:00 -0700', S('Asleep'), { source: 'Sleep app' })}${rec('HKCategoryTypeIdentifierMindfulSession', '2026-10-26 07:00:00 -0700', '2026-10-26 07:10:00 -0700', 'HKCategoryValueNotApplicable')}${rec(Q('BloodGlucose'), '2026-10-25 08:00:00 -0700', '2026-10-25 08:00:00 -0700', 95, { unit: 'mg/dL' })}${rec('HKCategoryTypeIdentifierMenstrualFlow', '2026-10-25 00:00:00 -0700', '2026-10-25 00:00:00 -0700', 'HKCategoryValueMenstrualFlowLight')}${rec('HKCategoryTypeIdentifierSexualActivity', '2026-10-25 00:00:00 -0700', '2026-10-25 00:00:00 -0700', 'HKCategoryValueNotApplicable')}  <Workout workoutActivityType="HKWorkoutActivityTypeWalking" duration="30" startDate="2026-10-25 08:00:00 -0700" endDate="2026-10-25 08:30:00 -0700">
   <WorkoutRoute sourceName="Watch"><FileReference path="/workout-routes/route_2026-10-25.gpx"/></WorkoutRoute>
  </Workout>
 <ActivitySummary dateComponents="2026-10-25" activeEnergyBurned="300"/>
</HealthData>
`;
const byMetric = (s, opts) => Object.fromEntries(s.numbers(opts).map((n) => [`${n.metric} ${n.date}`, [n.value, n.unit, n.aggregation]]));

test('Apple Health: steps summed per source (the larger source per day), heart rate averaged, body mass the last of the day', () => {
  const s = H.readAppleHealth(XML), n = byMetric(s);
  assert.deepEqual(n['steps 2026-10-25'], [4200, '', 'sum'], 'phone 1200 + 3000 = 4200 beats the watch 4000; the two are not added');
  assert.deepEqual(n['steps 2026-10-26'], [500, '', 'sum'], 'a record belongs to the date it starts on, as written');
  assert.deepEqual(n['heart-rate 2026-10-25'], [70, 'bpm', 'mean'], 'a record with child elements is read too');
  assert.deepEqual(n['body-mass 2026-10-25'], [70.9, 'kg', 'latest'], 'the latest by time, not the last in the file');
  assert.deepEqual(n['spo2 2026-10-25'], [97, '%', 'mean'], "HealthKit's fraction written as the percent it means");
  assert.equal(n['heart-rate-min 2026-10-25'], undefined, 'lowest and highest only when chosen');
  assert.deepEqual(byMetric(s, { metrics: ['heart-rate-min', 'heart-rate-max'] }), { 'heart-rate-min 2026-10-25': [60, 'bpm', 'minimum'], 'heart-rate-max 2026-10-25': [80, 'bpm', 'maximum'] });
  assert.equal(s.used, 16); assert.equal(s.other, 3, 'blood glucose, menstrual flow and sexual activity are not read');
  assert.deepEqual([s.first, s.last], ['2026-10-25', '2026-10-26']);
});

test('Apple Health: sleep is time asleep per night, sources merged, given to the morning it ends; mindful minutes per day', () => {
  const n = byMetric(H.readAppleHealth(XML));
  assert.deepEqual(n['sleep 2026-10-26'], [7, 'h', 'sum'], 'asleep 23:00 to 06:30 less half an hour awake; the overlapping app does not double it; in bed is not asleep');
  assert.equal(n['sleep 2026-10-25'], undefined);
  assert.deepEqual(n['mindful 2026-10-26'], [10, 'min', 'sum']);
});

test('Apple Health: nothing else is read: no medications, clinical, reproductive or sexual health, or location', () => {
  const s = H.readAppleHealth(XML), metrics = s.metrics.map((m) => m.metric);
  assert.deepEqual(metrics, ['body-mass', 'heart-rate', 'heart-rate-max', 'heart-rate-min', 'mindful', 'sleep', 'spo2', 'spo2-max', 'spo2-min', 'steps']);
  assert.ok(Object.keys(H.APPLE).every((t) => !/Glucose|Menstrual|Sexual|Ovulation|Pregnancy|Contracept|Medication|Clinical|Lab/i.test(t)));
  assert.ok(!JSON.stringify(s.numbers({ metrics })).match(/gpx|route|glucose|menstrual/i));
});

test('Apple Health: read in pieces gives the same as read whole; one unit per metric; ZIP and clinical files refused; date range', () => {
  const whole = H.readAppleHealth(XML), sc = H.appleHealthScanner();
  for (let i = 0; i < XML.length; i += 37) sc.push(XML.slice(i, i + 37));
  assert.deepEqual(sc.end().numbers(), whole.numbers());
  const two = H.readAppleHealth(`<HealthData>${rec(Q('BodyMass'), '2026-10-25 07:00:00 +0100', '2026-10-25 07:00:00 +0100', 70, { unit: 'kg' })}${rec(Q('BodyMass'), '2026-10-26 07:00:00 +0100', '2026-10-26 07:00:00 +0100', 155, { unit: 'lb' })}</HealthData>`);
  assert.deepEqual(two.numbers().map((n) => [n.metric, n.value, n.unit]), [['body-mass-kg', 70, 'kg'], ['body-mass-lb', 155, 'lb']], 'kg and lb never merged or converted');
  assert.throws(() => H.readAppleHealth('PK\u0003\u0004…'), /Unzip export\.zip first/);
  assert.throws(() => H.readAppleHealth('<?xml version="1.0"?><ClinicalDocument xmlns="urn:hl7-org:v3">'), /clinical records are never imported/);
  assert.ok(H.healthKind('export.zip', 'PK\u0003') instanceof Error);
  assert.equal(H.healthKind('export.xml', '<?xml'), 'apple'); assert.equal(H.healthKind('steps.csv', 'Date,Steps'), 'csv');
  assert.deepEqual(whole.numbers({ since: '2026-10-26', until: '2026-10-26' }).map((n) => n.metric), ['mindful', 'sleep', 'steps']);
});

test('Apple Health: a file over the size limit is refused with a clear message', () => {
  const sc = H.appleHealthScanner(), was = H.LIMITS.xmlBytes; H.LIMITS.xmlBytes = 100;
  try { assert.throws(() => sc.push('<HealthData>'.padEnd(101, ' ')), /larger than .* GB/); } finally { H.LIMITS.xmlBytes = was; }
});

test('CSV presets: Fitbit, Garmin, Oura, Google Fit and Health Connect-style headers, with units; scores and location left out', () => {
  const fitbit = H.readHealthCSV('Date,Calories Burned,Steps,Distance,Floors,Minutes Sedentary,Minutes Very Active\n2026-10-25,"2,310","8,204",6.1,10,700,25\n');
  assert.equal(fitbit.name, 'Fitbit');
  assert.deepEqual(byMetric(fitbit), { 'energy 2026-10-25': [2310, 'kcal', 'sum'], 'steps 2026-10-25': [8204, '', 'sum'], 'distance 2026-10-25': [6.1, '', 'sum'], 'flights 2026-10-25': [10, '', 'sum'], 'very-active-minutes 2026-10-25': [25, 'min', 'sum'] });
  assert.deepEqual(fitbit.leftOut, ['Minutes Sedentary']);
  const garmin = H.readHealthCSV('Calendar Date,Total Steps,Resting Heart Rate,Body Battery,Avg Stress,Intensity Minutes\n2026-10-25,9100,58,80,30,45\n2026-10-26,7000,60,70,25,20\n');
  assert.equal(garmin.name, 'Garmin');
  assert.deepEqual(garmin.metrics.map((m) => `${m.metric}:${m.unit}:${m.days}`), ['exercise:min:2', 'resting-heart-rate:bpm:2', 'steps::2']);
  assert.deepEqual(garmin.leftOut, ['Body Battery', 'Avg Stress'], 'vendor scores are calculations, not measurements');
  const oura = H.readHealthCSV('date,Readiness Score,Sleep Score,Total Sleep Duration,Average HRV,Average Resting Heart Rate,Respiratory Rate\n2026-10-26,82,77,25200,45,55,14.5\n');
  assert.equal(oura.name, 'Oura');
  assert.deepEqual(byMetric(oura), { 'sleep-seconds 2026-10-26': [25200, 's', 'sum'], 'hrv 2026-10-26': [45, 'ms', 'mean'], 'resting-heart-rate 2026-10-26': [55, 'bpm', 'mean'], 'respiratory-rate 2026-10-26': [14.5, 'breaths/min', 'mean'] }, 'seconds stay seconds');
  const fit = H.readHealthCSV('Date,Move Minutes count,Calories (kcal),Distance (m),Average heart rate (bpm),Max heart rate (bpm),Min heart rate (bpm),Low latitude (deg),Low longitude (deg),Step count,Average weight (kg)\n2026-10-25,40,2100.5,5400,72.3,130,52,51.5,-0.12,7600,70.2\n');
  assert.equal(fit.name, 'Google Fit');
  assert.deepEqual(byMetric(fit), { 'exercise 2026-10-25': [40, 'min', 'sum'], 'energy 2026-10-25': [2100.5, 'kcal', 'sum'], 'distance 2026-10-25': [5400, 'm', 'sum'], 'steps 2026-10-25': [7600, '', 'sum'], 'heart-rate 2026-10-25': [72.3, 'bpm', 'mean'], 'heart-rate-min 2026-10-25': [52, 'bpm', 'minimum'], 'heart-rate-max 2026-10-25': [130, 'bpm', 'maximum'], 'body-mass 2026-10-25': [70.2, 'kg', 'latest'] });
  assert.ok(fit.leftOut.includes('Low latitude (deg)') && fit.leftOut.includes('Low longitude (deg)'));
  const hc = H.readHealthCSV('start_time;steps;heart_rate;weight (lb)\n2026-10-25 08:00;1000;70;150\n2026-10-25 18:00;2500;80;151\n');
  assert.deepEqual(byMetric(hc), { 'steps 2026-10-25': [3500, '', 'sum'], 'heart-rate 2026-10-25': [75, 'bpm', 'mean'], 'body-mass 2026-10-25': [151, 'lb', 'latest'] }, 'rows on one day combine per metric');
});

test('CSV: an unknown layout falls back to the generic reader, without location columns', () => {
  const g = H.readHealthCSV('Day,Pages read,Water (l),Latitude,Longitude,Blood Glucose (mg/dL),Insulin units,Period flow\n2026-10-25,30,2,51.5,-0.1,95,4,2\n');
  assert.equal(g.preset, 'generic'); assert.deepEqual(g.metrics.map((m) => `${m.metric}:${m.unit}`), ['pages-read:', 'water:l']);
  assert.deepEqual(g.leftOut, ['Latitude', 'Longitude', 'Blood Glucose (mg/dL)', 'Insulin units', 'Period flow'], 'location, lab, medication and cycle columns are never read');
  const amb = H.readHealthCSV('Date,Steps\n03/04/2026,100\n2026-10-25,200\n');
  assert.equal(amb.ambiguous, 1);
  assert.throws(() => H.readHealthCSV('Steps,Note\n100,x\n200,y\n'), /No column of dates/);
});

test('into the journal: measurement records with source: and aggregation:, no diagnostics, charted; a second import adds nothing', () => {
  const s = H.readAppleHealth(XML), numbers = s.numbers({ metrics: ['steps', 'sleep', 'heart-rate'] });
  const J = '# Notebook\n\n### 2026-10-26 | Monday\n\n:::record measurement #sleep-2026-10-26\nmetric: sleep\nunit: h\nvalue:\n:::\n';
  const w = A.addNumbers(J, numbers, { source: 'Apple Health export.xml' });
  assert.deepEqual([w.filled, w.added, w.kept], [1, 3, 0]);
  assert.match(w.text, /### 2026-10-25 \| Sunday\n\n:::record measurement #heart-rate-2026-10-25\nmetric: heart-rate\nvalue: 70\nunit: bpm\naggregation: mean\nsource: Apple Health export\.xml\n:::/);
  assert.match(w.text, /#sleep-2026-10-26\nmetric: sleep\nunit: h\nvalue: 7\naggregation: sum\nsource: Apple Health export\.xml\n:::/, 'the blank is filled where it is');
  const mins = A.addNumbers(J, [{ date: '2026-10-26', metric: 'sleep', value: 420, unit: 'min' }], { source: 'x' });
  assert.deepEqual([mins.filled, mins.added, mins.skipped, mins.text], [0, 0, 1, J], 'a blank in hours is not filled with minutes');
  const ast = parse(w.text);
  assert.deepEqual(ast.diagnostics, []);
  const charted = collectNumbers(ast).metrics;
  assert.deepEqual([...charted.get('steps').byDate.keys()].sort(), ['2026-10-25', '2026-10-26']);
  assert.equal(charted.get('sleep').unit, 'h');
  assert.deepEqual(A.addNumbers(w.text, numbers, { source: 'Apple Health export.xml' }).added, 0);
});
