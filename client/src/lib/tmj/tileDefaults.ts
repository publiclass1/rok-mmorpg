import { GID_GRASS_A, type TmjTileLayer } from './types'

export function defaultTileValueForLayer(layerName: string): number {
  if (layerName === 'ground') return GID_GRASS_A
  return 0
}

export function fillTileLayerData(
  width: number,
  height: number,
  layerName: string,
  fillValue?: number,
): number[] {
  const v = fillValue ?? defaultTileValueForLayer(layerName)
  return Array.from({ length: width * height }, () => v)
}

export function resizeTileLayerData(
  layer: TmjTileLayer,
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
): number[] {
  const data = fillTileLayerData(newWidth, newHeight, layer.name)
  const copyW = Math.min(oldWidth, newWidth)
  const copyH = Math.min(oldHeight, newHeight)
  for (let ty = 0; ty < copyH; ty++) {
    for (let tx = 0; tx < copyW; tx++) {
      data[ty * newWidth + tx] = layer.data[ty * oldWidth + tx]
    }
  }
  return data
}
