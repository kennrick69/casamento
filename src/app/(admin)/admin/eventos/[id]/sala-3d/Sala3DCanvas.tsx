'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import type { Venue3D, Venue3DObject, Venue3DAvatar } from '@prisma/client';

interface Props {
  venue: Venue3D & { objects: Venue3DObject[]; avatars: Venue3DAvatar[] };
  eventId: string;
}

export default function Sala3DCanvas({ venue }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 10, 14], fov: 45 }}
      style={{ background: '#1a1a2e' }}
    >
      <ambientLight intensity={venue.ambientLight} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />

      {/* Piso */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[venue.floorWidthTiles, venue.floorDepthTiles]} />
        <meshStandardMaterial color={venue.floorColor} />
      </mesh>

      <Grid
        args={[venue.floorWidthTiles, venue.floorDepthTiles]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#888"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#aaa"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid={false}
      />

      <Text
        position={[0, 0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
        color="#555"
        anchorX="center"
        anchorY="middle"
      >
        Sala 3D em construção
      </Text>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={4}
        maxDistance={30}
      />
    </Canvas>
  );
}
