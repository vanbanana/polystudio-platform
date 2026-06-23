import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  OrbitControls,
  Center,
  Bounds,
  Environment,
  ContactShadows,
  useGLTF,
} from '@react-three/drei'
import { Object3D, Mesh } from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'
import { Boxes } from 'lucide-react'

type Props = {
  modelUrl: string
  format: 'obj' | 'glb'
  mtlUrl?: string
}

function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const cloned = useMemo(() => scene.clone(true), [scene])
  useEffect(() => {
    cloned.traverse((node) => {
      const mesh = node as Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
  }, [cloned])
  return <primitive object={cloned} />
}

function OBJModel({ url, mtlUrl }: { url: string; mtlUrl?: string }) {
  const [obj, setObj] = useState<Object3D | null>(null)
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
          /* 默认材质 */
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
  if (!obj) return null
  return <primitive object={obj} />
}

/** 内联缩略图：用真实生成的模型实时渲染一张 3D 预览（可拖拽旋转），替代 mock 占位图。 */
export default function ModelThumbnail({ modelUrl, format, mtlUrl }: Props) {
  return (
    <div className="at-model-thumb">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [2.6, 1.8, 3.2], fov: 45 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#1f2024']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 5]} intensity={2.2} castShadow />
        <directionalLight position={[-4, 2, -3]} intensity={0.5} />
        <Suspense fallback={null}>
          <Environment preset="studio" />
          <Bounds fit clip observe margin={1.2}>
            <Center>
              {format === 'obj' ? (
                <OBJModel url={modelUrl} mtlUrl={mtlUrl} />
              ) : (
                <GLBModel url={modelUrl} />
              )}
            </Center>
          </Bounds>
          <ContactShadows position={[0, -0.9, 0]} opacity={0.45} scale={9} blur={2.2} far={3} />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={1.1}
          dampingFactor={0.12}
        />
      </Canvas>
      <span className="at-model-thumb-badge">
        <Boxes size={12} /> 3D
      </span>
    </div>
  )
}
