'use client';

interface Props { posX: number; posZ: number; rotation: number; }

export function Bar({ posX, posZ, rotation }: Props) {
  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotation, 0]}>
      {/* Bancada */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[3.0, 1.8, 0.8]} />
        <meshStandardMaterial color='#5C3317' />
      </mesh>
      {/* Tampa da bancada */}
      <mesh position={[0, 1.82, 0]}>
        <boxGeometry args={[3.2, 0.08, 1.0]} />
        <meshStandardMaterial color='#F5E6C8' />
      </mesh>
      {/* Prateleiras de fundo */}
      {[0.4, 0.9, 1.4].map((y, i) => (
        <mesh key={i} position={[0, y, -0.45]}>
          <boxGeometry args={[2.8, 0.06, 0.25]} />
          <meshStandardMaterial color='#8B4513' />
        </mesh>
      ))}
      {/* Bancos */}
      {[-1.0, 0, 1.0].map((x, i) => (
        <group key={i} position={[x, 0, 0.75]}>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[0.35, 0.06, 0.35]} />
            <meshStandardMaterial color='#8B6914' />
          </mesh>
          <mesh position={[0, 0.27, 0]}>
            <boxGeometry args={[0.08, 0.55, 0.08]} />
            <meshStandardMaterial color='#6B4F1A' />
          </mesh>
        </group>
      ))}
    </group>
  );
}
