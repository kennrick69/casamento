'use client';

interface Props { posX: number; posZ: number; rotation: number; }

export function Stage({ posX, posZ, rotation }: Props) {
  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotation, 0]}>
      {/* Palco principal */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[4, 0.5, 2]} />
        <meshStandardMaterial color='#8B6914' />
      </mesh>
      {/* Borda frontal */}
      <mesh position={[0, 0.5, 1.1]}>
        <boxGeometry args={[4, 0.05, 0.1]} />
        <meshStandardMaterial color='#FFD700' />
      </mesh>
      {/* Degrau */}
      <mesh position={[0, 0.1, 1.3]}>
        <boxGeometry args={[1.2, 0.2, 0.5]} />
        <meshStandardMaterial color='#7A5C10' />
      </mesh>
    </group>
  );
}
