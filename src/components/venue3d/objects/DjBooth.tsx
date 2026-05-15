'use client';

interface Props { posX: number; posZ: number; rotation: number; }

export function DjBooth({ posX, posZ, rotation }: Props) {
  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotation, 0]}>
      {/* Mesa do DJ */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[2.0, 1.1, 0.7]} />
        <meshStandardMaterial color='#1A1A2E' />
      </mesh>
      {/* Detalhe: painel de luzes */}
      <mesh position={[0, 0.55, -0.36]}>
        <boxGeometry args={[1.8, 0.8, 0.02]} />
        <meshStandardMaterial color='#3D1A8C' emissive='#6B3FD8' emissiveIntensity={0.3} />
      </mesh>
      {/* Caixas de som */}
      {[-1.2, 1.2].map((x, i) => (
        <mesh key={i} position={[x, 0.5, -0.1]}>
          <boxGeometry args={[0.5, 1.0, 0.6]} />
          <meshStandardMaterial color='#111' />
        </mesh>
      ))}
    </group>
  );
}
