'use client';

interface Props { posX: number; posZ: number; rotation: number; ceilingHeight?: number; }

export function Chandelier({ posX, posZ, rotation, ceilingHeight = 4 }: Props) {
  const body = ceilingHeight - 0.5;
  return (
    <group position={[posX, 0, posZ]} rotation={[0, rotation, 0]}>
      {/* Fio do teto */}
      <mesh position={[0, body + 0.25, 0]}>
        <boxGeometry args={[0.05, 0.5, 0.05]} />
        <meshStandardMaterial color='#888' />
      </mesh>
      {/* Corpo central */}
      <mesh position={[0, body, 0]}>
        <boxGeometry args={[0.2, 0.3, 0.2]} />
        <meshStandardMaterial color='#FFD700' emissive='#FFD700' emissiveIntensity={0.4} />
      </mesh>
      {/* Braços */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) => (
        <mesh key={i} position={[Math.sin(a) * 0.55, body, Math.cos(a) * 0.55]}>
          <boxGeometry args={[0.06, 0.06, 0.8]} />
          <meshStandardMaterial color='#D4AF37' />
        </mesh>
      ))}
      {/* Pendentes de cristal */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) => (
        <mesh key={`c${i}`} position={[Math.sin(a) * 0.55, body - 0.25, Math.cos(a) * 0.55]}>
          <boxGeometry args={[0.08, 0.3, 0.08]} />
          <meshStandardMaterial color='#ADD8E6' transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}
