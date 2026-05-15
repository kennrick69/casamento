'use client';

interface Props { posX: number; posZ: number; rotation: number; }

export function Plant({ posX, posZ, rotation }: Props) {
  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotation, 0]}>
      {/* Vaso */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color='#8B4513' />
      </mesh>
      {/* Tronco */}
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[0.1, 0.5, 0.1]} />
        <meshStandardMaterial color='#5C3317' />
      </mesh>
      {/* Folhagem (3 blocos) */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[0.7, 0.5, 0.7]} />
        <meshStandardMaterial color='#228B22' />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshStandardMaterial color='#2E9E2E' />
      </mesh>
      <mesh position={[0, 1.65, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color='#3AB83A' />
      </mesh>
    </group>
  );
}
