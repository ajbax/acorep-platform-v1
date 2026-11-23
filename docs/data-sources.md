# Data sources

## Province boundaries (national map)

- Dataset: geoBoundaries gbOpen, Democratic Republic of the Congo, ADM1 (26 provinces), simplified geometry, commit `9469f09`.
  https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/COD/ADM1/geoBoundaries-COD-ADM1_simplified.geojson
- Source: OpenStreetMap. Licence: **Open Data Commons Open Database License (ODbL) 1.0**. Attribution "© contributeurs OpenStreetMap" is required and is shown under the map (`t.dashboard.attribution`).
- Each feature's `shapeISO` matches our ISO 3166-2:CD province codes.

The app uses SVG paths generated from that file into `apps/web/src/features/map/drcShapes.ts` (equirectangular projection, simplified to about 0.025°). To regenerate:

```sh
curl -L -o /tmp/cod-adm1.geojson <URL above>
node scripts/geo2svg.mjs /tmp/cod-adm1.geojson apps/web/src/features/map/drcShapes.ts
npx -y pnpm@10.20.0 format
```

If ACOREP or the Ministry provides official boundaries (e.g. from the national geographic institute), replace the source here and regenerate.

## Provincial capitals and points of entry

Approximate coordinates (two decimals) in `packages/shared/src/geo.ts`, used only to place markers on the map.

## Demo data

`apps/web/src/services/mock/seed.ts` generates fictional establishments and declarations. Names, numbers and people are invented.
