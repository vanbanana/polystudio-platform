import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Center,
  Bounds,
  Environment,
  ContactShadows,
  useGLTF,
} from '@react-three/drei'
import {
  Object3D,
  Mesh,
  MeshStandardMaterial,
  Material,
  DoubleSide,
} from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { Box, Grid3x3, Sun, Lightbulb, RotateCcw } from 'lucide-react'
import './blender-viewport.css'

export type Shading = 'solid' | 'wireframe' | 'rendered'

export interface LightSettings {
  keyIntensity: number
  keyAzimuth: number // 度
  fillIntensity: number
  ambient: number
  color: string
}

const DEFAULT_LIGHTS: LightSettings = {
  keyIntensity: 2.2,
  keyAzimuth: 35,
  fillIntensity: 0.6,
  ambient: 0.35,
  color: '#ffffff',
}

function applyShading(
  root: Object3D,
  shading: Shading,
  clay: MeshStandardMaterial,
  wire: MeshStandardMaterial,
  originals: Map<Mesh, Material | Material[]>,
) {
  root.traverse((node) => {
    const mesh = node as Mesh
    if (!mesh.isMesh) return
    if (!originals.has(mesh)) originals.set(mesh, mesh.material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    if (shading === 'rendered') mesh.material = originals.get(mesh) as Material | Material[]
    else if (shading === 'solid') mesh.material = clay
    else mesh.material = wire
  })
}

function useShadedMaterials() {
  return useMemo(() => {
    const clay = new MeshStandardMaterial({
      color: 0xb9b9bb,
      roughness: 0.78,
      metalness: 0.0,
      side: DoubleSide,
    })
    const wire = new MeshStandardMaterial({
      color: 0x9aa6b2,
      wireframe: true,
    })
    return { clay, wire }
  }, [])
}

function GLBScene({ url, shading }: { url: string; shading: Shading }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  const { clay, wire } = useShadedMaterials()
  const originals = useRef(new Map<Mesh, Material | Material[]>())

  useEffect(() => {
    applyShading(cloned, shading, clay, wire, originals.current)
  }, [cloned, shading, clay, wire])

  return <primitive object={cloned} />
}

function OBJScene({
  url,
  mtlUrl,
  shading,
}: {
  url: string
  mtlUrl?: string
  shading: Shading
}) {
  const [obj, setObj] = useState<Object3D | null>(null)
  const { clay, wire } = useShadedMaterials()
  const originals = useRef(new Map<Mesh, Material | Material[]>())

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const loader = new OBJLoader()
      if (mtlUrl) {
        try {
          const mtlLoader = new MTLLoader()
          const mtlUrlObj = new URL(mtlUrl, window.location.origin)
          const basePath = mtlUrlObj.pathname.substring(0, mtlUrlObj.pathname.lastIndexOf('/') + 1)
          mtlLoader.setResourcePath(window.location.origin + basePath)
          const materials = await new Promise((resolve, reject) => {
            mtlLoader.load(mtlUrl, (m) => { m.preload(); resolve(m) }, undefined, reject)
          })
          loader.setMaterials(materials as never)
        } catch {
          /* 使用默认材质 */
        }
      }
      try {
        const object = await new Promise<Object3D>((resolve, reject) => {
          loader.load(url, resolve, undefined, reject)
        })
        if (!cancelled) setObj(object)
      } catch {
        /* ignore */
      }
    }
    load()
    return () => { cancelled = true }
  }, [url, mtlUrl])

  useEffect(() => {
    if (obj) applyShading(obj, shading, clay, wire, originals.current)
  }, [obj, shading, clay, wire])

  if (!obj) return null
  return <primitive object={obj} />
}

function Lights({ s }: { s: LightSettings }) {
  const rad = (s.keyAzimuth * Math.PI) / 180
  const keyPos: [number, number, number] = [Math.cos(rad) * 6, 7, Math.sin(rad) * 6]
  return (
    <>
      <ambientLight intensity={s.ambient} />
      <directionalLight
        position={keyPos}
        intensity={s.keyIntensity}
        color={s.color}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0005}
      >
        <orthographicCamera attach="shadow-camera" args={[-5, 5, 5, -5, 0.1, 30]} />
      </directionalLight>
      <directionalLight position={[-5, 3, -4]} intensity={s.fillIntensity} color={s.color} />
    </>
  )
}

type Props = {
  modelUrl: string
  format: 'obj' | 'glb'
  mtlUrl?: string
  textureUrl?: string
}

