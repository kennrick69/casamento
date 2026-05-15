'use client';

interface Props { posX: number; posZ: number; rotation: number; }

export function CakeTable({ posX, posZ, rotation }: Props) {
  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotation, 0]}>
      {/* Mesa circular pequena */}
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[1.0, 0.07, 1.0]} />
        <meshStandardMaterial color='#F5E6D0' />
      </mesh>
      {/* Pé */}
      <mesh position={[0, 0.37, 0]}>
        <boxGeometry args={[0.15, 0.74, 0.15]} />
        <meshStandardMaterial color='#E0D0B0' />
      </mesh>
      {/* Bolo (3 andares) */}
      <mesh position={[0, 0.86, 0]}>
        <boxGeometry args={[0.7, 0.2, 0.7]} />
        <meshStandardMaterial color='#FFF5E0' />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial color='#FFD6E0' />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[0.3, 0.18, 0.3]} />
        <meshStandardMaterial color='#FFECF5' />
      </mesh>
      {/* Topo do bolo */}
      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[0.08, 0.15, 0.08]} />
        <meshStandardMaterial color='#FFD700' />
      </mesh>
    </group>
  );
}
