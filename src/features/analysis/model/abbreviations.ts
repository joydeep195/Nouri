// Short names that appear on labels instead of the full ingredient or additive name.
// `code` links an abbreviation to its additive so the additive rules apply to it too.

export interface Abbreviation {
  meaning: string;
  code?: string;
}

export const ABBREVIATIONS: Readonly<Record<string, Abbreviation>> = {
  // Emulsifiers and stabilisers
  pgpr: { meaning: 'Polyglycerol polyricinoleate', code: 'e476' },
  ssl: { meaning: 'Sodium stearoyl lactylate', code: 'e481' },
  csl: { meaning: 'Calcium stearoyl lactylate', code: 'e482' },
  datem: { meaning: 'Diacetyl tartaric acid esters of mono- and diglycerides', code: 'e472e' },
  gms: { meaning: 'Glyceryl monostearate', code: 'e471' },
  cmc: { meaning: 'Carboxymethyl cellulose (cellulose gum)', code: 'e466' },
  'na-cmc': { meaning: 'Sodium carboxymethyl cellulose', code: 'e466' },
  mcc: { meaning: 'Microcrystalline cellulose', code: 'e460' },
  hpmc: { meaning: 'Hydroxypropyl methylcellulose', code: 'e464' },
  ps80: { meaning: 'Polysorbate 80', code: 'e433' },
  'ps 80': { meaning: 'Polysorbate 80', code: 'e433' },
  // Raising agents, acidity regulators, phosphates
  sapp: { meaning: 'Sodium acid pyrophosphate', code: 'e450' },
  stpp: { meaning: 'Sodium tripolyphosphate', code: 'e451' },
  tspp: { meaning: 'Tetrasodium pyrophosphate', code: 'e450' },
  salp: { meaning: 'Sodium aluminium phosphate', code: 'e541' },
  gdl: { meaning: 'Glucono-delta-lactone', code: 'e575' },
  edta: { meaning: 'Calcium disodium EDTA', code: 'e385' },
  // Preservatives, antioxidants, flavour enhancers, sweeteners
  tbhq: { meaning: 'Tertiary butylhydroquinone', code: 'e319' },
  bha: { meaning: 'Butylated hydroxyanisole', code: 'e320' },
  bht: { meaning: 'Butylated hydroxytoluene', code: 'e321' },
  msg: { meaning: 'Monosodium glutamate', code: 'e621' },
  'ace-k': { meaning: 'Acesulfame potassium', code: 'e950' },
  'ace k': { meaning: 'Acesulfame potassium', code: 'e950' },
  // Ingredients
  hfcs: { meaning: 'High-fructose corn syrup' },
  hvp: { meaning: 'Hydrolysed vegetable protein' },
  tvp: { meaning: 'Textured vegetable protein' },
  mct: { meaning: 'Medium-chain triglycerides' },
  smp: { meaning: 'Skimmed milk powder' },
  wmp: { meaning: 'Whole milk powder' },
  msnf: { meaning: 'Milk solids non-fat' },
  wpc: { meaning: 'Whey protein concentrate' },
  wpi: { meaning: 'Whey protein isolate' },
  mpc: { meaning: 'Milk protein concentrate' },
  dha: { meaning: 'Docosahexaenoic acid (omega-3)' },
  epa: { meaning: 'Eicosapentaenoic acid (omega-3)' },
};
