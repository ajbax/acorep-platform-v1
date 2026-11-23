/**
 * DRC geography. Provinces are identified by their ISO 3166-2:CD code (the 26 provinces of the
 * 2015 decentralisation). `lat`/`lon` (WGS 84) locate the provincial capital. Names are the official French names; never translate or abbreviate them.
 */

export const PROVINCES = [
  { code: 'CD-BC', name: 'Kongo-Central', capital: 'Matadi', lat: -5.82, lon: 13.45 },
  { code: 'CD-BU', name: 'Bas-Uele', capital: 'Buta', lat: 2.79, lon: 24.73 },
  { code: 'CD-EQ', name: 'Équateur', capital: 'Mbandaka', lat: 0.05, lon: 18.26 },
  { code: 'CD-HK', name: 'Haut-Katanga', capital: 'Lubumbashi', lat: -11.66, lon: 27.48 },
  { code: 'CD-HL', name: 'Haut-Lomami', capital: 'Kamina', lat: -8.74, lon: 24.99 },
  { code: 'CD-HU', name: 'Haut-Uele', capital: 'Isiro', lat: 2.77, lon: 27.62 },
  { code: 'CD-IT', name: 'Ituri', capital: 'Bunia', lat: 1.56, lon: 30.25 },
  { code: 'CD-KC', name: 'Kasaï-Central', capital: 'Kananga', lat: -5.9, lon: 22.42 },
  { code: 'CD-KE', name: 'Kasaï-Oriental', capital: 'Mbuji-Mayi', lat: -6.14, lon: 23.59 },
  { code: 'CD-KG', name: 'Kwango', capital: 'Kenge', lat: -4.8, lon: 16.9 },
  { code: 'CD-KL', name: 'Kwilu', capital: 'Bandundu', lat: -3.32, lon: 17.38 },
  { code: 'CD-KN', name: 'Kinshasa', capital: 'Kinshasa', lat: -4.32, lon: 15.31 },
  { code: 'CD-KS', name: 'Kasaï', capital: 'Tshikapa', lat: -6.42, lon: 20.8 },
  { code: 'CD-LO', name: 'Lomami', capital: 'Kabinda', lat: -6.14, lon: 24.48 },
  { code: 'CD-LU', name: 'Lualaba', capital: 'Kolwezi', lat: -10.72, lon: 25.47 },
  { code: 'CD-MA', name: 'Maniema', capital: 'Kindu', lat: -2.95, lon: 25.92 },
  { code: 'CD-MN', name: 'Mai-Ndombe', capital: 'Inongo', lat: -1.95, lon: 18.27 },
  { code: 'CD-MO', name: 'Mongala', capital: 'Lisala', lat: 2.15, lon: 21.51 },
  { code: 'CD-NK', name: 'Nord-Kivu', capital: 'Goma', lat: -1.68, lon: 29.22 },
  { code: 'CD-NU', name: 'Nord-Ubangi', capital: 'Gbadolite', lat: 4.28, lon: 21.01 },
  { code: 'CD-SA', name: 'Sankuru', capital: 'Lusambo', lat: -4.97, lon: 23.44 },
  { code: 'CD-SK', name: 'Sud-Kivu', capital: 'Bukavu', lat: -2.51, lon: 28.86 },
  { code: 'CD-SU', name: 'Sud-Ubangi', capital: 'Gemena', lat: 3.25, lon: 19.77 },
  { code: 'CD-TA', name: 'Tanganyika', capital: 'Kalemie', lat: -5.95, lon: 29.19 },
  { code: 'CD-TO', name: 'Tshopo', capital: 'Kisangani', lat: 0.52, lon: 25.19 },
  { code: 'CD-TU', name: 'Tshuapa', capital: 'Boende', lat: -0.28, lon: 20.88 },
] as const;

export type ProvinceCode = (typeof PROVINCES)[number]['code'];
export const PROVINCE_CODES = PROVINCES.map((p) => p.code) as [ProvinceCode, ...ProvinceCode[]];

const byCode = new Map<string, (typeof PROVINCES)[number]>(PROVINCES.map((p) => [p.code, p]));
export const isProvinceCode = (v: string): v is ProvinceCode => byCode.has(v);
export const provinceName = (code: ProvinceCode) => byCode.get(code)!.name;

/** UN/CEFACT Recommendation 19 transport modes. V1 accepts sea and air only. */
export const TRANSPORT_MODES = ['SEA', 'AIR'] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

/**
 * Official points of entry for pharmaceutical imports. Airports carry their IATA code.
 * TODO(spec): confirm the list with the Direction Import & Export and add UN/LOCODEs.
 */
export const ENTRY_POINTS = [
  { id: 'MATADI', mode: 'SEA', name: 'Port de Matadi', province: 'CD-BC', lon: 13.45, lat: -5.82 },
  { id: 'BOMA', mode: 'SEA', name: 'Port de Boma', province: 'CD-BC', lon: 13.05, lat: -5.85 },
  { id: 'BANANA', mode: 'SEA', name: 'Port de Banana', province: 'CD-BC', lon: 12.33, lat: -6.01 },
  {
    id: 'FIH',
    mode: 'AIR',
    name: "Aéroport international de N'djili (Kinshasa)",
    province: 'CD-KN',
    lon: 15.44,
    lat: -4.39,
  },
  {
    id: 'FBM',
    mode: 'AIR',
    name: 'Aéroport international de la Luano (Lubumbashi)',
    province: 'CD-HK',
    lon: 27.53,
    lat: -11.59,
  },
  { id: 'GOM', mode: 'AIR', name: 'Aéroport international de Goma', province: 'CD-NK', lon: 29.24, lat: -1.67 },
  {
    id: 'FKI',
    mode: 'AIR',
    name: 'Aéroport international de Bangoka (Kisangani)',
    province: 'CD-TO',
    lon: 25.34,
    lat: 0.48,
  },
] as const satisfies readonly {
  id: string;
  mode: TransportMode;
  name: string;
  province: ProvinceCode;
  lon: number;
  lat: number;
}[];

export type EntryPointId = (typeof ENTRY_POINTS)[number]['id'];
export const ENTRY_POINT_IDS = ENTRY_POINTS.map((e) => e.id) as [EntryPointId, ...EntryPointId[]];
export const entryPoint = (id: EntryPointId) => ENTRY_POINTS.find((e) => e.id === id)!;
