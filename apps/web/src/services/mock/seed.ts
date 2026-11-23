import {
  ENTRY_POINTS,
  PROVINCES,
  type Currency,
  type DeclarationStatus,
  type Establishment,
  type EstablishmentKind,
  type EstablishmentStatus,
  type ImportDeclaration,
  type ProductLine,
  type ProductReference,
  type ProvinceCode,
  type Role,
  type StatusEvent,
} from '@acorep/shared';

/**
 * Fictional demo data. Deterministic (seeded PRNG) with dates relative to `now`, so the demo
 * never goes stale. Names are invented; any resemblance to real businesses is coincidental.
 */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;

/** Pharmacies per province, roughly following urban population. */
const PHARMACY_WEIGHTS: Record<ProvinceCode, number> = {
  'CD-KN': 140,
  'CD-HK': 48,
  'CD-NK': 32,
  'CD-BC': 24,
  'CD-SK': 20,
  'CD-KE': 18,
  'CD-LU': 17,
  'CD-TO': 14,
  'CD-KC': 12,
  'CD-IT': 10,
  'CD-KL': 9,
  'CD-EQ': 8,
  'CD-KS': 8,
  'CD-TA': 6,
  'CD-MA': 6,
  'CD-HL': 5,
  'CD-LO': 5,
  'CD-KG': 4,
  'CD-SU': 4,
  'CD-HU': 4,
  'CD-MO': 3,
  'CD-NU': 3,
  'CD-MN': 3,
  'CD-TU': 2,
  'CD-SA': 2,
  'CD-BU': 2,
};

const KINSHASA_COMMUNES = [
  'Gombe',
  'Limete',
  'Ngaliema',
  'Kintambo',
  'Lingwala',
  'Kasa-Vubu',
  'Bandalungwa',
  'Masina',
  'Matete',
  'Lemba',
  'Kalamu',
  'Barumbu',
];
const PHARMACY_NAMES = [
  'de la Paix',
  'Bon Samaritain',
  'Lumière',
  'Elikia',
  'Bomoko',
  'Tujenge',
  'Neema',
  'Amani',
  'Shalom',
  'Victoire',
  'du Marché',
  'de l’Avenue',
  'Santé Plus',
  'Étoile',
  'La Grâce',
  'Espoir',
  'du Rond-Point',
  'Saint-Luc',
  'Horizon',
  'Mwinda',
];
const FIRST = [
  'Mbuyi',
  'Ngalula',
  'Kabongo',
  'Mukendi',
  'Lukusa',
  'Kasongo',
  'Mutombo',
  'Nzuzi',
  'Bahati',
  'Kavira',
  'Ilunga',
  'Mwamba',
  'Lokwa',
  'Bolamba',
  'Masika',
  'Kitenge',
];
const LAST = [
  'Kalala',
  'Tshibangu',
  'Ilunga',
  'Nsimba',
  'Mwamba',
  'Banza',
  'Kabeya',
  'Makiese',
  'Furaha',
  'Kahindo',
  'Mbala',
  'Lunda',
  'Bokele',
  'Ndjoli',
  'Kyalu',
  'Mulumba',
];
const STREETS = [
  'avenue du Commerce',
  'boulevard du 30 Juin',
  'avenue de la Libération',
  'avenue Kasa-Vubu',
  'avenue des Écoles',
  'avenue du Marché',
  'route principale',
  'avenue de l’Hôpital',
];

const IMPORTERS: { name: string; kind: EstablishmentKind; province: ProvinceCode }[] = [
  { name: 'Fleuve Santé Distribution SARL', kind: 'IMPORTER', province: 'CD-KN' },
  { name: 'Medika Import SARL', kind: 'IMPORTER', province: 'CD-KN' },
  { name: 'Kin Pharma Logistique SA', kind: 'WHOLESALER', province: 'CD-KN' },
  { name: 'Équateur Médical SARL', kind: 'IMPORTER', province: 'CD-KN' },
  { name: 'Grands Lacs Pharma SARL', kind: 'IMPORTER', province: 'CD-NK' },
  { name: 'Kivu Répartition SARL', kind: 'WHOLESALER', province: 'CD-SK' },
  { name: 'Cuivre Santé SA', kind: 'IMPORTER', province: 'CD-HK' },
  { name: 'Katanga Distribution Médicale SARL', kind: 'WHOLESALER', province: 'CD-HK' },
  { name: 'Lualaba Pharma SARL', kind: 'IMPORTER', province: 'CD-LU' },
  { name: 'Matadi Médical Import SARL', kind: 'IMPORTER', province: 'CD-BC' },
  { name: 'Kasaï Santé Distribution SARL', kind: 'WHOLESALER', province: 'CD-KE' },
  { name: 'Tshopo Médicaments SARL', kind: 'WHOLESALER', province: 'CD-TO' },
  { name: 'Laboratoires Congo Génériques SA', kind: 'MANUFACTURER', province: 'CD-KN' },
  { name: 'Biopharma du Katanga SARL', kind: 'MANUFACTURER', province: 'CD-HK' },
];

