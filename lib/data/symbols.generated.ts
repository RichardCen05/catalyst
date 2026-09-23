// GENERATED FILE — do not edit by hand.
// Written by scripts/build_market_data.py from the company-report recordings
// in data/sectors/. A symbol exists here because a recording exists for it.

export type SymbolCode =
  | "ADRO"
  | "AMRT"
  | "ANTM"
  | "BBCA"
  | "BBRI"
  | "BMRI"
  | "BUKA"
  | "EMTK"
  | "EXCL"
  | "GOTO"
  | "ICBP"
  | "INCO"
  | "JSMR"
  | "MYOR"
  | "PGAS"
  | "PTBA"
  | "TINS"
  | "TLKM";

/** The same universe at runtime. A schema cannot check a union, and a
 *  request naming a ticker that was never recorded must be rejected at the
 *  edge rather than answered about. */
export const SYMBOL_CODES: readonly SymbolCode[] = [
  "ADRO",
  "AMRT",
  "ANTM",
  "BBCA",
  "BBRI",
  "BMRI",
  "BUKA",
  "EMTK",
  "EXCL",
  "GOTO",
  "ICBP",
  "INCO",
  "JSMR",
  "MYOR",
  "PGAS",
  "PTBA",
  "TINS",
  "TLKM",
];
