// The package's own package.json "exports" map doesn't expose a "types"
// condition, so TypeScript can't resolve node_modules/@remotemerge/nepali-date-converter/index.d.ts
// automatically. This ambient declaration mirrors that file.
declare module '@remotemerge/nepali-date-converter' {
  export default class DateConverter {
    constructor(dateInput: string);
    toAd(): { year: number; month: number; date: number; day: string };
    toBs(): { year: number; month: number; date: number; day: string };
  }
}
