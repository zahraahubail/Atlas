import { feature } from 'topojson-client';
import { geoCircle } from 'd3-geo';
import world from 'world-atlas/countries-50m.json';
import bahrainDetail from './bahrain-10m.json';
import lookup from 'country-code-lookup';
import { countries as countryInfo } from 'countries-list';

// 193 UN member states, plus the Holy See and Palestine.
const codes = new Set(`AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW`.split(' '));
const names = { CI: 'Côte d’Ivoire', CD: 'DR Congo', CG: 'Republic of the Congo', CZ: 'Czechia', KR: 'South Korea', KP: 'North Korea', PS: 'Palestine', VA: 'Vatican City', SZ: 'Eswatini', TR: 'Türkiye', TL: 'Timor-Leste' };
const capitals = { PS: 'Ramallah', VA: 'Vatican City', ZA: 'Pretoria', BO: 'Sucre', NL: 'Amsterdam', MY: 'Kuala Lumpur', LK: 'Sri Jayawardenepura Kotte', CI: 'Yamoussoukro' };
const shapes = feature(world, world.objects.countries).features;
export const countries = shapes.map(shape => {
  const record = lookup.byIso(shape.id);
  const code = record?.iso2;
  if (!code || !codes.has(code) || shape.properties.name === 'Ashmore and Cartier Is.') return null;
  return { id: code, name: names[code] || countryInfo[code]?.name || record.country, capital: capitals[code] || countryInfo[code]?.capital || record.capital || '—', continent: record.continent, shape: code === 'BH' ? bahrainDetail : shape };
}).filter(Boolean);
// Tuvalu is absent from the source atlas at this resolution. Draw its island group at its location.
countries.push({ id: 'TV', name: 'Tuvalu', capital: 'Funafuti', continent: 'Oceania', shape: geoCircle().center([179.2, -8.5]).radius(.42)() });
countries.sort((a,b) => a.name.localeCompare(b.name));
export const countryById = Object.fromEntries(countries.map(c => [c.id,c]));
export function flagEmoji(code) { return [...code].map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join(''); }
