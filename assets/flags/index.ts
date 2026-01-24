// Country flag SVG imports
import CA from "./CA.svg";
import GB from "./GB.svg";
import IE from "./IE.svg";
import AU from "./AU.svg";
import NZ from "./NZ.svg";
import DE from "./DE.svg";
import FR from "./FR.svg";
import IT from "./IT.svg";
import ES from "./ES.svg";
import NL from "./NL.svg";
import CH from "./CH.svg";
import AT from "./AT.svg";
import BE from "./BE.svg";
import DK from "./DK.svg";
import NO from "./NO.svg";
import SE from "./SE.svg";
import FI from "./FI.svg";
import US from "./US.svg";
// New flags for language support
import PT from "./PT.svg";
import BR from "./BR.svg";
import RU from "./RU.svg";
import JP from "./JP.svg";
import KR from "./KR.svg";
import CN from "./CN.svg";
import SA from "./SA.svg";
import IN from "./IN.svg";
import ID from "./ID.svg";
import TR from "./TR.svg";
import PL from "./PL.svg";
import VN from "./VN.svg";
import TH from "./TH.svg";

// Individual exports
export {
  CA,
  GB,
  IE,
  AU,
  NZ,
  DE,
  FR,
  IT,
  ES,
  NL,
  CH,
  AT,
  BE,
  DK,
  NO,
  SE,
  FI,
  US,
  PT,
  BR,
  RU,
  JP,
  KR,
  CN,
  SA,
  IN,
  ID,
  TR,
  PL,
  VN,
  TH,
};

// Map of country code to flag SVG
export const FLAGS: Record<string, string> = {
  CA,
  GB,
  IE,
  AU,
  NZ,
  DE,
  FR,
  IT,
  ES,
  NL,
  CH,
  AT,
  BE,
  DK,
  NO,
  SE,
  FI,
  US,
  PT,
  BR,
  RU,
  JP,
  KR,
  CN,
  SA,
  IN,
  ID,
  TR,
  PL,
  VN,
  TH,
  // Aliases
  UK: GB, // Common alias for United Kingdom
};

// Country info with flags
export const SUPPORTED_COUNTRIES = [
  { code: "US", name: "United States", flag: US },
  { code: "CA", name: "Canada", flag: CA },
  { code: "GB", name: "United Kingdom", flag: GB },
  { code: "IE", name: "Ireland", flag: IE },
  { code: "AU", name: "Australia", flag: AU },
  { code: "NZ", name: "New Zealand", flag: NZ },
  { code: "DE", name: "Germany", flag: DE },
  { code: "FR", name: "France", flag: FR },
  { code: "IT", name: "Italy", flag: IT },
  { code: "ES", name: "Spain", flag: ES },
  { code: "NL", name: "Netherlands", flag: NL },
  { code: "CH", name: "Switzerland", flag: CH },
  { code: "AT", name: "Austria", flag: AT },
  { code: "BE", name: "Belgium", flag: BE },
  { code: "DK", name: "Denmark", flag: DK },
  { code: "NO", name: "Norway", flag: NO },
  { code: "SE", name: "Sweden", flag: SE },
  { code: "FI", name: "Finland", flag: FI },
  { code: "PT", name: "Portugal", flag: PT },
  { code: "BR", name: "Brazil", flag: BR },
  { code: "RU", name: "Russia", flag: RU },
  { code: "JP", name: "Japan", flag: JP },
  { code: "KR", name: "South Korea", flag: KR },
  { code: "CN", name: "China", flag: CN },
  { code: "SA", name: "Saudi Arabia", flag: SA },
  { code: "IN", name: "India", flag: IN },
  { code: "ID", name: "Indonesia", flag: ID },
  { code: "TR", name: "Turkey", flag: TR },
  { code: "PL", name: "Poland", flag: PL },
  { code: "VN", name: "Vietnam", flag: VN },
  { code: "TH", name: "Thailand", flag: TH },
] as const;

// Helper to get flag by country code
export function getFlag(countryCode: string): string | undefined {
  return FLAGS[countryCode.toUpperCase()];
}