const RCCM_CITY: Partial<Record<ProvinceCode, string>> = {
  'CD-KN': 'KNG',
  'CD-HK': 'LSH',
  'CD-NK': 'GOM',
  'CD-SK': 'BKV',
};

/** Fictional extract of the AMM register, with a typical unit price (USD) for seeding. */
export const PRODUCTS: (ProductReference & { unitPrice: number })[] = [
  {
    productName: 'Amoxicilline Gé',
    inn: 'Amoxicilline',
    dosageForm: 'CAPSULE',
    strength: '500 mg',
    atcCode: 'J01CA04',
    hsCode: '300410',
    ammNumber: 'AMM/ACOREP/2023/0412',
    unit: 'boîte de 20',
    unitPrice: 1.8,
  },
  {
    productName: 'Paracétamol Gé',
    inn: 'Paracétamol',
    dosageForm: 'TABLET',
    strength: '500 mg',
    atcCode: 'N02BE01',
    hsCode: '300490',
    ammNumber: 'AMM/ACOREP/2022/0198',
    unit: 'boîte de 100',
    unitPrice: 1.2,
  },
  {
    productName: 'Artéméther-Luméfantrine',
    inn: 'Artéméther + luméfantrine',
    dosageForm: 'TABLET',
    strength: '20 mg/120 mg',
    atcCode: 'P01BF01',
    hsCode: '300460',
    ammNumber: 'AMM/ACOREP/2021/0077',
    unit: 'boîte de 24',
    unitPrice: 2.4,
  },
  {
    productName: 'Ceftriaxone',
    inn: 'Ceftriaxone',
    dosageForm: 'INJECTABLE',
    strength: '1 g',
    atcCode: 'J01DD04',
    hsCode: '300420',
    ammNumber: 'AMM/ACOREP/2023/0533',
    unit: 'flacon',
    unitPrice: 0.9,
  },
  {
    productName: 'Metformine Gé',
    inn: 'Metformine',
    dosageForm: 'TABLET',
    strength: '850 mg',
    atcCode: 'A10BA02',
    hsCode: '300490',
    ammNumber: 'AMM/ACOREP/2022/0311',
    unit: 'boîte de 30',
    unitPrice: 1.5,
  },
  {
    productName: 'SRO faible osmolarité',
    inn: 'Sels de réhydratation orale',
    dosageForm: 'POWDER',
    strength: '20,5 g',
    atcCode: 'A07CA01',
    hsCode: '300490',
    ammNumber: 'AMM/ACOREP/2020/0045',
    unit: 'sachet',
    unitPrice: 0.12,
  },
  {
    productName: 'Insuline humaine',
    inn: 'Insuline humaine',
    dosageForm: 'INJECTABLE',
    strength: '100 UI/ml',
    atcCode: 'A10AB01',
    hsCode: '300431',
    ammNumber: 'AMM/ACOREP/2023/0618',
    unit: 'flacon 10 ml',
    unitPrice: 4.6,
  },
  {
    productName: 'Cotrimoxazole Gé',
    inn: 'Sulfaméthoxazole + triméthoprime',
    dosageForm: 'TABLET',
    strength: '400 mg/80 mg',
    atcCode: 'J01EE01',
    hsCode: '300490',
    ammNumber: 'AMM/ACOREP/2021/0254',
    unit: 'boîte de 100',
    unitPrice: 1.4,
  },
  {
    productName: 'Sérum salé isotonique',
    inn: 'Chlorure de sodium',
    dosageForm: 'INFUSION',
    strength: '0,9 %',
    atcCode: 'B05BB01',
    hsCode: '300490',
    ammNumber: 'AMM/ACOREP/2020/0102',
    unit: 'poche 500 ml',
    unitPrice: 0.7,
  },
  {
    productName: 'Seringue stérile 5 ml',
    inn: '—',
    dosageForm: 'MEDICAL_DEVICE',
    strength: '5 ml',
    hsCode: '901831',
    ammNumber: 'ENR/DM/2022/0087',
    unit: 'boîte de 100',
    unitPrice: 3.5,
  },
];
const MANUFACTURERS: { name: string; country: string }[] = [
  { name: 'Ganga Lifesciences Ltd', country: 'IN' },
  { name: 'Deccan Generics Pvt Ltd', country: 'IN' },
  { name: 'Huaxin Pharmaceutical Co.', country: 'CN' },
  { name: 'Laboratoires Rhône Santé', country: 'FR' },
  { name: 'Brabant Pharma NV', country: 'BE' },
  { name: 'Rift Valley Generics Ltd', country: 'KE' },
];

