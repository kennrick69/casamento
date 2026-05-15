'use client';

interface Props { posX: number; posZ: number; rotation: number; width?: number; depth?: number; color?: string; }

export function Rug({ posX, posZ, rotation, width = 4, depth = 3, color = '#8B2252' }: Props) {
  return (
    <group position={[posX, 0.01, posZ]} rotation={[0, rotation, 0]}>
      <mesh>
        <boxGeometry args={[width, 0.03, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Borda decorativa */}
      <mesh>
        <boxGeometry args={[width - 0.2, 0.035, depth - 0.2]} />
        <meshStandardMaterial color='#F5D98B' transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
