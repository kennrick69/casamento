'use client';

interface Props { posX: number; posZ: number; rotation: number; }

export function Buffet({ posX, posZ, rotation }: Props) {
  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotation, 0]}>
      {/* Balcão */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[4.0, 1.5, 1.0]} />
        <meshStandardMaterial color='#C0A060' />
      </mesh>
      {/* Superfície */}
      <mesh position={[0, 1.52, 0]}>
        <boxGeometry args={[4.1, 0.06, 1.1]} />
        <meshStandardMaterial color='#F0EAD6' />
      </mesh>
      {/* Cuba / travessas (decorativas) */}
      {[-1.4, -0.5, 0.5, 1.4].map((x, i) => (
        <mesh key={i} position={[x, 1.6, 0]}>
          <boxGeometry args={[0.7, 0.12, 0.8]} />
          <meshStandardMaterial color={i % 2 ? '#D4A96A' : '#C87941'} />
        </mesh>
      ))}
    </group>
  );
}
