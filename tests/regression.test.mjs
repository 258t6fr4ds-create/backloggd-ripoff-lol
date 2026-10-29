import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGame, validGameDate, safeCover } from '../src/types.ts';
import { buildLibraryInsights } from '../src/insights.ts';

const sample={
  id:'old-existing-game',title:'Kingdom Come: Deliverance',
  status:'completed',platform:'PS5',ownership:'digital',rating:9,
  hours:120,year:2018,genres:'RPG, Adventure',
  dlcs:[{id:'dlc-1',title:'From the Ashes',year:2018,coverUrl:'',catalogId:'rawg:456',
    catalogUrl:'',owned:true,addedAt:'2026-10-01T00:00:00Z'}],
  playthroughs:[{id:'run-1',title:'First run',status:'completed',hours:120,
    startDate:'2026-01-01',endDate:'2026-02-01',notes:'',
    createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-02-01T00:00:00Z'}],
  journal:[{id:'journal-1',title:'Ending',body:'Excellent finale',playthroughId:'run-1',
    createdAt:'2026-02-01T00:00:00Z',updatedAt:'2026-02-01T00:00:00Z'}],
  shelves:['Medieval','Favourites'],notes:'Personal review',
  addedAt:'2026-01-01T00:00:00Z',updatedAt:'2026-02-01T00:00:00Z'
};
test('legacy saves keep important records and gain safe defaults',()=>{
  const g=normalizeGame(sample);
  assert.ok(g);
  assert.equal(g.id,'old-existing-game');
  assert.equal(g.priority,0);
  assert.equal(g.progress,null);
  assert.deepEqual(g.sessions,[]);
  assert.equal(g.platform,'PS5');
  assert.equal(g.rating,9);
  assert.equal(g.hours,120);
  assert.equal(g.dlcs.length,1);
  assert.equal(g.dlcs[0].owned,true);
  assert.equal(g.playthroughs[0].title,'First run');
  assert.equal(g.journal[0].body,'Excellent finale');
  assert.deepEqual(g.shelves,['Medieval','Favourites']);
  assert.equal(g.notes,'Personal review');
});
test('completion and priority accept in-range values without modifying originals',()=>{
  const raw={...sample,priority:5,progress:0,sessions:[]};
  const original=JSON.stringify(raw);
  const g=normalizeGame(raw);
  assert.ok(g);
  assert.equal(g.priority,5);
  assert.equal(g.progress,0);
  assert.equal(JSON.stringify(raw),original);
  assert.equal(normalizeGame({...sample,priority:200,progress:300}).priority,0);
  assert.equal(normalizeGame({...sample,progress:-1}).progress,null);
});
test('session logs preserve validated dates, notes, time and hours flag',()=>{
  const g=normalizeGame({...sample,sessions:[
    {id:'session-good',date:'2024-02-29',minutes:145,note:'Boss fight',addedToHours:true,createdAt:'2024-02-29T12:00:00Z'},
    {id:'session-bad-day',date:'2025-02-29',minutes:60,note:'invalid',createdAt:'2025-02-28T00:00:00Z'},
    {id:'session-bad-time',date:'2025-04-03',minutes:0,note:'invalid',createdAt:'2025-04-03T00:00:00Z'},
  ]});
  assert.ok(g);
  assert.equal(g.sessions.length,1);
  assert.equal(g.sessions[0].date,'2024-02-29');
  assert.equal(g.sessions[0].minutes,145);
  assert.equal(g.sessions[0].addedToHours,true);
  assert.equal(g.hours,120,'normalization must not double-count session time');
});
test('calendar check rejects rollover dates, accepts leap days',()=>{
  assert.equal(validGameDate('2024-02-29'),true);
  assert.equal(validGameDate('2025-02-29'),false);
  assert.equal(validGameDate('2026-04-31'),false);
  assert.equal(validGameDate('2026-12-01'),true);
  assert.equal(validGameDate('2026-00-10'),false);
  assert.equal(validGameDate('2026/10/01'),false);
});
test('unsafe artwork URLs are rejected',()=>{
  assert.equal(safeCover('javascript:alert(1)'),'');
  assert.equal(safeCover('data:text/html;base64,YQ=='),'');
  assert.equal(safeCover('https://example.com/cover.jpg'),'https://example.com/cover.jpg');
});
test('library analytics exclude wishlist without changing saved data',()=>{
  const completed=normalizeGame(sample);
  const wished=normalizeGame({...sample,id:'wanted',title:'Future game',status:'wishlist',rating:null,hours:0});
  assert.ok(completed&&wished);
  const before=JSON.stringify([completed,wished]);
  const stats=buildLibraryInsights([completed,wished]);
  assert.equal(stats.total,2);
  assert.equal(stats.collectionCount,1);
  assert.equal(stats.completedCount,1);
  assert.equal(stats.loggedHours,120);
  assert.equal(stats.averageRating,9);
  assert.equal(stats.runs,1);
  assert.equal(stats.journalEntries,1);
  assert.equal(JSON.stringify([completed,wished]),before);
});
