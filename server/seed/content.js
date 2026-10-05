// Seed content for the Stage 1 plan. Checklist item ids are stable keys: progress is stored
// against them, so don't rename an id once you've started (changing the label is fine).

export const PERSONS = ['yo', 'tú', 'él/ella', 'nosotros', 'vosotros', 'ellos/ellas'];

const table = (verb, forms) => ({
  verb,
  forms: forms.map(([es, ipa]) => ({ es, ipa })),
});

export const WEEKS = [
  {
    week: 1,
    title: 'Regular present tense',
    summary: 'The three regular patterns: -ar, -er, -ir.',
    tables: [
      {
        id: 'w1-regular',
        title: 'Model verbs',
        persons: PERSONS,
        verbs: [
          table('hablar', [['hablo', 'ˈa.βlo'], ['hablas', 'ˈa.βlas'], ['habla', 'ˈa.βla'], ['hablamos', 'aˈβla.mos'], ['habláis', 'aˈβlajs'], ['hablan', 'ˈa.βlan']]),
          table('comer', [['como', 'ˈko.mo'], ['comes', 'ˈko.mes'], ['come', 'ˈko.me'], ['comemos', 'koˈme.mos'], ['coméis', 'koˈmejs'], ['comen', 'ˈko.men']]),
          table('vivir', [['vivo', 'ˈbi.βo'], ['vives', 'ˈbi.βes'], ['vive', 'ˈbi.βe'], ['vivimos', 'biˈβi.mos'], ['vivís', 'biˈβis'], ['viven', 'ˈbi.βen']]),
        ],
      },
    ],
    verbs: ['hablar', 'trabajar', 'tomar', 'llevar', 'necesitar', 'comer', 'beber', 'aprender', 'vivir', 'escribir'],
    chunks: [],
    checklist: [
      { id: 'w1-d12', label: 'Days 1–2: -ar verbs' },
      { id: 'w1-d34', label: 'Days 3–4: -er / -ir verbs' },
      { id: 'w1-d56', label: 'Days 5–6: mixed swaps' },
      { id: 'w1-end', label: 'End: 5 routine sentences, no pronouns' },
    ],
  },
  {
    week: 2,
    title: 'ser, estar, tener, ir, hacer',
    summary: 'The five irregular workhorses, plus the chunks built on them.',
    tables: [
      {
        id: 'w2-irregular',
        title: 'Present tense',
        persons: PERSONS,
        verbs: [
          table('ser', [['soy', 'soj'], ['eres', 'ˈe.ɾes'], ['es', 'es'], ['somos', 'ˈso.mos'], ['sois', 'sojs'], ['son', 'son']]),
          table('estar', [['estoy', 'esˈtoj'], ['estás', 'esˈtas'], ['está', 'esˈta'], ['estamos', 'esˈta.mos'], ['estáis', 'esˈtajs'], ['están', 'esˈtan']]),
          table('tener', [['tengo', 'ˈteŋ.ɡo'], ['tienes', 'ˈtje.nes'], ['tiene', 'ˈtje.ne'], ['tenemos', 'teˈne.mos'], ['tenéis', 'teˈnejs'], ['tienen', 'ˈtje.nen']]),
          table('ir', [['voy', 'boj'], ['vas', 'bas'], ['va', 'ba'], ['vamos', 'ˈba.mos'], ['vais', 'bajs'], ['van', 'ban']]),
          table('hacer', [['hago', 'ˈa.ɣo'], ['haces', 'ˈa.θes'], ['hace', 'ˈa.θe'], ['hacemos', 'aˈθe.mos'], ['hacéis', 'aˈθejs'], ['hacen', 'ˈa.θen']]),
        ],
      },
    ],
    verbs: ['ser', 'estar', 'tener', 'ir', 'hacer'],
    chunks: [
      { es: 'soy de…', en: "I'm from…" },
      { es: 'es importante', en: "it's important" },
      { es: 'estoy cansado', en: "I'm tired" },
      { es: 'está en casa', en: "he/she is at home" },
      { es: 'tengo hambre', en: "I'm hungry" },
      { es: 'tengo que + verb', en: 'I have to…' },
      { es: 'voy a + verb', en: "I'm going to…" },
      { es: 'vamos', en: "let's go / we go" },
      { es: 'hace frío', en: "it's cold" },
      { es: '¿qué haces?', en: 'what are you doing?' },
    ],
    note: 'IPA uses Castilian [θ] for c/z (hacer). Latin American Spanish uses [s].',
    checklist: [
      { id: 'w2-d12', label: 'Days 1–2: ser / estar' },
      { id: 'w2-d34', label: 'Days 3–4: tener / ir / hacer' },
      { id: 'w2-d56', label: 'Days 5–6: mixed swaps' },
      { id: 'w2-end', label: 'End: 5 ser + estar sentences about me' },
    ],
  },
  {
    week: 3,
    title: 'Pronouns & the gustar frame',
    summary: 'Subject pronouns vs indirect-object pronouns, and verbs that work like gustar.',
    pronouns: [
      { subject: 'yo', io: 'me' },
      { subject: 'tú', io: 'te' },
      { subject: 'él/ella/usted', io: 'le' },
      { subject: 'nosotros', io: 'nos' },
      { subject: 'vosotros', io: 'os' },
      { subject: 'ellos/ellas', io: 'les' },
    ],
    gustarVerbs: [
      { inf: 'gustar', sg: 'gusta', pl: 'gustan', en: 'to please (like)' },
      { inf: 'encantar', sg: 'encanta', pl: 'encantan', en: 'to delight (love)' },
      { inf: 'interesar', sg: 'interesa', pl: 'interesan', en: 'to interest' },
      { inf: 'molestar', sg: 'molesta', pl: 'molestan', en: 'to bother' },
      { inf: 'apetecer', sg: 'apetece', pl: 'apetecen', en: 'to feel like' },
    ],
    chunks: [
      { es: 'me encanta', en: 'I love it' },
      { es: 'no me gusta', en: "I don't like it" },
      { es: 'me da igual', en: "I don't mind / I don't care" },
      { es: '¿te apetece…?', en: 'do you feel like…?' },
    ],
    checklist: [
      { id: 'w3-d12', label: 'Days 1–2: pronoun swaps' },
      { id: 'w3-d34', label: 'Days 3–4: gusta vs gustan' },
      { id: 'w3-d56', label: 'Days 5–6: reaction chunks' },
      { id: 'w3-end', label: "End: 5 likes / loves / don't-care sentences" },
    ],
  },
  {
    week: 4,
    title: 'Integration',
    summary: 'Put it all together out loud.',
    chunks: [],
    checklist: [
      { id: 'w4-d12', label: 'Days 1–2: narrate my day aloud' },
      { id: 'w4-d3', label: 'Day 3: shadow a 1–2 min clip' },
      { id: 'w4-d4', label: 'Day 4: shadow a 1–2 min clip' },
      { id: 'w4-d5', label: 'Day 5: record a 10-sentence day description' },
      { id: 'w4-d6', label: 'Day 6: drill the pauses and re-record' },
    ],
  },
];

export const EXIT_CRITERIA = [
  { id: 'exit-day', label: 'Describe my day in 10 present-tense sentences without pausing' },
  { id: 'exit-regular', label: 'All 6 forms of any regular verb in under 5 seconds' },
  { id: 'exit-irregular', label: 'ser, estar, tener, ir, hacer correct in my own sentences' },
  { id: 'exit-pronouns', label: 'Right pronoun set without hesitating' },
  { id: 'exit-gustar', label: 'Gustar frame with 5 verbs, singular and plural' },
];

export const DAILY_BLOCKS = [
  { id: 'cards', label: 'Cards', minutes: 20 },
  { id: 'shadow', label: 'Shadow 2–3 sentences mined yesterday', minutes: 10 },
  { id: 'swap', label: "Swap drill on this week's target", minutes: 15 },
  { id: 'input', label: 'Input — mine 3–5 sentences', minutes: 35 },
  { id: 'errors', label: 'Error log entry', minutes: 2 },
];

export const WEEKLY_TARGET_MINUTES = 600;
