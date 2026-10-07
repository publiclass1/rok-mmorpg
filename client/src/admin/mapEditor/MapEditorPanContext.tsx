import { createContext, useContext } from 'react'

export type MapEditorPanState = {
  spaceDown: boolean
  panning: boolean
}

export const MapEditorPanContext = createContext<MapEditorPanState>({
  spaceDown: false,
  panning: false,
})

export function useMapEditorPan() {
  return useContext(MapEditorPanContext)
}
