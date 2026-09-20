/**
 * The shape of `POST /v1/human-design`, narrowed to what this app draws.
 *
 * Written by hand from a real response rather than from the docs, and
 * deliberately partial: the answer carries more than a reader needs, and a
 * type that claims every field is a type that lies the first time one of them
 * is optional. The full schema is in https://api.astroway.info/v1/openapi.json,
 * and the typed SDKs generate from it if you would rather not maintain this.
 */

export interface Activation {
  planet: string;
  planetId: number;
  gate: number;
  line: number;
  color: number;
  tone: number;
  base: number;
  longitude: number;
  /** true on the conscious (black) side, false on the design (red) side. */
  isPersonality: boolean;
}

export interface Center {
  name: string;
  defined: boolean;
  open: boolean;
  /** Every gate that belongs to this centre. */
  gates: number[];
  /** The subset this chart actually activates. */
  activeGates: number[];
}

export interface Channel {
  gate1: number;
  gate2: number;
  centerA: string;
  centerB: string;
  /** "personality", "design", or both when the channel is hung from each side. */
  activatedBy: string[];
}

export interface Cross {
  name: string;
  type: string;
  gates: number[];
}

export interface Profile {
  profile: string;
  personalityLine: number;
  designLine: number;
  geometry: string;
}

export interface Reading {
  type: string;
  strategy: string;
  notSelfTheme: string;
  authority: string;
  definition: string;
  profile: Profile;
  cross: Cross;
  centers: Center[];
  channels: Channel[];
  personalityActivations: Activation[];
  designActivations: Activation[];
}

export interface BirthInput {
  date: string;
  time: string;
  timezone: string;
  latitude: string;
  longitude: string;
}
