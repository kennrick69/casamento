'use client';

import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import type { Venue3D, Venue3DObject } from '@prisma/client';
import { Venue3DObjectRenderer } from '@/components/venue3d/Venue3DObjectRenderer';

interface Props {
  venue: Venue3D & { objects: Venue3DObject[] };
}

export default function PublicSala3DCanvas({ venue }: Props) {
  const { floorWidthTiles: fw, floorDepthTiles: fd } = venue;
  // Câmera isométrica fixa: elevação 45°, ângulo azimutal 45°
  const dist = Math.max(fw, fd) * 1.1;
  const camPos: [number, number, number] = [dist * 0.7, dist * 0.75, dist * 0.7];

  return (
    <Canvas
      camera={{ position: camPos, fov: 40 }}
      style={{ background: '#1a1a2e' }}
    >
      <ambientLight intensity={venue.ambientLight} />
      <directionalLight position={[fw / 2, 12, fd / 2]} intensity={0.9} />
      <directionalLight position={[-fw / 2, 8, -fd / 2]} intensity={0.4} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[fw, fd]} />
        <meshStandardMaterial color={venue.floorColor} />
      </mesh>

      <Grid
        position={[0, 0, 0]}
        args={[fw, fd]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#999"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#bbb"
        fadeDistance={80}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {venue.objects.map((obj) => (
        <Venue3DObjectRenderer
          key={obj.id}
          kind={obj.kind}
          posX={obj.posX}
          posZ={obj.posZ}
          rotation={obj.rotation}
          seats={obj.seats}
          label={obj.label}
        />
      ))}
    </Canvas>
  );
}
