'use client';

interface Props { posX: number; posZ: number; rotation: number; width?: number; depth?: number; }

export function DanceFloor({ posX, posZ, rotation, width = 6, depth = 5 }: Props) {
  // Tabuleiro de dança: quadrados alternados 2×2
  const tileW = 2;
  const tiles: { x: number; z: number; dark: boolean }[] = [];
  for (let ix = 0; ix < Math.ceil(width / tileW); ix++) {
    for (let iz = 0; iz < Math.ceil(depth / tileW); iz++) {
      tiles.push({
        x: -width / 2 + tileW * ix + tileW / 2,
        z: -depth / 2 + tileW * iz + tileW / 2,
        dark: (ix + iz) % 2 === 0,
      });
    }
  }
  return (
    <group position={[posX, 0.02, posZ]} rotation={[0, rotation, 0]}>
      {tiles.map((t, i) => (
        <mesh key={i} position={[t.x, 0, t.z]}>
          <boxGeometry args={[tileW, 0.05, tileW]} />
          <meshStandardMaterial color={t.dark ? '#2A2A4A' : '#E8E0D0'} />
        </mesh>
      ))}
    </group>
  );
}