export default function BlenderViewport({ modelUrl, format, mtlUrl }: Props) {
  const [shading, setShading] = useState<Shading>('rendered')
  const [lights, setLights] = useState<LightSettings>(DEFAULT_LIGHTS)
  const [resetKey, setResetKey] = useState(0)

  const rendered = shading === 'rendered'

  return (
    <div className="bv-root">
      {/* 顶部工具栏：着色模式 */}
      <div className="bv-toolbar">
        <div className="bv-seg">
          <button className={`bv-seg-btn ${shading === 'solid' ? 'on' : ''}`} onClick={() => setShading('solid')} title="实体">
            <Box size={14} /> 实体
          </button>
          <button className={`bv-seg-btn ${shading === 'wireframe' ? 'on' : ''}`} onClick={() => setShading('wireframe')} title="线框">
            <Grid3x3 size={14} /> 线框
          </button>
          <button className={`bv-seg-btn ${shading === 'rendered' ? 'on' : ''}`} onClick={() => setShading('rendered')} title="渲染">
            <Sun size={14} /> 渲染
          </button>
        </div>
        <button className="bv-icon-btn" onClick={() => setResetKey((k) => k + 1)} title="重置视角">
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="bv-stage">
        <Canvas
          key={resetKey}
          shadows
          dpr={[1, 2]}
          camera={{ position: [3.5, 2.6, 4.2], fov: 45 }}
          gl={{ antialias: true }}
        >
          <color attach="background" args={[rendered ? '#1f2024' : '#303236']} />

          <Lights s={lights} />

          <Suspense fallback={null}>
            {rendered && <Environment preset="studio" />}
            <Bounds fit clip observe margin={1.25}>
              <Center>
                {format === 'obj' ? (
                  <OBJScene url={modelUrl} mtlUrl={mtlUrl} shading={shading} />
                ) : (
                  <GLBScene url={modelUrl} shading={shading} />
                )}
              </Center>
            </Bounds>
          </Suspense>

          {rendered && (
            <ContactShadows position={[0, -1.0, 0]} opacity={0.5} scale={12} blur={2.2} far={4} />
          )}

          <Grid
            position={[0, -1.0, 0]}
            args={[30, 30]}
            cellSize={0.5}
            cellThickness={0.6}
            cellColor={rendered ? '#3a3c40' : '#46484c'}
            sectionSize={2.5}
            sectionThickness={1}
            sectionColor={rendered ? '#55585d' : '#6a6d72'}
            fadeDistance={26}
            fadeStrength={1}
            infiniteGrid
          />

          <OrbitControls makeDefault enablePan enableZoom enableRotate dampingFactor={0.12} />

          <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
            <GizmoViewport axisColors={['#e0584f', '#7bc043', '#4b8ef0']} labelColor="#fff" />
          </GizmoHelper>
        </Canvas>

        {/* 打灯/渲染控制面板 */}
        <div className="bv-lightpanel">
          <div className="bv-lp-title">
            <Lightbulb size={13} /> 灯光 / 渲染
          </div>
          <label className="bv-lp-row">
            <span>主光强度</span>
            <input type="range" min={0} max={5} step={0.1} value={lights.keyIntensity}
              onChange={(e) => setLights((p) => ({ ...p, keyIntensity: +e.target.value }))} />
            <em>{lights.keyIntensity.toFixed(1)}</em>
          </label>
          <label className="bv-lp-row">
            <span>主光方位</span>
            <input type="range" min={0} max={360} step={1} value={lights.keyAzimuth}
              onChange={(e) => setLights((p) => ({ ...p, keyAzimuth: +e.target.value }))} />
            <em>{lights.keyAzimuth}°</em>
          </label>
          <label className="bv-lp-row">
            <span>补光强度</span>
            <input type="range" min={0} max={3} step={0.1} value={lights.fillIntensity}
              onChange={(e) => setLights((p) => ({ ...p, fillIntensity: +e.target.value }))} />
            <em>{lights.fillIntensity.toFixed(1)}</em>
          </label>
          <label className="bv-lp-row">
            <span>环境光</span>
            <input type="range" min={0} max={2} step={0.05} value={lights.ambient}
              onChange={(e) => setLights((p) => ({ ...p, ambient: +e.target.value }))} />
            <em>{lights.ambient.toFixed(2)}</em>
          </label>
          <label className="bv-lp-row color">
            <span>灯光颜色</span>
            <input type="color" value={lights.color}
              onChange={(e) => setLights((p) => ({ ...p, color: e.target.value }))} />
          </label>
        </div>
      </div>
    </div>
  )
}