export const DEMO_STAFF: Record<
  Exclude<Role, 'OPERATOR'>,
  { userId: string; name: string; province?: ProvinceCode }
> = {
  ADMIN: { userId: 'u-admin', name: 'Dr Mireille Kabeya' },
  IMPORT_OFFICER: { userId: 'u-import', name: 'Dr Patrick Lukusa' },
  PROVINCIAL_OFFICER: { userId: 'u-prov-hk', name: 'Dr Esther Mwamba', province: 'CD-HK' },
  INSPECTOR: { userId: 'u-insp', name: 'Jean-Paul Nsimba' },
  LEADERSHIP: { userId: 'u-dg', name: 'Direction générale' },
};

export interface Seed {
  establishments: Establishment[];
  declarations: ImportDeclaration[];
}

export function buildSeed(now = new Date()): Seed {
  const r = rng(243);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)]!;
  const iso = (offsetDays: number) => new Date(now.getTime() + offsetDays * DAY).toISOString();
  const person = () => `Dr ${pick(FIRST)} ${pick(LAST)}`;
  const phone = () => `+2438${Math.floor(1 + r() * 9)}${String(Math.floor(r() * 1e7)).padStart(7, '0')}`;
  const sys = (role: Role) => {
    const s = role === 'OPERATOR' ? { userId: 'u-op', name: 'Opérateur' } : DEMO_STAFF[role];
    return { userId: s.userId, name: s.name, role };
  };

  const establishments: Establishment[] = [];
  let n = 0;
  const addEst = (kind: EstablishmentKind, legalName: string, province: ProvinceCode, status: EstablishmentStatus) => {
    n += 1;
    const p = PROVINCES.find((x) => x.code === province)!;
    const created = -Math.floor(60 + r() * 1400);
    const history: StatusEvent<EstablishmentStatus>[] = [
      { at: iso(created), by: sys('OPERATOR'), from: null, to: 'SUBMITTED' },
    ];
    const reviewer = province === 'CD-HK' ? sys('PROVINCIAL_OFFICER') : sys('ADMIN');
    if (status !== 'SUBMITTED')
      history.push({ at: iso(created + 3), by: reviewer, from: 'SUBMITTED', to: 'UNDER_REVIEW' });
    if (status === 'INFO_REQUESTED')
      history.push({
        at: iso(created + 6),
        by: reviewer,
        from: 'UNDER_REVIEW',
        to: 'INFO_REQUESTED',
        comment: 'Joindre le diplôme du pharmacien responsable et le plan des locaux.',
      });
    let licence: Establishment['licence'];
    if (status === 'ACTIVE' || status === 'SUSPENDED') {
      const issued = created + 20;
      history.push({ at: iso(issued), by: reviewer, from: 'UNDER_REVIEW', to: 'ACTIVE' });
      // A few licences issued long ago have expired (EXPIRED is derived on read).
      const years = r() < 0.06 ? 0.4 : 5;
      licence = {
        number: `LIC-${new Date(iso(issued)).getFullYear()}-${String(n).padStart(5, '0')}`,
        issuedAt: iso(issued),
        expiresAt: iso(issued + Math.round(years * 365)),
      };
      if (status === 'SUSPENDED')
        history.push({
          at: iso(-12),
          by: reviewer,
          from: 'ACTIVE',
          to: 'SUSPENDED',
          comment: 'Inspection du 5 : conditions de stockage non conformes (chaîne du froid).',
        });
    }
    const commune = province === 'CD-KN' ? pick(KINSHASA_COMMUNES) : undefined;
    establishments.push({
      id: `est-${String(n).padStart(4, '0')}`,
      kind,
      legalName,
      rccm: `CD/${RCCM_CITY[province] ?? 'KNG'}/RCCM/${String(15 + Math.floor(r() * 10))}-B-${String(Math.floor(r() * 99999)).padStart(5, '0')}`,
      idNat: `01-${Math.floor(10 + r() * 89)}-N${String(Math.floor(r() * 99999)).padStart(5, '0')}`,
      nif: `A${String(Math.floor(r() * 9999999)).padStart(7, '0')}${String.fromCharCode(65 + Math.floor(r() * 26))}`,
      province,
      city: p.capital,
      commune,
      address: `${Math.floor(1 + r() * 250)}, ${pick(STREETS)}${commune ? `, ${commune}` : ''}`,
      location: { lat: p.lat + (r() - 0.5) * 0.08, lon: p.lon + (r() - 0.5) * 0.08 },
      pharmacist: { name: person(), orderNumber: `CNOP/${Math.floor(1000 + r() * 8999)}`, phone: phone() },
      contact: { phone: phone() },
      status,
      licence,
      createdAt: iso(created),
      updatedAt: history[history.length - 1]!.at,
      history,
    });
  };

  const pickStatus = (): EstablishmentStatus => {
    const x = r();
    return x < 0.82
      ? 'ACTIVE'
      : x < 0.88
        ? 'SUBMITTED'
        : x < 0.93
          ? 'UNDER_REVIEW'
          : x < 0.96
            ? 'INFO_REQUESTED'
            : 'SUSPENDED';
  };

  for (const imp of IMPORTERS) addEst(imp.kind, imp.name, imp.province, 'ACTIVE');
  const importerIds = establishments.map((e) => e.id);
  for (const p of PROVINCES) {
    const count = PHARMACY_WEIGHTS[p.code];
    for (let i = 0; i < count; i++) addEst('PHARMACY', `Pharmacie ${pick(PHARMACY_NAMES)}`, p.code, pickStatus());
    // Rural depots where pharmacies are scarce.
    if (count < 10)
      for (let i = 0; i < 2 + Math.floor(r() * 3); i++)
        addEst('DEPOT', `Dépôt pharmaceutique ${pick(PHARMACY_NAMES)}`, p.code, pickStatus());
  }

  // ---------- Declarations ----------
  const declarations: ImportDeclaration[] = [];
  const statusFor = (ageDays: number): DeclarationStatus => {
    const x = r();
    if (ageDays < 4) return x < 0.6 ? 'SUBMITTED' : 'UNDER_REVIEW';
    if (ageDays < 15) return x < 0.35 ? 'UNDER_REVIEW' : x < 0.5 ? 'INFO_REQUESTED' : 'APPROVED';
    if (ageDays < 45) return x < 0.75 ? 'APPROVED' : x < 0.9 ? 'CLEARED' : 'REJECTED';
    return x < 0.82 ? 'CLEARED' : x < 0.9 ? 'REJECTED' : x < 0.95 ? 'NON_COMPLIANT' : 'CANCELLED';
  };
  const PATH: Record<DeclarationStatus, DeclarationStatus[]> = {
    DRAFT: [],
    SUBMITTED: ['SUBMITTED'],
    UNDER_REVIEW: ['SUBMITTED', 'UNDER_REVIEW'],
    INFO_REQUESTED: ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED'],
    APPROVED: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'],
    REJECTED: ['SUBMITTED', 'UNDER_REVIEW', 'REJECTED'],
    CANCELLED: ['SUBMITTED', 'CANCELLED'],
    CLEARED: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CLEARED'],
    NON_COMPLIANT: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'NON_COMPLIANT'],
  };
  const COMMENTS: Partial<Record<DeclarationStatus, string>> = {
    INFO_REQUESTED: 'Merci de joindre les certificats d’analyse des lots et la facture définitive.',
    REJECTED: 'Produit sans AMM valide en RDC pour ce dosage.',
    NON_COMPLIANT: 'Écart de quantité constaté à l’inspection et conditions de transport hors plage de température.',
  };
  const ACTOR: Record<DeclarationStatus, Role> = {
    DRAFT: 'OPERATOR',
    SUBMITTED: 'OPERATOR',
    CANCELLED: 'OPERATOR',
    UNDER_REVIEW: 'IMPORT_OFFICER',
    INFO_REQUESTED: 'IMPORT_OFFICER',
    APPROVED: 'IMPORT_OFFICER',
    REJECTED: 'IMPORT_OFFICER',
    CLEARED: 'INSPECTOR',
    NON_COMPLIANT: 'INSPECTOR',
  };

  for (let i = 0; i < 90; i++) {
    const importerId = pick(importerIds);
    const importer = establishments.find((e) => e.id === importerId)!;
    // Importers mostly use the entry point nearest to them.
    const mode = r() < 0.55 ? 'SEA' : 'AIR';
    const near = ENTRY_POINTS.filter((e) => e.mode === mode && e.province === importer.province);
    const entry = near.length
      ? pick(near)
      : mode === 'SEA'
        ? ENTRY_POINTS[0]
        : pick(ENTRY_POINTS.filter((e) => e.mode === 'AIR'));
    const ageDays = Math.floor(Math.pow(r(), 1.6) * 360);
    const status = statusFor(ageDays);
    const submitted = -ageDays;
    const arrival = submitted + (mode === 'SEA' ? 35 : 10);
    const lineCount = 1 + Math.floor(r() * 4);
    const currency: Currency = r() < 0.8 ? 'USD' : 'EUR';
    const lines: ProductLine[] = Array.from({ length: lineCount }, () => {
      const p = pick(PRODUCTS);
      const m = pick(MANUFACTURERS);
      // ~1 line in 12 has a short remaining shelf life, to show the reviewer warning.
      const shelfDays = r() < 0.08 ? 200 + Math.floor(r() * 120) : 540 + Math.floor(r() * 500);
      return {
        ...p,
        manufacturer: m.name,
        originCountry: m.country,
        batchNumber: `${m.country}${Math.floor(10000 + r() * 89999)}`,
        expiryDate: iso(arrival + shelfDays).slice(0, 10),
        quantity: Math.ceil((500 + r() * 20000) / 50) * 50,
      };
    });
    const history: StatusEvent<DeclarationStatus>[] = [];
    let from: DeclarationStatus | null = 'DRAFT';
    let t = submitted;
    for (const step of PATH[status]) {
      history.push({
        at: iso(t),
        by:
          ACTOR[step] === 'OPERATOR'
            ? { userId: `u-op-${importer.id}`, name: importer.legalName, role: 'OPERATOR' }
            : sys(ACTOR[step]),
        from,
        to: step,
        ...(COMMENTS[step] ? { comment: COMMENTS[step] } : {}),
      });
      from = step;
      t += step === 'APPROVED' ? Math.max(1, arrival - t) : 1 + Math.floor(r() * 3);
    }
    const decided = history.find((h) => h.to === 'APPROVED' || h.to === 'REJECTED');
    const ref = 900 - i;
    declarations.push({
      id: `dec-${String(ref).padStart(5, '0')}`,
      reference: `DI-${new Date(iso(submitted)).getFullYear()}-${String(ref).padStart(6, '0')}`,
      importerId: importer.id,
      importerName: importer.legalName,
      destinationProvince: importer.province,
      mode,
      entryPoint: entry.id,
      transportDocument:
        mode === 'SEA'
          ? `MAEU${Math.floor(100000000 + r() * 899999999)}`
          : `${pick(['071', '057', '706', '176'])}-${Math.floor(10000000 + r() * 89999999)}`,
      carrier:
        mode === 'SEA'
          ? pick(['Maersk', 'CMA CGM', 'MSC', 'Hapag-Lloyd'])
          : pick(['Ethiopian Cargo', 'Air France Cargo', 'Kenya Airways Cargo', 'Emirates SkyCargo']),
      shipmentCountry: lines[0]!.originCountry,
      supplier: lines[0]!.manufacturer,
      expectedArrival: iso(arrival).slice(0, 10),
      currency,
      lines,
      status,
      submittedAt: iso(submitted),
      decidedAt: decided?.at,
      createdAt: iso(submitted - 1),
      updatedAt: history[history.length - 1]!.at,
      history,
    });
  }

  return { establishments, declarations };
}
